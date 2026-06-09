/**
 * @fileoverview Unit tests for memoryFontCache and nodeFontCache implementations.
 */
import { describe, expect, it } from "vitest";
import { memoryFontCache } from "../cache.js";
import { nodeFontCache } from "../node-font-cache.js";

describe("memoryFontCache", () => {
  it("returns undefined for unknown key", async () => {
    const cache = memoryFontCache();
    expect(await cache.get("nonexistent")).toBeUndefined();
  });

  it("roundtrips bytes via set + get", async () => {
    const cache = memoryFontCache();
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await cache.set("k1", bytes);
    const got = await cache.get("k1");
    expect(got).toEqual(bytes);
  });

  it("isolates instances", async () => {
    const c1 = memoryFontCache();
    const c2 = memoryFontCache();
    await c1.set("k", new Uint8Array([1]));
    expect(await c2.get("k")).toBeUndefined();
  });
});

describe("nodeFontCache", () => {
  it("roundtrips bytes via set + get on disk", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "phpkg-cache-test-"));
    const cache = nodeFontCache({ dir });
    const bytes = new Uint8Array([9, 8, 7]);
    await cache.set("https://example.com/font.ttf", bytes);
    const got = await cache.get("https://example.com/font.ttf");
    expect(got).toEqual(bytes);
  });

  it("returns undefined for unknown key", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "phpkg-cache-test-"));
    const cache = nodeFontCache({ dir });
    expect(await cache.get("https://example.com/missing.ttf")).toBeUndefined();
  });
});
