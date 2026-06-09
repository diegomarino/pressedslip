// tests/providers/open-meteo.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mulberry32 } from "../../src/orchestrator/prng.js";
import { createOpenMeteoProvider } from "../../src/providers/open-meteo.js";
import type { ProviderContext } from "../../src/types.js";

function ctxWithLocation(location: unknown): ProviderContext {
  return {
    date: "2026-05-22",
    hour: 12,
    random: mulberry32(1),
    cache: { get: async () => undefined },
    userCtx: { location } as Readonly<Record<string, unknown>>,
  };
}

describe("createOpenMeteoProvider", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ current: { temperature_2m: 18.5 } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('declares scope:"shared", freshness:"per-hour"', () => {
    const p = createOpenMeteoProvider({ key: "weather" });
    expect(p.scope).toBe("shared");
    expect(p.freshness).toBe("per-hour");
  });

  it('returns {ok:"data"} on successful HTTP fetch', async () => {
    const p = createOpenMeteoProvider({ key: "weather" });
    const r = await p.fetch(ctxWithLocation({ lat: 40.4, lon: -3.7 }), null);
    expect(r.ok).toBe("data");
  });

  it("throws when ctx.userCtx.location is missing", async () => {
    const p = createOpenMeteoProvider({ key: "weather" });
    await expect(p.fetch(ctxWithLocation(undefined), null)).rejects.toThrow(/location/i);
  });

  it("throws when location lacks lat/lon numbers", async () => {
    const p = createOpenMeteoProvider({ key: "weather" });
    await expect(p.fetch(ctxWithLocation({ lat: "not-a-number" }), null)).rejects.toThrow(
      /location/i,
    );
  });
});
