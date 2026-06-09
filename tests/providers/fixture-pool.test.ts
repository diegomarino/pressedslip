import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../src/orchestrator/prng.js";
import { createFixturePoolProvider } from "../../src/providers/fixture-pool.js";

function ctx() {
  return {
    date: "2026-05-22",
    random: mulberry32(42),
    cache: { get: async () => undefined },
    userCtx: {},
  };
}

describe("createFixturePoolProvider", () => {
  it("picks one element deterministically from the pool", async () => {
    const pool = ["a", "b", "c", "d"];
    const p = createFixturePoolProvider({ key: "quotes", pool });
    const result = await p.fetch(ctx(), null);
    expect(result.ok).toBe("data");
    if (result.ok === "data") {
      expect(pool).toContain(result.value);
    }
  });

  it('returns {ok:"suppressed"} when pool is empty', async () => {
    const p = createFixturePoolProvider({ key: "empty", pool: [] });
    const result = await p.fetch(ctx(), null);
    expect(result).toEqual({ ok: "suppressed" });
  });

  it('defaults to scope:"shared", freshness:"per-day"', () => {
    const p = createFixturePoolProvider({ key: "k", pool: ["x"] });
    expect(p.scope).toBe("shared");
    expect(p.freshness).toBe("per-day");
  });

  it("respects overridden scope and freshness", () => {
    const p = createFixturePoolProvider({
      key: "k",
      pool: ["x"],
      scope: "personal",
      freshness: "per-hour",
    });
    expect(p.scope).toBe("personal");
    expect(p.freshness).toBe("per-hour");
  });
});
