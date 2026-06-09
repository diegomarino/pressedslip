/**
 * @fileoverview Transient React-key UIDs for sortable slot-cards. Stays
 * out of the JSON pane — UIDs are an editor-internal reconciliation aid,
 * not part of DraftSlot. Spec §3.4 invariant: slotUids.length === slots.length.
 */
let counter = 0;

/** Generate a new UID. Caller is responsible for appending it to the parallel array. */
export function newSlotUid(): string {
  counter += 1;
  return `uid-${counter}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate N fresh UIDs (used after REPLACE_FROM_JSON when slot count is known). */
export function regenerateSlotUids(count: number): string[] {
  return Array.from({ length: count }, () => newSlotUid());
}
