import { type ParseError, parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import { initialComposition, initialCompositionJsonc } from "./initial-composition.js";

describe("initial-composition", () => {
  it("the JSONC seed parses without errors", () => {
    const errors: ParseError[] = [];
    parseJsonc(initialCompositionJsonc, errors, { allowTrailingComma: true });
    expect(errors).toEqual([]);
  });

  it("the JSONC seed parses to the same shape as initialComposition", () => {
    const parsed = parseJsonc(initialCompositionJsonc, [], { allowTrailingComma: true });
    expect(parsed).toEqual(initialComposition);
  });

  it("has the 11 expected slots covering all block types", () => {
    expect(initialComposition.slots).toHaveLength(11);
    expect(initialComposition.slots.map((s) => s.blockType)).toEqual([
      "kpi",
      "list",
      "list",
      "qaPair",
      "quotation",
      "keyValue",
      "wordSearch",
      "wordOfDayDemo",
      "streakDemo",
      "onThisDayDemo",
      "textCell",
    ]);
  });

  it("preserves the JSONC comments that drive discoverability", () => {
    // Tripwire: if these substrings disappear, the discoverability hints have
    // been stripped from the seed and need to be re-added. Each maps to one
    // per-slot hint the user sees on initial load (mirrors registry auto-inject).
    expect(initialCompositionJsonc).toMatch(/pressedslip playground seed/);
    expect(initialCompositionJsonc).toMatch(/Required: `data\.label`, `data\.value`/);
    expect(initialCompositionJsonc).toMatch(/Required: `data\.groups` \(min 1\)/);
  });
});
