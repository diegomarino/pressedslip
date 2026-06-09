// tests/orchestrator/compose-retain.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { retainPreviousSlots } from "../../src/orchestrator/compose.js";
import type { Composition, Slot } from "../../src/types.js";

const blockA = defineBlock({ type: "a", schema: z.object({}), render: () => null });
const blockB = defineBlock({ type: "b", schema: z.object({}), render: () => null });
const blockC = defineBlock({ type: "c", schema: z.object({}), render: () => null });

const mkComp = (slots: Slot[]): Composition => ({
  id: "prev",
  version: 1,
  date: "2026-05-22",
  status: "ready",
  slots,
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
});

describe("retainPreviousSlots (step 6, M4)", () => {
  it("retains non-requested slots by blockType match (not ordinal index)", () => {
    const previous = mkComp([
      { index: 0, blockType: "a", data: { v: "a-old" } },
      { index: 1, blockType: "b", data: { v: "b-old" } },
      { index: 2, blockType: "c", data: { v: "c-old" } },
    ]);
    // Registry REORDERED between runs: now [c, a, b]
    const currentBlocks = [blockC, blockA, blockB];
    const justRendered: Slot[] = [{ index: 1, blockType: "a", data: { v: "a-new" } }];
    const result = retainPreviousSlots({
      currentBlocks,
      justRenderedSlots: justRendered,
      onlyTypes: ["a"],
      previousComposition: previous,
    });
    // a is the new render. b and c are retained from previous BY TYPE
    // (not by ordinal position). c's old data must still appear.
    const byType = new Map(result.map((s) => [s.blockType, s.data]));
    expect(byType.get("a")).toEqual({ v: "a-new" });
    expect(byType.get("b")).toEqual({ v: "b-old" });
    expect(byType.get("c")).toEqual({ v: "c-old" });
  });

  it("drops retained blocks that have no slot in the previous Composition", () => {
    const previous = mkComp([
      { index: 0, blockType: "a", data: { v: "a-old" } },
      // no 'b' slot in previous
    ]);
    const currentBlocks = [blockA, blockB];
    const justRendered: Slot[] = [{ index: 0, blockType: "a", data: { v: "a-new" } }];
    const result = retainPreviousSlots({
      currentBlocks,
      justRenderedSlots: justRendered,
      onlyTypes: ["a"],
      previousComposition: previous,
    });
    expect(result.some((s) => s.blockType === "b")).toBe(false);
  });

  it("passes through unchanged when onlyTypes is null", () => {
    const justRendered: Slot[] = [{ index: 0, blockType: "a", data: {} }];
    const result = retainPreviousSlots({
      currentBlocks: [blockA],
      justRenderedSlots: justRendered,
      onlyTypes: null,
      previousComposition: undefined,
    });
    expect(result).toEqual(justRendered);
  });
});
