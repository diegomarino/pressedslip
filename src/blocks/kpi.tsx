/**
 * @fileoverview kpiBlock: a generic stat-card primitive — a large prominent
 * value with optional label above and caption below. Domain-agnostic by design
 * — no assumptions about units, currency, or domain.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

const kpiSchema: ZodType<{
  value: string;
  label?: string | undefined;
  caption?: string | undefined;
}> = z.object({
  value: z.string(),
  label: z.string().optional(),
  caption: z.string().optional(),
});

/** Data shape accepted by kpiBlock. */
export type KpiData = z.infer<typeof kpiSchema>;

/**
 * Built-in stat-card block.
 *
 * Renders `data.value` bold at the theme's `display` font size (default 36 px)
 * with an optional `data.label` eyebrow (uppercase, letter-spaced) above and
 * an optional `data.caption` footnote (label size) below.
 *
 * @example
 * ```ts
 * import { kpiBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([kpiBlock]);
 * // slot data: { label: "Temp", value: "22°C", caption: "Feels like 20°C" }
 * ```
 */
export const kpiBlock: BlockDefinition<KpiData> = defineBlock({
  type: "kpi",
  schema: kpiSchema,
  render: ({ data, ctx }) => {
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    const displayStyle = applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        {data.label !== undefined && (
          // letterSpacing:1 + uppercase = "eyebrow" intent: restrained visual
          // hierarchy below the large value, identity-defining treatment
          <div style={{ ...labelStyle, letterSpacing: 1, textTransform: "uppercase" }}>
            {data.label}
          </div>
        )}
        {/* lineHeight:1.1 comes from display slot default; fontWeight:700 = identity intent */}
        <div style={{ ...displayStyle, fontWeight: 700 }}>{data.value}</div>
        {data.caption !== undefined && <div style={labelStyle}>{data.caption}</div>}
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: [
    "Required: `data.value`",
    "Tip: Set `data.label` for an uppercase eyebrow above the value",
    "Tip: Remove `data.caption` to collapse layout to two lines",
    "Docs: docs/blocks/kpi.md",
  ],
});
