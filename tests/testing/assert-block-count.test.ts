import { assertBlockCount } from "pressedslip/testing";
import { describe, expect, it } from "vitest";

type BlockList = {
  blocks: ReadonlyArray<{ type: string }>;
};

describe("assertBlockCount", () => {
  it("passes when the count matches", () => {
    const rendering: BlockList = { blocks: [{ type: "a" }, { type: "b" }] };
    expect(() => assertBlockCount(rendering, 2)).not.toThrow();
  });

  it("throws with a diff message when the count is off", () => {
    const rendering: BlockList = { blocks: [{ type: "a" }] };
    expect(() => assertBlockCount(rendering, 2)).toThrow(/expected 2.*got 1/);
  });

  it("passes for empty blocks array with expected 0", () => {
    const rendering: BlockList = { blocks: [] };
    expect(() => assertBlockCount(rendering, 0)).not.toThrow();
  });
});
