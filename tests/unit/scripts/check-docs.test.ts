/**
 * @fileoverview Tests for the pure check logic in scripts/check-docs/checker.mjs.
 * Each test feeds a small source string + filename and asserts the returned violations.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error — checker is a .mjs file with no .d.ts; we exercise it as a JS module.
import { checkSource } from "../../../scripts/check-docs/checker.mjs";

type Violation = {
  file: string;
  line: number;
  column: number;
  message: string;
};

const run = (src: string, filename = "src/sample.ts"): Violation[] =>
  checkSource(src, filename) as Violation[];

describe("file-level: @fileoverview rule", () => {
  it("reports a violation when the file has no JSDoc block at the top", () => {
    const src = `export function foo(): void {}\n`;
    const v = run(src);
    expect(v.some((x) => /missing @fileoverview/i.test(x.message))).toBe(true);
  });

  it("reports a violation when the top JSDoc block exists but lacks @fileoverview", () => {
    const src = `/** Top-level comment but no fileoverview tag. */\nexport function foo(): void {}\n`;
    const v = run(src);
    expect(v.some((x) => /missing @fileoverview/i.test(x.message))).toBe(true);
  });

  it("reports a violation when @fileoverview text is shorter than 20 non-whitespace characters", () => {
    const src = `/** @fileoverview tiny */\nexport function foo(): void {}\n`;
    const v = run(src);
    expect(v.some((x) => /@fileoverview text/i.test(x.message))).toBe(true);
  });

  it("accepts a valid @fileoverview block of sufficient length", () => {
    const src = `/** @fileoverview This file does a thing that is documented properly here. */\nexport function foo(): void {}\n`;
    const v = run(src).filter((x) => /fileoverview/i.test(x.message));
    expect(v).toEqual([]);
  });
});

describe("symbol-level: JSDoc on exported declarations", () => {
  const header = `/** @fileoverview Valid header that is long enough to satisfy the file-level rule. */\n`;

  it("reports a violation for `export function` without JSDoc", () => {
    const src = `${header}export function bar(): void {}\n`;
    const v = run(src);
    expect(v.some((x) => /exported function `bar` missing jsdoc/i.test(x.message))).toBe(true);
  });

  it("reports a violation for `export const` without JSDoc", () => {
    const src = `${header}export const NAME = "x";\n`;
    const v = run(src);
    expect(v.some((x) => /exported.*`name`.*missing jsdoc/i.test(x.message))).toBe(true);
  });

  it("reports a violation for `export type` without JSDoc", () => {
    const src = `${header}export type T = { a: number };\n`;
    const v = run(src);
    expect(v.some((x) => /exported.*`t`.*missing jsdoc/i.test(x.message))).toBe(true);
  });

  it("accepts a JSDoc block immediately above the declaration", () => {
    const src = `${header}/** Returns nothing, takes nothing. Useful as a no-op placeholder. */\nexport function bar(): void {}\n`;
    const v = run(src).filter((x) => /jsdoc/i.test(x.message));
    expect(v).toEqual([]);
  });

  it("requires the JSDoc block to contain at least 20 non-whitespace prose characters", () => {
    const src = `${header}/** tiny. */\nexport function bar(): void {}\n`;
    const v = run(src);
    expect(v.some((x) => /jsdoc.*too short/i.test(x.message))).toBe(true);
  });

  it("does NOT require JSDoc on re-exports", () => {
    const src = `${header}export { foo } from "./other.js";\n`;
    const v = run(src).filter((x) => /jsdoc/i.test(x.message));
    expect(v).toEqual([]);
  });
});

describe("position reporting", () => {
  it("reports the line where the violating declaration starts", () => {
    const src = `/** @fileoverview Valid header that is long enough to satisfy the file-level rule. */\n\n\nexport function bar(): void {}\n`;
    const v = run(src).find((x) => /bar/.test(x.message));
    expect(v?.line).toBe(4);
  });
});
