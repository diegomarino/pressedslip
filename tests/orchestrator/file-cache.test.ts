import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileCache } from "../../src/orchestrator/file-cache.js";

describe("createFileCache", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ph-cache-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("set then get round-trips a JSON value across cache instances", async () => {
    const c1 = createFileCache({ dir });
    await c1.set("k", { a: 1, b: [2, 3] });
    const c2 = createFileCache({ dir });
    expect(await c2.get("k")).toEqual({ a: 1, b: [2, 3] });
  });

  it("delete removes the on-disk entry", async () => {
    const c = createFileCache({ dir });
    await c.set("k", "v");
    await c.delete("k");
    expect(await c.get("k")).toBeUndefined();
  });

  it("clear empties the cache directory of cache files", async () => {
    const c = createFileCache({ dir });
    await c.set("a", 1);
    await c.set("b", 2);
    await c.clear();
    expect(await c.get("a")).toBeUndefined();
    expect(await c.get("b")).toBeUndefined();
  });

  it("set with ttlMs evicts after TTL passes", async () => {
    const c = createFileCache({ dir });
    await c.set("k", "v", 30);
    expect(await c.get("k")).toBe("v");
    await new Promise((r) => setTimeout(r, 50));
    expect(await c.get("k")).toBeUndefined();
  });

  it("handles keys containing characters unsafe for filenames", async () => {
    const c = createFileCache({ dir });
    const unsafeKey = "weather:personal/user 123:2026-05-22";
    await c.set(unsafeKey, "v");
    expect(await c.get(unsafeKey)).toBe("v");
  });

  it("uses atomic temp+rename for writes", async () => {
    // Smoke: a successful write should not leave .tmp sidecars behind.
    const c = createFileCache({ dir });
    await c.set("k", "v");
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(dir);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});
