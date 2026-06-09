// tests/orchestrator/compose-fetch.test.ts
import { describe, expect, it, vi } from "vitest";
import { createMemoryCache } from "../../src/orchestrator/cache.js";
import { fetchProviders } from "../../src/orchestrator/compose.js";
import { mulberry32 } from "../../src/orchestrator/prng.js";
import { defineProvider } from "../../src/providers/define-provider.js";

function ctx(date = "2026-05-22") {
  return {
    date,
    hour: 12,
    subjectId: "user-1",
    random: mulberry32(1),
    cache: createMemoryCache(),
    userCtx: {},
  };
}

describe("fetchProviders (step 4)", () => {
  it('fetches a provider and returns {ok:"data"}', async () => {
    const weather = defineProvider({
      key: "weather",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => ({ ok: "data", value: { temp: 20 } }),
    });
    const cache = createMemoryCache();
    const { outcomes, providerData } = await fetchProviders({
      providers: { weather },
      requestedKeys: new Set(["weather"]),
      ctx: ctx(),
      cache,
      mode: "parallel-soft",
      defaultTimeoutMs: 5000,
      providerTimeoutOverrides: {},
      requestedBlockTypes: null,
    });
    expect(outcomes.weather?.ok).toBe("data");
    expect(providerData.weather).toEqual({ temp: 20 });
  });

  it('returns {ok:"error"} when provider throws an operational Error', async () => {
    const failing = defineProvider({
      key: "failing",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => {
        throw new Error("boom");
      },
    });
    const cache = createMemoryCache();
    const { outcomes } = await fetchProviders({
      providers: { failing },
      requestedKeys: new Set(["failing"]),
      ctx: ctx(),
      cache,
      mode: "parallel-soft",
      defaultTimeoutMs: 5000,
      providerTimeoutOverrides: {},
      requestedBlockTypes: null,
    });
    expect(outcomes.failing?.ok).toBe("error");
    expect(outcomes.failing?.reason?.message).toBe("boom");
  });

  it("re-throws TypeError (programmer error per ADR-0014)", async () => {
    const buggy = defineProvider({
      key: "buggy",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => {
        const ctx = {} as {
          missing: { field: import("../../src/types.js").ProviderResult<unknown> };
        };
        return ctx.missing.field;
      }, // TypeError
    });
    const cache = createMemoryCache();
    await expect(
      fetchProviders({
        providers: { buggy },
        requestedKeys: new Set(["buggy"]),
        ctx: ctx(),
        cache,
        mode: "parallel-soft",
        defaultTimeoutMs: 5000,
        providerTimeoutOverrides: {},
        requestedBlockTypes: null,
      }),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it("honors per-provider timeoutMs", async () => {
    const slow = defineProvider({
      key: "slow",
      scope: "shared",
      freshness: "per-day",
      timeoutMs: 20,
      fetch: () =>
        new Promise<import("../../src/types.js").ProviderResult<number>>((r) =>
          setTimeout(() => r({ ok: "data", value: 1 }), 200),
        ),
    });
    const cache = createMemoryCache();
    const { outcomes } = await fetchProviders({
      providers: { slow },
      requestedKeys: new Set(["slow"]),
      ctx: ctx(),
      cache,
      mode: "parallel-soft",
      defaultTimeoutMs: 5000,
      providerTimeoutOverrides: {},
      requestedBlockTypes: null,
    });
    expect(outcomes.slow?.ok).toBe("error");
    expect(outcomes.slow?.reason?.name).toBe("TimeoutError");
  });

  it("hits cache on second compose() with same key (cache-hit shortcut)", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: "data" as const, value: 1 }));
    const provider = defineProvider({
      key: "cached",
      scope: "shared",
      freshness: "per-day",
      fetch: fetchSpy,
    });
    const cache = createMemoryCache();
    const args = {
      providers: { cached: provider },
      requestedKeys: new Set(["cached"]),
      ctx: ctx(),
      cache,
      mode: "parallel-soft" as const,
      defaultTimeoutMs: 5000,
      providerTimeoutOverrides: {},
      requestedBlockTypes: null,
    };
    await fetchProviders(args);
    await fetchProviders(args);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('parallel-hard mode flags hardAbort when any provider returns {ok:"error"}', async () => {
    const ok = defineProvider({
      key: "ok",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => ({ ok: "data", value: 1 }),
    });
    const bad = defineProvider({
      key: "bad",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => {
        throw new Error("x");
      },
    });
    const cache = createMemoryCache();
    const result = await fetchProviders({
      providers: { ok, bad },
      requestedKeys: new Set(["ok", "bad"]),
      ctx: ctx(),
      cache,
      mode: "parallel-hard",
      defaultTimeoutMs: 5000,
      providerTimeoutOverrides: {},
      requestedBlockTypes: null,
    });
    expect(result.hardAbort).toBe(true);
    expect(result.hardAbortProvider).toBe("bad");
  });

  it('parallel-hard does NOT trigger hardAbort on {ok:"suppressed"}', async () => {
    const suppressed = defineProvider({
      key: "sup",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => ({ ok: "suppressed" }),
    });
    const cache = createMemoryCache();
    const result = await fetchProviders({
      providers: { sup: suppressed },
      requestedKeys: new Set(["sup"]),
      ctx: ctx(),
      cache,
      mode: "parallel-hard",
      defaultTimeoutMs: 5000,
      providerTimeoutOverrides: {},
      requestedBlockTypes: null,
    });
    expect(result.hardAbort).toBe(false);
  });
});
