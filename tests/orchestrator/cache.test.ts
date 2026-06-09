// tests/orchestrator/cache.test.ts
import { describe, expect, it } from "vitest";
import { createMemoryCache } from "../../src/orchestrator/cache.js";

describe("createMemoryCache", () => {
  it("get returns undefined for missing key", async () => {
    const c = createMemoryCache();
    expect(await c.get("missing")).toBeUndefined();
  });

  it("set then get round-trips a value", async () => {
    const c = createMemoryCache();
    await c.set("k", { a: 1 });
    expect(await c.get("k")).toEqual({ a: 1 });
  });

  it("delete removes a key", async () => {
    const c = createMemoryCache();
    await c.set("k", "v");
    await c.delete("k");
    expect(await c.get("k")).toBeUndefined();
  });

  it("clear empties the cache", async () => {
    const c = createMemoryCache();
    await c.set("a", 1);
    await c.set("b", 2);
    await c.clear();
    expect(await c.get("a")).toBeUndefined();
    expect(await c.get("b")).toBeUndefined();
  });

  it("set with ttlMs evicts after TTL passes", async () => {
    const c = createMemoryCache();
    await c.set("k", "v", 10);
    expect(await c.get("k")).toBe("v");
    await new Promise((r) => setTimeout(r, 30));
    expect(await c.get("k")).toBeUndefined();
  });

  it("set without ttlMs does not evict by time", async () => {
    const c = createMemoryCache();
    await c.set("k", "v");
    await new Promise((r) => setTimeout(r, 30));
    expect(await c.get("k")).toBe("v");
  });
});
