// tests/providers/static-text.test.ts
import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../src/orchestrator/prng.js";
import { createStaticTextProvider } from "../../src/providers/static-text.js";

function ctx() {
  return {
    date: "2026-05-22",
    random: mulberry32(1),
    cache: { get: async () => undefined },
    userCtx: {},
  };
}

describe("createStaticTextProvider", () => {
  it("always returns the configured value", async () => {
    const p = createStaticTextProvider({ key: "header", value: "Daily Briefing" });
    const r = await p.fetch(ctx(), null);
    expect(r).toEqual({ ok: "data", value: "Daily Briefing" });
  });

  it("supports any T (not just string)", async () => {
    const p = createStaticTextProvider({ key: "cfg", value: { theme: "dark" } });
    const r = await p.fetch(ctx(), null);
    expect(r).toEqual({ ok: "data", value: { theme: "dark" } });
  });

  it('declares scope:"shared", freshness:"never"', () => {
    const p = createStaticTextProvider({ key: "k", value: "x" });
    expect(p.scope).toBe("shared");
    expect(p.freshness).toBe("never");
  });
});
