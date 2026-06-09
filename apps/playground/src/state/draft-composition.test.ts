import { describe, expect, it } from "vitest";
import {
  type DraftAction,
  type DraftSlot,
  draftReducer,
  type EditorDraft,
} from "./draft-composition.js";

const sampleSlot = (text: string): DraftSlot => ({ blockType: "textCell", data: { text } });

const seed = (slots: DraftSlot[]): EditorDraft => ({
  draft: { slots, date: "2026-05-22", meta: {} },
  slotUids: slots.map((_, i) => `seed-${i}`),
});

describe("draftReducer", () => {
  it("INSERT appends slot and pushes a fresh UID", () => {
    const state = seed([]);
    const action: DraftAction = { type: "INSERT", slot: sampleSlot("hello") };
    const next = draftReducer(state, action);
    expect(next.draft.slots).toHaveLength(1);
    expect(next.draft.slots[0]?.blockType).toBe("textCell");
    expect(next.slotUids).toHaveLength(1);
    expect(next.slotUids[0]).not.toBe(""); // fresh UID
  });

  it("INSERT atIndex inserts in middle and splices the UID", () => {
    const state = seed([sampleSlot("a"), sampleSlot("c")]);
    const next = draftReducer(state, { type: "INSERT", slot: sampleSlot("b"), atIndex: 1 });
    expect(next.draft.slots.map((s) => (s.data as { text: string }).text)).toEqual(["a", "b", "c"]);
    expect(next.slotUids).toHaveLength(3);
    expect(next.slotUids[0]).toBe("seed-0");
    expect(next.slotUids[2]).toBe("seed-1");
  });

  it("DELETE removes slot and UID at the same index", () => {
    const state = seed([sampleSlot("a"), sampleSlot("b"), sampleSlot("c")]);
    const next = draftReducer(state, { type: "DELETE", index: 1 });
    expect(next.draft.slots.map((s) => (s.data as { text: string }).text)).toEqual(["a", "c"]);
    expect(next.slotUids).toEqual(["seed-0", "seed-2"]);
  });

  it("REORDER moves slot AND its UID (so the slot-card animation follows the slot)", () => {
    const state = seed([sampleSlot("a"), sampleSlot("b"), sampleSlot("c")]);
    const next = draftReducer(state, { type: "REORDER", fromIndex: 0, toIndex: 2 });
    expect(next.draft.slots.map((s) => (s.data as { text: string }).text)).toEqual(["b", "c", "a"]);
    expect(next.slotUids).toEqual(["seed-1", "seed-2", "seed-0"]);
  });

  it("DUPLICATE deep-clones data, inserts after source, gives the clone a fresh UID", () => {
    const state = seed([sampleSlot("a"), sampleSlot("b")]);
    const next = draftReducer(state, { type: "DUPLICATE", index: 0 });
    expect(next.draft.slots).toHaveLength(3);
    expect((next.draft.slots[1]?.data as { text: string }).text).toBe("a");
    expect(next.draft.slots[1]?.data).not.toBe(next.draft.slots[0]?.data); // deep-clone
    expect(next.slotUids[0]).toBe("seed-0");
    expect(next.slotUids[2]).toBe("seed-1");
    expect(next.slotUids[1]).not.toBe("seed-0"); // fresh UID for clone
  });

  it("REPLACE_FROM_JSON swaps draft AND regenerates ALL UIDs", () => {
    const state = seed([sampleSlot("a"), sampleSlot("b")]);
    const replacement = {
      slots: [sampleSlot("x"), sampleSlot("y"), sampleSlot("z")],
      date: "2026-06-01",
      meta: { foo: 1 },
    };
    const next = draftReducer(state, { type: "REPLACE_FROM_JSON", draft: replacement });
    expect(next.draft).toEqual(replacement);
    expect(next.slotUids).toHaveLength(3);
    // All UIDs are fresh — none should equal a seed UID
    expect(next.slotUids.some((u) => u === "seed-0" || u === "seed-1")).toBe(false);
  });

  it("SET_THEME updates meta.playgroundThemeId without touching slots/UIDs", () => {
    const state = seed([sampleSlot("a")]);
    const next = draftReducer(state, { type: "SET_THEME", themeId: "mono" });
    expect(next.draft.meta.playgroundThemeId).toBe("mono");
    expect(next.draft.slots).toBe(state.draft.slots); // reference unchanged
    expect(next.slotUids).toBe(state.slotUids);
  });

  it("DELETE of out-of-bounds index is a no-op (returns same reference)", () => {
    const state = seed([sampleSlot("a")]);
    const next = draftReducer(state, { type: "DELETE", index: 99 });
    expect(next).toBe(state);
  });

  it("REORDER with fromIndex === toIndex is a no-op", () => {
    const state = seed([sampleSlot("a"), sampleSlot("b")]);
    const next = draftReducer(state, { type: "REORDER", fromIndex: 0, toIndex: 0 });
    expect(next).toBe(state);
  });
});
