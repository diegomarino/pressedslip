import { describe, expect, it } from "vitest";
import { defineProvider } from "../../src/providers/define-provider.js";
import { createProviderRegistry } from "../../src/providers/registry.js";

const weather = defineProvider({
  key: "weather",
  scope: "shared",
  freshness: "per-day",
  fetch: async () => ({ ok: "data", value: 1 }),
});

const profile = defineProvider({
  key: "profile",
  scope: "personal",
  freshness: "per-day",
  fetch: async () => ({ ok: "data", value: { name: "x" } }),
});

describe("createProviderRegistry", () => {
  it("returns the providers object unchanged on success", () => {
    const r = createProviderRegistry({ weather, profile });
    expect(r.weather).toBe(weather);
    expect(r.profile).toBe(profile);
  });

  it("throws when the registry key does not match the provider.key", () => {
    expect(() => createProviderRegistry({ wx: weather })).toThrow(/key mismatch.*'wx'.*'weather'/);
  });

  it("throws when two entries share the same provider.key", () => {
    const otherWeather = defineProvider({
      key: "weather",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => ({ ok: "data", value: 2 }),
    });
    // Programmatic construction to bypass TS object-literal duplicate detection
    const built: Record<string, typeof weather> = {};
    built.a = weather;
    built.b = otherWeather;
    expect(() => createProviderRegistry(built)).toThrow(/duplicate.*'weather'/);
  });
});
