import { assertStructurallyEqual } from "pressedslip/testing";
import { describe, expect, it } from "vitest";

describe("assertStructurallyEqual", () => {
  it("passes when two plain objects are deeply equal", () => {
    const a = { x: 1, y: { z: "hello" } };
    const b = { x: 1, y: { z: "hello" } };
    expect(() => assertStructurallyEqual(a, b)).not.toThrow();
  });

  it("throws with a path when objects differ", () => {
    const a = { x: 1, y: { z: "hello" } };
    const b = { x: 1, y: { z: "world" } };
    expect(() => assertStructurallyEqual(a, b)).toThrow(/\$\.y\.z/);
  });

  it("ignores buffer bytes by default (ignoreBuffers: true)", () => {
    const a = { data: Buffer.from([1, 2, 3]) };
    const b = { data: Buffer.from([9, 9, 9]) }; // same length, different bytes
    expect(() => assertStructurallyEqual(a, b)).not.toThrow();
  });

  it("checks buffer bytes when ignoreBuffers: false", () => {
    const a = { data: Buffer.from([1, 2, 3]) };
    const b = { data: Buffer.from([1, 2, 4]) };
    expect(() => assertStructurallyEqual(a, b, { ignoreBuffers: false })).toThrow(
      /buffer-bytes-mismatch/,
    );
  });

  it("includes path in error message", () => {
    const a = { blocks: [{ type: "kpi", value: 42 }] };
    const b = { blocks: [{ type: "kpi", value: 99 }] };
    expect(() => assertStructurallyEqual(a, b)).toThrow(/\$\.blocks\[0\]\.value/);
  });

  it("passes for equal arrays", () => {
    expect(() => assertStructurallyEqual([1, 2, 3], [1, 2, 3])).not.toThrow();
  });

  it("throws when array lengths differ", () => {
    expect(() => assertStructurallyEqual([1, 2], [1, 2, 3])).toThrow(/length-mismatch/);
  });
});
