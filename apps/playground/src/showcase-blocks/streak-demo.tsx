// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog.
import type { BlockDefinition } from "pressedslip/browser";
import { applyTextStyle, defineBlock } from "pressedslip/browser";
import { type ZodType, z } from "zod";

const streakDemoSchema: ZodType<{
  days: number;
  last7: boolean[];
  label?: string | undefined;
}> = z.object({
  days: z.number().int().nonnegative(),
  last7: z.array(z.boolean()).length(7),
  label: z.string().optional(),
});

export type StreakDemoData = z.infer<typeof streakDemoSchema>;

/**
 * Demo block — display TextStyle for the day count + label TextStyle for the
 * optional caption + 7 box-model div dots. Box-model (background-color / border)
 * is portable across themes; glyph-based dot chars depend on font coverage.
 */
export const streakDemoBlock: BlockDefinition<StreakDemoData> = defineBlock({
  type: "streakDemo",
  schema: streakDemoSchema,
  render: ({ data, ctx }) => {
    const displayStyle = applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles);
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    // Box-model dots derive their fill color from the body TextStyle's `color`
    // so they track the active theme. Fallback to #000 if the theme leaves
    // `body.color` unset.
    const dotColor = ctx.theme.textStyles.body?.color ?? "#000";
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
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
