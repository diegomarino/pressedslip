/**
 * @fileoverview textCellBlock: a single text body with optional alignment.
 * fontSize is controlled via ctx.theme.textStyles.body.
 * Canonical example of decoration-via-schema-fields per docs/glossary.md.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

const textCellSchema: ZodType<{
  text: string;
  align?: "left" | "center" | "right" | "justify" | undefined;
}> = z.object({
  text: z.string(),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
});

/** Data shape accepted by textCellBlock. */
export type TextCellData = z.infer<typeof textCellSchema>;

/**
 * Map our `align` enum to flex `justifyContent`. Satori does not reliably honor
 * `textAlign` on flex items (parent BlockShell uses `display: flex`), so we
 * achieve alignment by making the text-cell itself a flex row and justifying
 * its single child span. `justify` (full text justification) has no flex
 * equivalent — degrades to left.
 */
const JUSTIFY_MAP: Record<
  NonNullable<TextCellData["align"]>,
  "flex-start" | "center" | "flex-end"
> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
  justify: "flex-start",
};

/**
 * Built-in single-body text block.
 *
 * Renders `data.text` in a full-width padded flex row. `data.align` controls
 * horizontal justification (left/center/right/justify; default: left). Font
 * size is controlled by the theme's `body` TextStyle slot. Canonical example
 * of decoration-via-schema-fields.
 *
 * @example
 * ```ts
 * import { textCellBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([textCellBlock]);
 * // slot data: { text: "Good morning!", align: "center" }
 * ```
 */
export const textCellBlock: BlockDefinition<TextCellData> = defineBlock({
  type: "textCell",
  schema: textCellSchema,
  render: ({ data, ctx }) => {
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          justifyContent: JUSTIFY_MAP[data.align ?? "left"],
          ...bodyStyle,
        }}
      >
        <span>{data.text}</span>
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: [
    "Required: `data.text`",
    "Values of `data.align`: left|center|right|justify",
    "Docs: docs/blocks/text-cell.md",
  ],
});
