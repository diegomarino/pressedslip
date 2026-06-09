// tests/providers/define-provider.test.ts
import { describe, expect, it } from "vitest";
import { defineProvider } from "../../src/providers/define-provider.js";

describe("defineProvider", () => {
  it("returns the spec verbatim (identity function with type inference)", () => {
    const spec = {
      key: "weather",
      scope: "shared" as const,
      freshness: "per-day" as const,
      fetch: async () => ({ ok: "data" as const, value: { temp: 20 } }),
    };
    expect(defineProvider(spec)).toBe(spec);
  });
});
