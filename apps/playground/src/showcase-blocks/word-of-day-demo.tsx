// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog.
import type { BlockDefinition } from "pressedslip/browser";
import { applyTextStyle, defineBlock } from "pressedslip/browser";
import { type ZodType, z } from "zod";

const wordOfDayDemoSchema: ZodType<{
  word: string;
  type: string;
  definition: string;
  example?: string | undefined;
  pronunciation?: string | undefined;
}> = z.object({
  word: z.string(),
  type: z.string(),
  definition: z.string(),
  example: z.string().optional(),
  pronunciation: z.string().optional(),
});

export type WordOfDayDemoData = z.infer<typeof wordOfDayDemoSchema>;

/**
 * Demo block — full 6-slot TextStyles surface (display, label, body, emphasis)
 * plus the `extras.pronunciation` extras pattern. Prefers extras.pronunciation
 * when defined; falls back to the `label` slot otherwise.
 */
export const wordOfDayDemoBlock: BlockDefinition<WordOfDayDemoData> = defineBlock({
  type: "wordOfDayDemo",
  schema: wordOfDayDemoSchema,
  render: ({ data, ctx }) => {
    const displayStyle = applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles);
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    const emphasisStyle = applyTextStyle(ctx.theme.textStyles.emphasis, ctx.fontRoles);
    // Prefer extras.pronunciation when the theme defines it; otherwise fall back
    // to the LABEL slot (semantically closest canonical). No crash either way.
    const pronStyle = applyTextStyle(
      ctx.theme.textStyles.extras?.pronunciation ?? ctx.theme.textStyles.label,
      ctx.fontRoles,
    );
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
        <div style={displayStyle}>{data.word}</div>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <span style={labelStyle}>{data.type}</span>
          {data.pronunciation !== undefined && <span style={pronStyle}>{data.pronunciation}</span>}
        </div>
        <div style={bodyStyle}>{data.definition}</div>
        {data.example !== undefined && <div style={emphasisStyle}>{data.example}</div>}
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.word`, `data.type`, `data.definition`",
    "Tip: Set `data.example` to render an italic-leaning usage line",
    "Tip: Set `data.pronunciation` to render IPA in the extras.pronunciation slot (falls back to label)",
  ],
});
