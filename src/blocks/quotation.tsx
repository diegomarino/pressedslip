/**
 * @fileoverview quotationBlock: a quoted body with optional attribution.
 * Two-slot grammar — italic body, attribution right-aligned below.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

const quotationSchema: ZodType<{
  text: string;
  attribution?: string | undefined;
}> = z.object({
  text: z.string(),
  attribution: z.string().optional(),
});

/** Data shape accepted by quotationBlock. */
export type QuotationData = z.infer<typeof quotationSchema>;

/**
 * Built-in quotation block.
 *
 * Renders `data.text` in italic at the theme's `emphasis` font size with
 * curly-quote wrapping, followed by `data.attribution` right-aligned at the
 * theme's `label` font size, prefixed with "— " when present.
 *
 * @example
 * ```ts
 * import { quotationBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([quotationBlock]);
 * // slot data: { text: "The only way to do great work is to love what you do.", attribution: "Steve Jobs" }
 * ```
 */
export const quotationBlock: BlockDefinition<QuotationData> = defineBlock({
  type: "quotation",
  schema: quotationSchema,
  render: ({ data, ctx }) => {
    const emphasisStyle = applyTextStyle(ctx.theme.textStyles.emphasis, ctx.fontRoles);
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {/* fontStyle:"italic" = identity intent: quotation text is always italic */}
        <div style={{ ...emphasisStyle, fontStyle: "italic" }}>{`"${data.text}"`}</div>
        {data.attribution !== undefined && (
          <div
            style={{
              ...labelStyle,
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            {`— ${data.attribution}`}
          </div>
        )}
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: [
    "Required: `data.text`",
    "Tip: Set `data.attribution` to render an em-dash byline right-aligned below the quote",
    "Docs: docs/blocks/quotation.md",
  ],
});
