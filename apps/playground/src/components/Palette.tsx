/**
 * @fileoverview Palette pane — drag source. Lists variants grouped by block
 * type. Each card is a @dnd-kit draggable. Spec §5.3.
 *
 * Variant.slot is a DraftSlot (no `index`/`key` — those don't exist in the
 * package's data model). The reducer adds the slot to the draft; positional
 * index is re-derived at render time.
 */

import { useDraggable } from "@dnd-kit/core";
import type { JSX } from "react";
import { type Variant, variantsByBlock } from "../variants/index.js";

type PaletteProps = {
  /** Append the variant's slot to the end of the builder. Invoked on single-click as a shortcut alongside drag-and-drop. */
  onAddVariant: (variant: Variant) => void;
};

export function Palette({ onAddVariant }: PaletteProps): JSX.Element {
  return (
    <div className="palette">
      {variantsByBlock.map(({ blockType, label, variants }) => (
        <div key={blockType} className="palette-group">
          <h3 className="palette-group-label">{label}</h3>
          {variants.map((v) => (
            <DraggableVariant key={v.id} variant={v} onAddVariant={onAddVariant} />
          ))}
        </div>
      ))}
    </div>
  );
}

function DraggableVariant({
  variant,
  onAddVariant,
}: {
  variant: Variant;
  onAddVariant: (variant: Variant) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${variant.id}`,
    data: { source: "palette", variant },
  });
  return (
    // biome-ignore lint/a11y/useSemanticElements: palette card is a draggable source; <button> is not appropriate here
    <div
      ref={setNodeRef}
      className={`palette-card${isDragging ? " dragging" : ""}`}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-roledescription="draggable"
      aria-describedby="dnd-instructions"
      onClick={() => onAddVariant(variant)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onAddVariant(variant);
      }}
    >
      {variant.label}
    </div>
  );
}
