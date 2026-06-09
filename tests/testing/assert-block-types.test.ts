import { assertBlockTypes } from "pressedslip/testing";
import { describe, expect, it } from "vitest";

type BlockList = {
  blocks: ReadonlyArray<{ type: string }>;
};

describe("assertBlockTypes", () => {
  it("passes when block types match in order", () => {
    const rendering: BlockList = {
      blocks: [{ type: "textCell" }, { type: "kpi" }, { type: "list" }],
    };
    expect(() => assertBlockTypes(rendering, ["textCell", "kpi", "list"])).not.toThrow();
  });

  it("throws when lengths differ", () => {
    const rendering: BlockList = { blocks: [{ type: "textCell" }] };
    expect(() => assertBlockTypes(rendering, ["textCell", "kpi"])).toThrow(
      /expected 2 blocks.*got 1/,
    );
  });

  it("throws with first divergence index when types differ", () => {
    const rendering: BlockList = {
      blocks: [{ type: "textCell" }, { type: "kpi" }],
    };
    expect(() => assertBlockTypes(rendering, ["textCell", "list"])).toThrow(/index 1/);
  });

  it("passes for empty blocks and empty expected", () => {
    const rendering: BlockList = { blocks: [] };
    expect(() => assertBlockTypes(rendering, [])).not.toThrow();
  });
});
