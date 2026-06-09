// tests/orchestrator/serializable-error.test.ts
import { describe, expect, it } from "vitest";
import {
  isProgrammerError,
  toSerializableError,
} from "../../src/orchestrator/serializable-error.js";

describe("toSerializableError", () => {
  it("projects Error → {name, message, stack}", () => {
    const e = new Error("boom");
    const s = toSerializableError(e);
    expect(s.name).toBe("Error");
    expect(s.message).toBe("boom");
    expect(typeof s.stack).toBe("string");
  });

  it("preserves custom Error subclass name", () => {
    class CustomErr extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "CustomErr";
      }
    }
    const s = toSerializableError(new CustomErr("x"));
    expect(s.name).toBe("CustomErr");
  });

  it("survives JSON round-trip", () => {
    const s = toSerializableError(new Error("round-trip"));
    const parsed = JSON.parse(JSON.stringify(s));
    expect(parsed).toEqual(s);
  });
});

describe("isProgrammerError", () => {
  it("returns true for non-Error throws", () => {
    expect(isProgrammerError("a string")).toBe(true);
    expect(isProgrammerError(undefined)).toBe(true);
    expect(isProgrammerError(null)).toBe(true);
    expect(isProgrammerError({ foo: "bar" })).toBe(true);
  });

  it("returns true for TypeError", () => {
    expect(isProgrammerError(new TypeError("typo"))).toBe(true);
  });

  it("returns true for ReferenceError", () => {
    expect(isProgrammerError(new ReferenceError("undefined var"))).toBe(true);
  });

  it("returns false for ordinary Error", () => {
    expect(isProgrammerError(new Error("operational"))).toBe(false);
  });

  it("returns false for custom Error subclass", () => {
    class TimeoutErr extends Error {}
    expect(isProgrammerError(new TimeoutErr("timeout"))).toBe(false);
  });
});
