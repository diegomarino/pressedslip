/** @fileoverview Offline public URL loading, validation, streaming, and cache contract. */
import { readFile } from "node:fs/promises";
import type { ImageFromUrlOptions } from "pressedslip";
import { imageBlock, imageFromBuffer, imageFromUrl, memoryFontCache } from "pressedslip";
import { getGlobalDispatcher, MockAgent, setGlobalDispatcher, fetch as undiciFetch } from "undici";
import { afterEach, describe, expect, it, vi } from "vitest";

const url =
  "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png";
const png = new Uint8Array(await readFile("docs/assets/visual-refs/block-image-tux.png"));
const svg = new TextEncoder().encode(
  '<?xml version="1.0"?><svg width="8" height="8"><rect width="8" height="8"/></svg>',
);
const unsupported =
  "Pass a PNG or SVG data URI (maximum 2 MiB); see imageFromBuffer. Convert other formats to PNG.";
const response = (bytes = svg, init?: ResponseInit) => new Response(bytes, init);
const fetchBytes = (bytes = svg, init?: ResponseInit) =>
  vi.fn<typeof fetch>(async () => response(bytes, init));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("imageFromUrl", () => {
  it.each([
    [png, "image/png"],
    [svg, "image/svg+xml"],
  ] as const)("sniffs bytes independently of MIME and suffix (%s)", async (bytes, mime) => {
    expect(
      await imageFromUrl("https://images.example/no-extension", {
        fetch: fetchBytes(bytes, { headers: { "Content-Type": "image/jpeg" } }),
      }),
    ).toBe(imageFromBuffer(bytes, mime));
  });
  it("loads existing Tux bytes through default global fetch with MockAgent", async () => {
    const previous = getGlobalDispatcher();
    const agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = undiciFetch as unknown as typeof fetch;
    try {
      agent
        .get("https://raw.githubusercontent.com")
        .intercept({ path: new URL(url).pathname })
        .reply(200, png);
      expect(await imageFromUrl(url)).toBe(imageFromBuffer(png, "image/png"));
      agent.assertNoPendingInterceptors();
    } finally {
      globalThis.fetch = originalFetch;
      setGlobalDispatcher(previous);
      await agent.close();
    }
  });
  it.each([
    "data:image/png;base64,AAAA",
    "file:///tmp/logo.png",
    "/relative",
    "ftp://images.example/a",
  ])("rejects %s before cache or fetch", async (input) => {
    const fetch = fetchBytes();
    const cache = { get: vi.fn(async () => undefined), set: vi.fn(async () => undefined) };
    await expect(imageFromUrl(input, { fetch, cache })).rejects.toThrow(TypeError);
    expect(fetch).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
  it.each([
    0,
    -1,
    NaN,
    Infinity,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid limits %s before side effects", async (value) => {
    const fetch = fetchBytes();
    const cache = { get: vi.fn(async () => undefined), set: vi.fn(async () => undefined) };
    for (const options of [{ maxBytes: value }, { timeoutMs: value }])
      await expect(imageFromUrl(url, { ...options, fetch, cache })).rejects.toThrow(TypeError);
    expect(fetch).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });
  it("rejects overflowing native timeout", async () => {
    const fetch = fetchBytes();
    await expect(imageFromUrl(url, { fetch, timeoutMs: 2147483648 })).rejects.toThrow(TypeError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    Uint8Array.of(255, 216, 255),
    new TextEncoder().encode("GIF89a"),
    new TextEncoder().encode("RIFF0000WEBP"),
    new TextEncoder().encode("<html><body/></html>"),
    new TextEncoder().encode("<html><svg/></html>"),
    Uint8Array.of(255),
    new TextEncoder().encode("plain text"),
    new TextEncoder().encode("<?unterminated"),
    new TextEncoder().encode("<!--unterminated"),
  ])("rejects unsupported bytes with the schema message", async (bytes) => {
    await expect(imageFromUrl(url, { fetch: fetchBytes(bytes) })).rejects.toThrow(unsupported);
    const result = imageBlock.schema.safeParse({ layout: "column", images: [{ src: url }] });
    if (result.success) throw new Error("URL unexpectedly accepted by schema");
    expect(result.error.issues[0]?.message).toBe(unsupported);
  });
  it.each([
    "<svg><path",
    "<svg><script/></svg>",
    "<svg><text>A</text></svg>",
    '<svg><image href="https://example.com/x"/></svg>',
  ])("preserves supported-format validation errors: %s", async (xml) => {
    const bytes = new TextEncoder().encode(xml);
    let message = "";
    try {
      imageFromBuffer(bytes, "image/svg+xml");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toBe("");
    await expect(imageFromUrl(url, { fetch: fetchBytes(bytes) })).rejects.toThrow(message);
  });
  it("retains malformed SVG UTF-8 diagnostics as an operational error with its cause", async () => {
    const bytes = Uint8Array.from([...new TextEncoder().encode("<svg>"), 255]);
    try {
      await imageFromUrl(url, { fetch: fetchBytes(bytes) });
      throw new Error("Expected invalid SVG to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(TypeError);
      expect((error as Error).cause).toBeInstanceOf(TypeError);
    }
  });
  it.each(["<?x?>", "<!--x-->"])("rejects repeated XML prefixes promptly: %s", async (prefix) => {
    const bytes = new TextEncoder().encode(prefix.repeat(32));
    const start = performance.now();
    await expect(imageFromUrl(url, { fetch: fetchBytes(bytes) })).rejects.toThrow(unsupported);
    expect(performance.now() - start).toBeLessThan(1000);
  });
  it.each([
    '<?xml version="1.0"?>',
    " \n<!-- leading comment -->",
  ])("preserves SVG diagnostics after a prefix: %s", async (prefix) => {
    const bytes = new TextEncoder().encode(`${prefix} \n<svg><text>unsupported</text></svg>`);
    await expect(imageFromUrl(url, { fetch: fetchBytes(bytes) })).rejects.toThrow(
      "SVG text is unsupported",
    );
  });
  it("preserves truncated PNG diagnostics", async () => {
    await expect(imageFromUrl(url, { fetch: fetchBytes(png.subarray(0, 8)) })).rejects.toThrow(
      "Invalid or truncated PNG header",
    );
  });
  it.each([new Uint8Array(), null])("rejects empty/null body", async (bytes) => {
    await expect(
      imageFromUrl(url, { fetch: vi.fn(async () => new Response(bytes)) }),
    ).rejects.toThrow(/1 byte|empty|body/i);
  });
  it("propagates network errors and rejects HTTP failures", async () => {
    const error = new Error("offline");
    await expect(
      imageFromUrl(url, {
        fetch: vi.fn(async () => {
          throw error;
        }),
      }),
    ).rejects.toBe(error);
    await expect(imageFromUrl(url, { fetch: fetchBytes(svg, { status: 404 }) })).rejects.toThrow(
      /HTTP 404/,
    );
  });
  it.each([
    "request",
    "body",
  ])("normalizes operational %s TypeErrors with their cause", async (phase) => {
    const cause = new TypeError("fetch failed");
    const fetch: typeof globalThis.fetch = async () => {
      if (phase === "request") throw cause;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.error(cause);
          },
        }),
      );
    };
    const error = await imageFromUrl(url, { fetch }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error).toMatchObject({ message: "fetch failed", cause });
  });
  it.each([
    "http",
    "size",
    "timeout",
  ])("reports %s failure even if cancellation never settles", async (phase) => {
    vi.useFakeTimers();
    const cancel = vi.fn(
      () =>
        new Promise<void>(() => {
          /* Simulate stalled cleanup. */
        }),
    );
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (phase === "size") controller.enqueue(new Uint8Array(11));
      },
      cancel,
    });
    const result = imageFromUrl(url, {
      timeoutMs: 10,
      maxBytes: 10,
      fetch: async () => new Response(stream, { status: phase === "http" ? 404 : 200 }),
    }).catch((error: unknown) => error);
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const settled = Promise.race([
      result,
      new Promise((resolve) => {
        watchdog = setTimeout(() => resolve("still pending"), 100);
      }),
    ]);
    await vi.advanceTimersByTimeAsync(100);
    const error = await settled;
    clearTimeout(watchdog);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: expect.stringMatching(
        phase === "http" ? /HTTP 404/ : phase === "size" ? /byte limit/ : /timed out/,
      ),
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("accepts an exact limit and never lets an option bypass 2 MiB", async () => {
    expect(await imageFromUrl(url, { fetch: fetchBytes(svg), maxBytes: svg.length })).toBe(
      imageFromBuffer(svg, "image/svg+xml"),
    );
    await expect(
      imageFromUrl(url, { fetch: fetchBytes(new Uint8Array(2097153)), maxBytes: 3000000 }),
    ).rejects.toThrow(/2097152|2 MiB/);
  });
  it.each([
    undefined,
    "1",
    "invalid",
    "-1",
    "1.5",
  ])("counts actual bytes with Content-Length %s and cancels excess", async (length) => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(svg);
        c.enqueue(Uint8Array.of(32));
      },
      cancel,
    });
    const headers = new Headers();
    if (length !== undefined) headers.set("Content-Length", length);
    await expect(
      imageFromUrl(url, {
        maxBytes: svg.length,
        fetch: vi.fn(async () => new Response(stream, { headers })),
      }),
    ).rejects.toThrow(/limit|maximum/i);
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });
  it("rejects oversized declared body without reading and cancels it", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    await expect(
      imageFromUrl(url, {
        maxBytes: 10,
        fetch: vi.fn(async () => new Response(stream, { headers: { "Content-Length": "11" } })),
      }),
    ).rejects.toThrow(/limit|maximum/i);
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });
  it.each(["headers", "body"])("aborts stalled %s and clears the timer", async (phase) => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(svg.subarray(0, 5));
      },
      cancel,
    });
    const fetch: typeof globalThis.fetch = async (_, init) => {
      signal = init?.signal ?? undefined;
      if (phase === "headers")
        return new Promise((_, reject) =>
          signal?.addEventListener("abort", () => reject(signal?.reason), { once: true }),
        );
      return new Response(stream);
    };
    const result = imageFromUrl(url, { fetch, timeoutMs: 20 });
    const rejection = expect(result).rejects.toThrow(/timeout|timed out/i);
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    if (phase === "body") {
      expect(cancel).toHaveBeenCalledOnce();
      expect(stream.locked).toBe(false);
    }
  });
  it("joins multiple chunks and releases a successful reader", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(svg.subarray(0, 10));
        c.enqueue(svg.subarray(10));
        c.close();
      },
      cancel,
    });
    expect(await imageFromUrl(url, { fetch: async () => new Response(stream) })).toBe(
      imageFromBuffer(svg, "image/svg+xml"),
    );
    expect(stream.locked).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  });
  it("releases errored readers and clears timers without masking the original error", async () => {
    vi.useFakeTimers();
    const error = new Error("body disconnected");
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        c.error(error);
      },
    });
    await expect(imageFromUrl(url, { fetch: async () => new Response(stream) })).rejects.toBe(
      error,
    );
    expect(stream.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const failedCancel = new ReadableStream<Uint8Array>({
      cancel() {
        throw new Error("cleanup failed");
      },
    });
    await expect(
      imageFromUrl(url, { fetch: async () => new Response(failedCancel, { status: 404 }) }),
    ).rejects.toThrow(/HTTP 404/);
    expect(failedCancel.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("accepts exactly 2 MiB and does not cache by default", async () => {
    const bytes = new Uint8Array(2097152);
    bytes.set(png);
    const fetch = fetchBytes(bytes);
    expect(await imageFromUrl(url, { fetch })).toBe(imageFromBuffer(bytes, "image/png"));
    await imageFromUrl(url, { fetch });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("uses 5000ms by default and cleans success/failure timers", async () => {
    vi.useFakeTimers();
    const set = vi.spyOn(globalThis, "setTimeout");
    await imageFromUrl(url, { fetch: fetchBytes() });
    expect(set).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(vi.getTimerCount()).toBe(0);
    await expect(imageFromUrl(url, { fetch: fetchBytes(svg, { status: 404 }) })).rejects.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("caches validated raw bytes under a normalized fragment-free namespaced key", async () => {
    const cache = memoryFontCache();
    const fetch = fetchBytes(png);
    await imageFromUrl(`${url}#first`, { cache, fetch });
    await imageFromUrl(`${url}#second`, { cache, fetch });
    expect(fetch).toHaveBeenCalledOnce();
    expect(await cache.get(`pressedslip:image:v1:${url}`)).toEqual(png);
    const options: ImageFromUrlOptions = { cache, fetch, maxBytes: png.length - 1 };
    await expect(imageFromUrl(url, options)).rejects.toThrow(/limit|maximum/i);
    expect(fetch).toHaveBeenCalledOnce();
    const canonical = memoryFontCache();
    await imageFromUrl("HTTPS://IMAGES.EXAMPLE:443/a#x", { cache: canonical, fetch: fetchBytes() });
    expect(await canonical.get("pressedslip:image:v1:https://images.example/a")).toEqual(svg);
  });
  it("does not trust invalid cached bytes or cache failed loads", async () => {
    const cache = memoryFontCache();
    const fetch = fetchBytes();
    await cache.set(
      `pressedslip:image:v1:${url}`,
      new TextEncoder().encode("<svg><script/></svg>"),
    );
    await expect(imageFromUrl(url, { cache, fetch })).rejects.toThrow(/SVG/);
    expect(fetch).not.toHaveBeenCalled();
    const set = vi.fn(async () => undefined);
    const emptyCache = { get: async () => undefined, set };
    for (const fetch of [fetchBytes(svg, { status: 404 }), fetchBytes(Uint8Array.of(1))])
      await expect(imageFromUrl(url, { cache: emptyCache, fetch })).rejects.toThrow();
    expect(set).not.toHaveBeenCalled();
  });
  it.each(["get", "set"])("propagates cache %s failures", async (phase) => {
    const error = new Error("cache unavailable");
    const cache = {
      async get() {
        if (phase === "get") throw error;
        return undefined;
      },
      async set() {
        throw error;
      },
    };
    await expect(imageFromUrl(url, { cache, fetch: fetchBytes() })).rejects.toBe(error);
  });
});
