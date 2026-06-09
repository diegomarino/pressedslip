/**
 * @fileoverview Smoke test for the /testing subpath — verifies the
 * builtinFixtures aggregate exports per-block fixture maps.
 */
import { describe, expect, it } from "vitest";
import { builtinFixtures } from "../../src/testing/index.js";

describe("/testing subpath", () => {
  it("exports builtinFixtures with one entry per catalog shape", () => {
    // EXHAUSTIVE list — update when a shape is added to builtinFixtures.
    expect(Object.keys(builtinFixtures).sort()).toEqual([
      "keyValue",
      "kpi",
      "list",
      "qaPair",
      "quotation",
      "textCell",
      "wordSearch",
    ]);
  });

  it("each shape's fixtures map has at least 3 scenarios", () => {
    for (const [shape, fixtures] of Object.entries(builtinFixtures)) {
      expect(Object.keys(fixtures).length, `${shape} has <3 fixtures`).toBeGreaterThanOrEqual(3);
    }
  });
});
