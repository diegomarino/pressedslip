import { describe, expect, it } from "vitest";
import { compareStructurally } from "../../../src/testing/internal/compare-structurally.js";

describe("compareStructurally", () => {
  it("returns null when two scalar values are equal", () => {
    expect(compareStructurally(1, 1)).toBeNull();
    expect(compareStructurally("a", "a")).toBeNull();
    expect(compareStructurally(true, true)).toBeNull();
    expect(compareStructurally(null, null)).toBeNull();
  });

  it("returns a path + diff when scalars differ", () => {
    const result = compareStructurally(1, 2);
    expect(result).toEqual({ path: "$", left: 1, right: 2 });
  });

  it("recurses into plain objects", () => {
    expect(compareStructurally({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeNull();
    const result = compareStructurally({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(result).toEqual({ path: "$.b", left: 2, right: 3 });
  });

  it("recurses into arrays", () => {
    expect(compareStructurally([1, 2, 3], [1, 2, 3])).toBeNull();
    const result = compareStructurally([1, 2, 3], [1, 9, 3]);
    expect(result).toEqual({ path: "$[1]", left: 2, right: 9 });
  });

  it("flags array length mismatch", () => {
    const result = compareStructurally([1, 2], [1, 2, 3]);
    expect(result).toMatchObject({ path: "$", reason: "length-mismatch" });
  });

  it("compares Buffer/Uint8Array by length when ignoreBuffers is true", () => {
    const a = { png: Buffer.from([1, 2, 3, 4]) };
    const b = { png: Buffer.from([9, 9, 9, 9]) }; // same length, different bytes
    expect(compareStructurally(a, b, { ignoreBuffers: true })).toBeNull();
    const c = { png: Buffer.from([1, 2, 3]) }; // different length
    expect(compareStructurally(a, c, { ignoreBuffers: true })).toMatchObject({
      path: "$.png",
      reason: "buffer-length-mismatch",
    });
  });

  it("compares Buffer/Uint8Array byte-by-byte when ignoreBuffers is false", () => {
    const a = { png: Buffer.from([1, 2, 3]) };
    const b = { png: Buffer.from([1, 2, 4]) };
    const result = compareStructurally(a, b, { ignoreBuffers: false });
    expect(result).toMatchObject({ path: "$.png", reason: "buffer-bytes-mismatch" });
  });

  it("reports the first divergence (depth-first)", () => {
    const a = { x: { y: 1 }, z: 2 };
    const b = { x: { y: 99 }, z: 99 };
    const result = compareStructurally(a, b);
    expect(result?.path).toBe("$.x.y");
  });

  it("treats undefined keys as missing", () => {
    const result = compareStructurally({ a: 1 }, { a: 1, b: 2 });
    expect(result).toMatchObject({ path: "$.b", reason: "key-mismatch" });
  });

  it("flags key-mismatch when both sides have disjoint extra keys", () => {
    // Codex peer-review finding: original implementation's `find` over
    // sorted keys surfaces only one side's extra key. This test guards
    // against silently swallowing the other side.
    const result = compareStructurally({ a: 1, b: 2 }, { a: 1, c: 3 });
    expect(result).toMatchObject({ reason: "key-mismatch" });
    // Both keys (b in left, c in right) must appear in the diagnostic
    // (left/right arrays carry sorted key lists).
    expect(result?.left).toContain("b");
    expect(result?.right).toContain("c");
  });
});
