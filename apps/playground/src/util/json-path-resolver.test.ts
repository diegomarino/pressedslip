import { describe, expect, it } from "vitest";
import { resolveJsonPath } from "./json-path-resolver.js";

function expectResolvedRange(
  text: string,
  path: readonly (string | number)[],
): NonNullable<ReturnType<typeof resolveJsonPath>> {
  const range = resolveJsonPath(text, path);
  expect(range).not.toBeNull();
  if (range === null) {
    throw new Error(`Expected JSON path to resolve: ${path.join(".")}`);
  }
  return range;
}

describe("resolveJsonPath", () => {
  it("locates a top-level property value range", () => {
    const text = `{ "slots": [1, 2], "meta": {} }`;
    const range = expectResolvedRange(text, ["slots"]);
    expect(text.slice(range.from, range.to)).toBe("[1, 2]");
  });

  it("locates a nested array element range", () => {
    const text = `{ "slots": [ { "key": "slot-0" }, { "key": "slot-1" } ] }`;
    const range = expectResolvedRange(text, ["slots", 1, "key"]);
    expect(text.slice(range.from, range.to)).toBe(`"slot-1"`);
  });

  it("returns null for missing path", () => {
    const text = `{ "slots": [] }`;
    expect(resolveJsonPath(text, ["meta"])).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(resolveJsonPath(`{ broken`, ["slots"])).toBeNull();
  });

  it("handles unicode escapes in property names without corrupting ranges", () => {
    const text = `{ "sl\\u006fts": [1] }`;
    const range = expectResolvedRange(text, ["slots"]);
    expect(text.slice(range.from, range.to)).toBe("[1]");
  });

  it("resolves path correctly when input contains a // line comment", () => {
    const text = `{
  // top comment
  "slots": [1, 2]
}`;
    const range = expectResolvedRange(text, ["slots"]);
    expect(text.slice(range.from, range.to)).toBe("[1, 2]");
  });

  it("resolves path correctly when input has a trailing comma", () => {
    const text = `{ "slots": [1, 2,], "meta": {}, }`;
    const range = expectResolvedRange(text, ["meta"]);
    expect(text.slice(range.from, range.to)).toBe("{}");
  });

  it("resolves an integer-indexed slot data path through the discriminated union", () => {
    const text = `{
  "slots": [
    { "blockType": "kpi", "data": { "label": "x", "value": "1" } },
    { "blockType": "textCell", "data": { "text": "hello" } }
  ],
  "date": "2026-05-22",
  "meta": {}
}`;
    const range = expectResolvedRange(text, ["slots", 1, "data", "text"]);
    expect(text.slice(range.from, range.to)).toBe(`"hello"`);
  });

  // Strong differentiator: combines a trailing comma (which @lezer/json's grammar
  // would have rejected, throwing off positions of subsequent siblings) AND a
  // deep integer-indexed path. Verifies the migration is functionally load-bearing,
  // not just incidentally tolerant.
  it("resolves a deep path correctly when the input has both a trailing comma and a // comment", () => {
    const text = `{
  // playground annotation
  "slots": [
    { "blockType": "textCell", "data": { "text": "first", } },
    { "blockType": "textCell", "data": { "text": "second", } },
  ],
  "date": "2026-05-22",
  "meta": {},
}`;
    const range = expectResolvedRange(text, ["slots", 1, "data", "text"]);
    expect(text.slice(range.from, range.to)).toBe(`"second"`);
  });
});
