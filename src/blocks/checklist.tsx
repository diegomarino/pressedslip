/**
 * @fileoverview checklistBlock: a list of items, each preceded by an empty
 * checkbox. Items are plain strings (no checked state); the box is drawn by
 * theme tokens (`checkbox*`) so themes pick a drawn box or an ASCII glyph.
 */
import type { ReactElement } from "react";
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { ShellTheme } from "../themes/types.js";
import type { BlockDefinition } from "../types.js";

// No .default() in this schema — input and output types are identical.
const checklistSchema: ZodType<{ items: string[] }> = z.object({
  items: z.array(z.string()).min(1),
});

/** Data shape accepted by checklistBlock: one string per checklist item. */
export type ChecklistData = z.infer<typeof checklistSchema>;

/** Line-height multiplier assumed for body text when the theme sets none. */
const ASSUMED_LINE_HEIGHT = 1.2;

/**
 * Renders one checklist row. Kept as a per-item function so a later item
 * shape (e.g. `string | { text, checked }`) stays an additive change.
 */
function renderItem(
  text: string,
  shell: Required<ShellTheme>,
  bodyStyle: ReturnType<typeof applyTextStyle>,
  key: number,
): ReactElement {
  const fontSize = shell.textStyles.body?.fontSize ?? 20;
  const lineHeight = shell.textStyles.body?.lineHeight ?? ASSUMED_LINE_HEIGHT;
  // Centre the drawn box on the FIRST text line (row is flex-start aligned, so
  // a wrapped item keeps its box at the top, not the vertical middle).
  const boxOffset = Math.max(0, Math.round((fontSize * lineHeight - shell.checkboxSize) / 2));
  const box =
    shell.checkboxStyle === "text" ? (
      <div style={{ ...bodyStyle, paddingRight: shell.listItemGap, flexShrink: 0 }}>
        {shell.checkboxGlyph}
      </div>
    ) : (
      // paddingRight (not flex `gap`) — same Satori wrap-stability reason as
      // list.tsx; flexShrink:0 stops Yoga's wrap re-measure eating the gap.
      <div style={{ display: "flex", paddingRight: shell.listItemGap, flexShrink: 0 }}>
        <div
          style={{
            width: shell.checkboxSize,
            height: shell.checkboxSize,
            marginTop: boxOffset,
            borderStyle: "solid",
            borderWidth: shell.checkboxBorderWidth,
            borderColor: shell.checkboxColor,
            borderRadius: shell.checkboxRadius,
          }}
        />
      </div>
    );
  return (
    <div
      key={key}
      style={{
        ...bodyStyle,
        display: "flex",
        flexDirection: "row",
        // Safe flex-row idiom (see list.tsx / docs/guide/custom-block-walkthrough.md).
        width: "100%",
        alignItems: "flex-start",
      }}
    >
      {box}
      <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, width: "100%" }}>{text}</div>
    </div>
  );
}

/**
 * Built-in checklist block.
 *
 * Renders each string as a row with an empty checkbox followed by the text.
 * The checkbox is drawn (`checkboxStyle: "box"`) or an ASCII glyph
 * (`"text"`), per the theme's `checkbox*` tokens.
 *
 * @example
 * ```ts
 * import { checklistBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([checklistBlock]);
 * // slot data: { items: ["Keys", "Wallet", "Phone"] }
 * ```
 */
export const checklistBlock: BlockDefinition<ChecklistData> = defineBlock({
  type: "checklist",
  schema: checklistSchema,
  render: ({ data, ctx }) => {
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {data.items.map((text, i) => renderItem(text, ctx.theme, bodyStyle, i))}
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: [
    "Required: `data.items` (min 1 string)",
    "Tip: items are plain strings; long items wrap",
    "Docs: docs/blocks/checklist.md",
  ],
});
