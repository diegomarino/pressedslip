/**
 * Streak block for use in Node render scripts. Mirrors
 * apps/playground/src/showcase-blocks/streak-demo.tsx but imports from the
 * Node entry point instead of pressedslip/browser.
 */
// biome-ignore lint/correctness/noUnusedImports: required for classic JSX transform — scripts/ is outside tsconfig include so esbuild uses the classic runtime
import React from "react";
import { type ZodType, z } from "zod";
import { applyTextStyle, defineBlock } from "../../src/index.js";

const streakSchema: ZodType<{ days: number; last7: boolean[]; label?: string }> = z.object({
  days: z.number().int().nonnegative(),
  last7: z.array(z.boolean()).length(7),
  label: z.string().optional(),
});

export const streakBlockNode = defineBlock({
  type: "streakDemo",
  schema: streakSchema,
  render: ({ data, ctx }) => {
    const displayStyle = applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles);
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    const dotColor = ctx.theme.textStyles.body?.color ?? "#000";
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <span style={displayStyle}>{data.days}</span>
          {data.label !== undefined && <span style={labelStyle}>{data.label}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
          {data.last7.map((filled, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: position-stable per data
              key={i}
              style={
                filled
                  ? { width: 16, height: 16, backgroundColor: dotColor }
                  : { width: 16, height: 16, border: `1px solid ${dotColor}` }
              }
            />
          ))}
        </div>
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.days` (non-negative int), `data.last7` (length 7 booleans)",
    "Tip: Set `data.label` for an inline caption beside the day count",
  ],
});
