/** @fileoverview Offline provider-to-image rendering and failure isolation through public APIs. */
import { readFile } from "node:fs/promises";
import { decode } from "fast-png";
import {
  compose,
  createProviderRegistry,
  createRegistry,
  createStaticTextProvider,
  defineProvider,
  imageBlock,
  imageFromBuffer,
  imageFromUrl,
  kpiBlock,
  loadFontFromBuffer,
  render,
} from "pressedslip";
import { describe, expect, it, vi } from "vitest";

const url =
  "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png";
const png = new Uint8Array(await readFile("docs/assets/visual-refs/block-image-tux.png"));
const fonts = [
  await loadFontFromBuffer(
    "JetBrainsMono",
    new Uint8Array(await readFile("tests/fixtures/fonts/jetbrains-mono-regular.ttf")),
  ),
];
const blocks = createRegistry([
  { ...imageBlock, dependencies: ["logo"] },
  { ...kpiBlock, dependencies: ["stat"] },
]);
function providers(fetch: typeof globalThis.fetch, timeoutMs = 100) {
  return createProviderRegistry({
    logo: defineProvider({
      key: "logo",
      scope: "shared",
      freshness: "never",
      timeoutMs: 1000,
      async fetch() {
        return {
          ok: "data",
          value: imageBlock.schema.parse({
            layout: "column",
            images: [{ src: await imageFromUrl(url, { fetch, timeoutMs }) }],
          }),
        };
      },
    }),
    stat: createStaticTextProvider({
      key: "stat",
      value: { value: "42", label: "Surviving sibling" },
    }),
  });
}
function blackPixels(bytes: Uint8Array) {
  return Array.from(decode(bytes).data).filter((value) => value === 0).length;
}

describe("URL image provider", () => {
  it("composes local data with schema defaults and renders image pixels without more network", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(png));
    const registry = providers(fetch);
    const composition = await compose({ providers: registry, blocks, date: "2026-10-02" });
    expect(composition.status).toBe("ready");
    expect(composition.failedBlocks).toEqual([]);
    expect(composition.slots[0]?.data).toEqual({
      layout: "column",
      fit: "reduce",
      dither: "floyd-steinberg",
      images: [{ src: imageFromBuffer(png, "image/png") }],
    });
    const globalFetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected render network"));
    try {
      const output = await render(composition, { registry: blocks, fonts });
      expect(output.failedBlocks).toEqual([]);
      const siblingOnly = await render(
        { ...composition, slots: composition.slots.filter((slot) => slot.blockType !== "image") },
        { registry: blocks, fonts },
      );
      expect(blackPixels(output.bytes)).toBeGreaterThan(blackPixels(siblingOnly.bytes) + 1000);
      expect(fetch).toHaveBeenCalledOnce();
      expect(globalFetch).not.toHaveBeenCalled();
    } finally {
      globalFetch.mockRestore();
    }
    await compose({ providers: registry, blocks, date: "2026-10-02" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    "404",
    "timeout",
    "unsupported",
    "invalid-svg",
  ])("records %s provider diagnostics and renders the sibling", async (failure) => {
    let signal: AbortSignal | undefined;
    const fetch: typeof globalThis.fetch = async (_, init) => {
      signal = init?.signal ?? undefined;
      if (failure === "timeout") return new Response(new ReadableStream());
      return new Response(
        failure === "invalid-svg"
          ? Uint8Array.from([...new TextEncoder().encode("<svg>"), 255])
          : failure === "unsupported"
            ? "GIF89a"
            : "not found",
        {
          status: failure === "404" ? 404 : 200,
        },
      );
    };
    const composition = await compose({
      providers: providers(fetch, 10),
      blocks,
      date: "2026-10-02",
    });
    expect(composition.status).toBe("partial");
    expect(composition.providerOutcomes.logo).toMatchObject({
      ok: "error",
      reason: {
        message: expect.stringMatching(
          failure === "404"
            ? /HTTP 404/
            : failure === "timeout"
              ? /timed out/
              : failure === "invalid-svg"
                ? /encoded data|encoding/
                : /Convert other formats to PNG/,
        ),
      },
    });
    expect(composition.failedBlocks).toMatchObject([
      { blockType: "image", failedProvider: "logo" },
    ]);
    expect(composition.slots.map((slot) => slot.blockType)).toEqual(["kpi"]);
    const output = await render(composition, { registry: blocks, fonts });
    expect(output.failedBlocks).toEqual([]);
    expect(blackPixels(output.bytes)).toBeGreaterThan(100);
    if (failure === "timeout") expect(signal?.aborted).toBe(true);
  });
  it("rejects raw URL inputs at render without fetching and preserves strict error policy", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network"));
    const composition = {
      id: "raw-url",
      version: 1,
      status: "ready" as const,
      date: "2026-10-02",
      slots: [
        { index: 0, blockType: "image", data: { layout: "column", images: [{ src: url }] } },
        { index: 1, blockType: "kpi", data: { value: "42" } },
      ],
    };
    try {
      const output = await render(composition, { registry: blocks, fonts });
      expect(output.failedBlocks).toMatchObject([
        { blockType: "image", reason: { message: expect.stringContaining("data URI") } },
      ]);
      expect(blackPixels(output.bytes)).toBeGreaterThan(100);
      await expect(
        render(composition, { registry: blocks, fonts, onBlockError: "throw" }),
      ).rejects.toThrow(/data URI/);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
