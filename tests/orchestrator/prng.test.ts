import { describe, expect, it } from "vitest";
import { fnv1a32, mulberry32 } from "../../src/orchestrator/prng.js";

describe("fnv1a32", () => {
  it("returns 32-bit unsigned integer for any string", () => {
    const result = fnv1a32("hello");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('produces the canonical FNV-1a hash for "" (offset basis)', () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
  });

  it("produces different hashes for different inputs", () => {
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
    expect(fnv1a32("2026-05-22:user-1")).not.toBe(fnv1a32("2026-05-22:user-2"));
  });

  it("is deterministic across calls", () => {
    expect(fnv1a32("2026-05-22:user-123")).toBe(fnv1a32("2026-05-22:user-123"));
  });
});

describe("mulberry32", () => {
  it("returns a function that produces numbers in [0, 1)", () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const r = rand();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(42);
    const b = mulberry32(43);
    expect(a()).not.toBe(b());
  });
});
