/**
 * @fileoverview keyValueBlock: a label/value pair with typographic emphasis
 * on the label. Cardinality-1 pair distinct from listBlock — fixed structure,
 * no array.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

const keyValueSchema: ZodType<{ label: string; value: string }> = z.object({
  label: z.string(),
  value: z.string(),
});

/** Data shape accepted by keyValueBlock. */
export type KeyValueData = z.infer<typeof keyValueSchema>;

/**
 * Built-in label/value block.
 *
 * Renders `data.label` in bold at the theme's `label` font size above
 * `data.value` at the theme's `body` font size (defaults: 14 px / 16 px),
 * stacked vertically with an 8 px gap. Use for single-pair facts.
 *
 * @example
 * ```ts
 * import { keyValueBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([keyValueBlock]);
 * // slot data: { label: "Temperature", value: "22°C" }
 * ```
 */
export const keyValueBlock: BlockDefinition<KeyValueData> = defineBlock({
  type: "keyValue",
  schema: keyValueSchema,
  render: ({ data, ctx }) => {
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* fontWeight:700 = identity intent: label is the emphasized key in a pair */}
        <div style={{ ...labelStyle, fontWeight: 700 }}>{data.label}</div>
        <div style={bodyStyle}>{data.value}</div>
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: ["Required: `data.label`, `data.value`", "Docs: docs/blocks/key-value.md"],
});
