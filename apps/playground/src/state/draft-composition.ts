/**
 * @fileoverview DraftComposition + reducer. Spec §3.4: editor source of truth.
 *
 * DraftSlot mirrors the package's Slot shape MINUS the positional `index`
 * field (re-derived at render time from array position). Slots have no stable
 * identifier in the data model itself; the editor maintains a parallel
 * `slotUids: string[]` for React reconciliation in sortable slot-cards.
 * UIDs never reach the JSON pane — they're stripped on serialize and
 * regenerated on REPLACE_FROM_JSON.
 */
import { newSlotUid, regenerateSlotUids } from "./slot-uids.js";

/** What the user authors in the playground and what the JSON pane shows. */
export type DraftSlot = {
  blockType: string; // camelCase: "kpi", "textCell", "qaPair", "keyValue", "list", "quotation"
  data: unknown; // validated against the block's Zod schema at composeTree time
  title?: string;
};

/** Mirrors the package's Subject shape (src/types.ts). */
export type DraftSubject = { id: string; name: string };

export type DraftComposition = {
  slots: DraftSlot[];
  /** Conventionally YYYY-MM-DD; freeform string per package contract. Rendered top-right by ShellTop. */
  date: string;
  /** Optional subject shown alongside the date in ShellTop when present. */
  subject?: DraftSubject;
  meta: Record<string, unknown>;
};

/** Editor-internal state: the draft + the parallel UIDs array. */
export type EditorDraft = {
  draft: DraftComposition;
  slotUids: string[]; // .length === draft.slots.length, ALWAYS
};

export type DraftAction =
  | { type: "INSERT"; slot: DraftSlot; atIndex?: number } // default: append
  | { type: "DELETE"; index: number }
  | { type: "REORDER"; fromIndex: number; toIndex: number }
  | { type: "DUPLICATE"; index: number } // clones, inserts after original
  | { type: "REPLACE_FROM_JSON"; draft: DraftComposition }
  | { type: "SET_THEME"; themeId: string };

export function draftReducer(state: EditorDraft, action: DraftAction): EditorDraft {
  switch (action.type) {
    case "INSERT": {
      const at = action.atIndex ?? state.draft.slots.length;
      const slots = state.draft.slots.slice();
      const uids = state.slotUids.slice();
      slots.splice(at, 0, action.slot);
      uids.splice(at, 0, newSlotUid());
      return { draft: { ...state.draft, slots }, slotUids: uids };
    }
    case "DELETE": {
      if (action.index < 0 || action.index >= state.draft.slots.length) return state;
      const slots = state.draft.slots.slice();
      const uids = state.slotUids.slice();
      slots.splice(action.index, 1);
      uids.splice(action.index, 1);
      return { draft: { ...state.draft, slots }, slotUids: uids };
    }
    case "REORDER": {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= state.draft.slots.length ||
        toIndex < 0 ||
        toIndex >= state.draft.slots.length
      ) {
        return state;
      }
      const slots = state.draft.slots.slice();
      const uids = state.slotUids.slice();
      const [movedSlot] = slots.splice(fromIndex, 1);
      const [movedUid] = uids.splice(fromIndex, 1);
      if (movedSlot === undefined || movedUid === undefined) return state;
      slots.splice(toIndex, 0, movedSlot);
      uids.splice(toIndex, 0, movedUid);
      return { draft: { ...state.draft, slots }, slotUids: uids };
    }
    case "DUPLICATE": {
      if (action.index < 0 || action.index >= state.draft.slots.length) return state;
      const source = state.draft.slots[action.index];
      if (source === undefined) return state;
      const clone: DraftSlot = {
        blockType: source.blockType,
        data: structuredClone(source.data),
        ...(source.title !== undefined ? { title: source.title } : {}),
      };
      const slots = state.draft.slots.slice();
      const uids = state.slotUids.slice();
      slots.splice(action.index + 1, 0, clone);
      uids.splice(action.index + 1, 0, newSlotUid());
      return { draft: { ...state.draft, slots }, slotUids: uids };
    }
    case "REPLACE_FROM_JSON": {
      return {
        draft: action.draft,
        slotUids: regenerateSlotUids(action.draft.slots.length),
      };
    }
    case "SET_THEME": {
      return {
        ...state,
        draft: { ...state.draft, meta: { ...state.draft.meta, playgroundThemeId: action.themeId } },
      };
    }
  }
}

/** Initial editor state factory — wraps a DraftComposition with fresh UIDs. */
export function initialEditorDraft(draft: DraftComposition): EditorDraft {
  return { draft, slotUids: regenerateSlotUids(draft.slots.length) };
}
