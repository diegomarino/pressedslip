/**
 * @fileoverview Unit tests for loadThemeFonts.
 */
import { describe, expect, it, vi } from "vitest";
import { memoryFontCache } from "../cache.js";
import { loadThemeFonts } from "../load.js";
import type { ThemeTemplate } from "../types.js";

function makeTemplate(): ThemeTemplate {
  return {
    id: "test",
    label: "Test",
    roleUrls: {
      body: [{ family: "TestSans", url: "https://x/body.woff2", weight: 400, style: "normal" }],
      display: [{ family: "TestSans", url: "https://x/disp.woff2", weight: 700, style: "normal" }],
    },
    shell: { titleStyle: "block" },
    header: {},
  };
}

function fakeBytes(n: number): Uint8Array {
  return new Uint8Array([n, n, n, n]);
}

function fakeFetcher(
  responses: Record<string, { ok: boolean; status: number; bytes?: Uint8Array }>,
): typeof fetch {
  return (async (input: string) => {
    const r = responses[input];
    if (!r) throw new Error(`unexpected url: ${input}`);
    return {
      ok: r.ok,
      status: r.status,
      arrayBuffer: async () => (r.bytes ?? new Uint8Array()).buffer,
    } as unknown as Response;
  }) as typeof fetch;
}

describe("loadThemeFonts", () => {
  it("maps roleUrls → fontRoles + populates flat fonts list", async () => {
    const tpl = makeTemplate();
    const fetcher = fakeFetcher({
      "https://x/body.woff2": { ok: true, status: 200, bytes: fakeBytes(1) },
      "https://x/disp.woff2": { ok: true, status: 200, bytes: fakeBytes(2) },
    });
    const prepared = await loadThemeFonts(tpl, { fetcher, cache: memoryFontCache() });
    expect(prepared._kind).toBe("prepared");
    expect(prepared.fontRoles.body).toHaveLength(1);
    expect(prepared.fontRoles.display).toHaveLength(1);
    expect(prepared.fonts).toHaveLength(2);
  });

  it("cache hit avoids second fetch for same URL", async () => {
    const tpl = makeTemplate();
    const cache = memoryFontCache();
    await cache.set("https://x/body.woff2", fakeBytes(1));
    await cache.set("https://x/disp.woff2", fakeBytes(2));
    const fetcher = vi.fn();
    const prepared = await loadThemeFonts(tpl, {
      fetcher: fetcher as unknown as typeof fetch,
      cache,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(prepared.fonts).toHaveLength(2);
  });

  it("cache miss invokes fetcher AND cache.set", async () => {
    const tpl = makeTemplate();
    const cache = memoryFontCache();
    const setSpy = vi.spyOn(cache, "set");
    const fetcher = fakeFetcher({
      "https://x/body.woff2": { ok: true, status: 200, bytes: fakeBytes(1) },
      "https://x/disp.woff2": { ok: true, status: 200, bytes: fakeBytes(2) },
    });
    await loadThemeFonts(tpl, { fetcher, cache });
    expect(setSpy).toHaveBeenCalledTimes(2);
  });

  it("deduplicates fonts[] by family+weight+style triple", async () => {
    const tpl: ThemeTemplate = {
      id: "mono",
      label: "Mono",
      roleUrls: {
        body: [{ family: "X", url: "https://x/a.woff2", weight: 400, style: "normal" }],
        mono: [{ family: "X", url: "https://x/a.woff2", weight: 400, style: "normal" }],
      },
      shell: { titleStyle: "hash" },
      header: {},
    };
    const fetcher = fakeFetcher({
      "https://x/a.woff2": { ok: true, status: 200, bytes: fakeBytes(7) },
    });
    const prepared = await loadThemeFonts(tpl, { fetcher, cache: memoryFontCache() });
    expect(prepared.fonts).toHaveLength(1);
    expect(prepared.fontRoles.body).toHaveLength(1);
    expect(prepared.fontRoles.mono).toHaveLength(1);
    // Both roles reference the same FontSpec (deduped):
    expect(prepared.fontRoles.body?.[0]).toBe(prepared.fontRoles.mono?.[0]);
  });

  it("default behavior on 404: throws", async () => {
    const tpl = makeTemplate();
    const fetcher = fakeFetcher({
      "https://x/body.woff2": { ok: false, status: 404 },
      "https://x/disp.woff2": { ok: true, status: 200, bytes: fakeBytes(2) },
    });
    await expect(loadThemeFonts(tpl, { fetcher, cache: memoryFontCache() })).rejects.toThrow(
      /HTTP 404/,
    );
  });

  it("onFontLoadError 'warn-skip': logs warning + omits failed weight", async () => {
    const tpl = makeTemplate();
    const fetcher = fakeFetcher({
      "https://x/body.woff2": { ok: false, status: 404 },
      "https://x/disp.woff2": { ok: true, status: 200, bytes: fakeBytes(2) },
    });
    const warn = vi.fn();
    const prepared = await loadThemeFonts(tpl, {
      fetcher,
      cache: memoryFontCache(),
      onFontLoadError: "warn-skip",
      logger: { warn },
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(prepared.fonts).toHaveLength(1); // only display loaded
    expect(prepared.fontRoles.body).toBeUndefined();
    expect(prepared.fontRoles.display).toHaveLength(1);
  });

  it("extraUrls path populates fontRoles by custom id", async () => {
    const tpl: ThemeTemplate = {
      id: "x",
      label: "X",
      roleUrls: {
        body: [{ family: "S", url: "https://x/body.woff2", weight: 400, style: "normal" }],
      },
      extraUrls: {
        brandHeavy: [{ family: "B", url: "https://x/heavy.woff2", weight: 900, style: "normal" }],
      },
      shell: { titleStyle: "block" },
      header: {},
    };
    const fetcher = fakeFetcher({
      "https://x/body.woff2": { ok: true, status: 200, bytes: fakeBytes(1) },
      "https://x/heavy.woff2": { ok: true, status: 200, bytes: fakeBytes(2) },
    });
    const prepared = await loadThemeFonts(tpl, { fetcher, cache: memoryFontCache() });
    expect(prepared.fontRoles.brandHeavy).toHaveLength(1);
    expect(prepared.fontRoles.body).toHaveLength(1);
  });
});
