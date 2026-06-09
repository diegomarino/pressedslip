// tests/orchestrator/cache-key.test.ts
import { describe, expect, it } from "vitest";
import { deriveCacheKey } from "../../src/orchestrator/cache-key.js";
import type { ProviderDefinition } from "../../src/types.js";

function mkProvider(
  p: Partial<ProviderDefinition<unknown>> &
    Pick<ProviderDefinition<unknown>, "key" | "scope" | "freshness">,
): ProviderDefinition<unknown> {
  return { fetch: async () => ({ ok: "suppressed" }), ...p };
}

describe("deriveCacheKey", () => {
  it("shared + per-day → {key}:shared:{date}", () => {
    const p = mkProvider({ key: "weather", scope: "shared", freshness: "per-day" });
    expect(deriveCacheKey(p, { date: "2026-05-22", subjectId: "u1" })).toBe(
      "weather:shared:2026-05-22",
    );
  });

  it("personal + per-day → {key}:{subjectId}:{date}", () => {
    const p = mkProvider({ key: "profile", scope: "personal", freshness: "per-day" });
    expect(deriveCacheKey(p, { date: "2026-05-22", subjectId: "user-1" })).toBe(
      "profile:user-1:2026-05-22",
    );
  });

  it("shared + per-hour → {key}:shared:{date}T{HH}", () => {
    const p = mkProvider({ key: "market", scope: "shared", freshness: "per-hour" });
    expect(deriveCacheKey(p, { date: "2026-05-22", hour: 9 })).toBe("market:shared:2026-05-22T09");
  });

  it("personal + per-hour → {key}:{subjectId}:{date}T{HH}", () => {
    const p = mkProvider({ key: "meetings", scope: "personal", freshness: "per-hour" });
    expect(deriveCacheKey(p, { date: "2026-05-22", hour: 14, subjectId: "u" })).toBe(
      "meetings:u:2026-05-22T14",
    );
  });

  it('freshness: "never" → {key}:{scopePart}:static', () => {
    const p = mkProvider({ key: "header", scope: "shared", freshness: "never" });
    expect(deriveCacheKey(p, { date: "irrelevant" })).toBe("header:shared:static");
  });

  it('freshness: "always-fetch" → null (cache is skipped)', () => {
    const p = mkProvider({ key: "live", scope: "shared", freshness: "always-fetch" });
    expect(deriveCacheKey(p, { date: "2026-05-22" })).toBeNull();
  });
});
