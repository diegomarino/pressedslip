/**
 * @fileoverview Builder pane — drop target + sortable list of slot cards.
 * Handles palette→insert, builder→reorder, ×→delete, ⎘→duplicate.
 * Keyboard a11y via @dnd-kit KeyboardSensor. Spec §5.4.
 */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type JSX, useCallback, useEffect, useRef } from "react";
import type { DraftSlot } from "../state/draft-composition.js";

type BuilderProps = {
  slots: DraftSlot[];
  slotUids: string[]; // .length === slots.length (invariant)
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  /** UID of a slot to briefly highlight + scroll-into-view (e.g., just-added via palette double-click). */
  highlightUid: string | null;
};

export function Builder({
  slots,
  slotUids,
  onDelete,
  onDuplicate,
  highlightUid,
}: BuilderProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: "builder-drop" });
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerCard = useCallback((uid: string, el: HTMLDivElement | null) => {
    if (el === null) cardRefs.current.delete(uid);
    else cardRefs.current.set(uid, el);
  }, []);

  // When a slot is freshly added (or otherwise asked-to-highlight), bring it
  // into the builder viewport. The Builder pane itself is a scroll container
  // (overflow-y: auto in App.css), so this scrolls within the pane, not the
  // whole page.
  useEffect(() => {
    if (highlightUid === null) return;
    const el = cardRefs.current.get(highlightUid);
    if (el !== undefined) el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [highlightUid]);

  return (
    <div ref={setNodeRef} className={`builder${isOver ? " over" : ""}`}>
      <h2 className="builder-title">Builder</h2>
      <SortableContext items={slotUids} strategy={verticalListSortingStrategy}>
        {slots.map((slot, i) => {
          // biome-ignore lint/style/noNonNullAssertion: slotUids.length === slots.length per spec §3.4
          const uid = slotUids[i]!;
          return (
            <SlotCard
              key={uid}
              uid={uid}
              index={i}
              slot={slot}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              isHighlighted={uid === highlightUid}
              registerCard={registerCard}
            />
          );
        })}
      </SortableContext>
      <div id="dnd-instructions" className="sr-only">
        Press space to grab, arrow keys to move, space to drop, escape to cancel. Press Delete to
        remove. Press Cmd or Ctrl+D to duplicate.
      </div>
    </div>
  );
}

function SlotCard({
  uid,
  index,
  slot,
  onDelete,
  onDuplicate,
  isHighlighted,
  registerCard,
}: {
  uid: string;
  index: number;
  slot: DraftSlot;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  isHighlighted: boolean;
  registerCard: (uid: string, el: HTMLDivElement | null) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: uid,
  });
  // Combine @dnd-kit's setNodeRef with our own card-registry ref so the
  // parent Builder can scroll-into-view + apply transient highlight.
  const setCombinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      registerCard(uid, el);
    },
    [setNodeRef, registerCard, uid],
  );
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete") {
      e.preventDefault();
      onDelete(index);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      onDuplicate(index);
    }
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: slot card hosts nested <button> children (delete/duplicate); a real <button> would produce invalid nested-button HTML
    <div
      ref={setCombinedRef}
      style={style}
      className={`slot-card${isHighlighted ? " slot-card-flash" : ""}`}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-roledescription="draggable"
      aria-describedby="dnd-instructions"
      aria-label={`Slot ${index}, ${slot.blockType}${slot.title !== undefined ? `, ${slot.title}` : ""}`}
      onKeyDown={onKeyDown}
    >
      <span className="slot-handle" aria-hidden>
        ⋮⋮
      </span>
      <span className="slot-title">
        #{index} · {slot.blockType}
        {slot.title !== undefined ? ` · ${slot.title}` : ""}
      </span>
      <button
        type="button"
        className="slot-action"
        aria-label={`Duplicate slot ${index}`}
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(index);
        }}
      >
        ⎘
      </button>
      <button
        type="button"
        className="slot-action slot-action-delete"
        aria-label={`Delete slot ${index}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(index);
        }}
      >
        ×
      </button>
    </div>
  );
}
