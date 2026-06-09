import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpTransport } from "../../../src/transports/http.js";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe("createHttpTransport", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("ok", { status: 200 }));
    // Silence the once-per-process SSRF warning during tests.
    process.env.PH_DISABLE_SSRF_WARNING = "1";
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.PH_DISABLE_SSRF_WARNING;
  });

  it("POSTs bytes with default Content-Type image/png", async () => {
    const t = createHttpTransport({ url: "https://example.com/print" });
    await t.send({ bytes: png });
    expect(fetchSpy).toHaveBeenCalledOnce();
    // biome-ignore lint/style/noNonNullAssertion: call was made in previous line
    const [, init] = fetchSpy.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).headers as Record<string, string>)["Content-Type"]).toBe(
      "image/png",
    );
  });

  it("uses payload.mimeType for Content-Type when provided", async () => {
    const t = createHttpTransport({ url: "https://example.com/print" });
    await t.send({ bytes: png, mimeType: "image/svg+xml" });
    // biome-ignore lint/style/noNonNullAssertion: call was made in previous line
    const [, init] = fetchSpy.mock.calls[0]!;
    expect(((init as RequestInit).headers as Record<string, string>)["Content-Type"]).toBe(
      "image/svg+xml",
    );
  });

  it("explicit caller headers override mimeType-derived Content-Type", async () => {
    const t = createHttpTransport({
      url: "https://example.com/print",
      headers: { "Content-Type": "application/octet-stream" },
    });
    await t.send({ bytes: png });
    // biome-ignore lint/style/noNonNullAssertion: call was made in previous line
    const [, init] = fetchSpy.mock.calls[0]!;
    expect(((init as RequestInit).headers as Record<string, string>)["Content-Type"]).toBe(
      "application/octet-stream",
    );
  });

  it("throws HTTP_INVALID_SCHEME for file://", async () => {
    const t = createHttpTransport({ url: "file:///etc/passwd" });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "HTTP_INVALID_SCHEME" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws HTTP_INVALID_SCHEME for data:", async () => {
    const t = createHttpTransport({ url: "data:text/plain,hello" });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "HTTP_INVALID_SCHEME" });
  });

  it("allowedHosts: full-origin match passes", async () => {
    const t = createHttpTransport({
      url: "https://api.example.com/print",
      allowedHosts: ["https://api.example.com:443"],
    });
    await t.send({ bytes: png });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("allowedHosts: mismatch throws URL_NOT_ALLOWED", async () => {
    const t = createHttpTransport({
      url: "https://evil.example.com/print",
      allowedHosts: ["https://api.example.com:443"],
    });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allowedHosts: userinfo bypass is blocked (userinfo stripped before match)", async () => {
    const t = createHttpTransport({
      url: "https://api.example.com@evil.com/print",
      allowedHosts: ["https://api.example.com:443"],
    });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "URL_NOT_ALLOWED" });
  });

  it("allowedHosts: IPv6 URL matches IPv6 allowlist entry", async () => {
    const t = createHttpTransport({
      url: "http://[::1]:8080/print",
      allowedHosts: ["http://[::1]:8080"],
    });
    await t.send({ bytes: png });
    expect(fetchSpy).toHaveBeenCalledOnce();
    // biome-ignore lint/style/noNonNullAssertion: just checked call was made
    const [calledUrl] = fetchSpy.mock.calls[0]!;
    expect(String(calledUrl)).toMatch(/\[::1\]/);
  });

  it("4xx response throws HTTP_4XX", async () => {
    fetchSpy.mockImplementationOnce(async () => new Response("nope", { status: 404 }));
    const t = createHttpTransport({ url: "https://example.com/print" });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "HTTP_4XX" });
  });

  it("5xx response throws HTTP_5XX", async () => {
    fetchSpy.mockImplementationOnce(async () => new Response("nope", { status: 503 }));
    const t = createHttpTransport({ url: "https://example.com/print" });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "HTTP_5XX" });
  });

  it("network failure throws FETCH_FAILED", async () => {
    fetchSpy.mockImplementationOnce(async () => {
      throw new Error("network down");
    });
    const t = createHttpTransport({ url: "https://example.com/print" });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("emits a once-per-process console.warn when allowedHosts omitted", async () => {
    delete process.env.PH_DISABLE_SSRF_WARNING;
    // Reset the module's internal warned-flag by re-importing in isolation.
    vi.resetModules();
    const { createHttpTransport: fresh } = await import("../../../src/transports/http.js");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Suppress warning output during this test
    });
    fresh({ url: "https://example.com/print" });
    fresh({ url: "https://other.example.com/print" });
    expect(warnSpy).toHaveBeenCalledOnce(); // once across both constructs
    warnSpy.mockRestore();
  });
});
