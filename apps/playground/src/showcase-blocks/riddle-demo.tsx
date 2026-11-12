/** @jsxRuntime automatic */
/** @jsxImportSource react */
// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog. The JSX pragmas let Node scripts (scripts/docs/) render this file
// with the automatic runtime too.
import type { BlockDefinition } from "pressedslip/browser";
import { applyTextStyle, defineBlock } from "pressedslip/browser";
import { type ZodType, z } from "zod";

const riddleDemoSchema: ZodType<{ question: string; answer: string }> = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export type RiddleDemoData = z.infer<typeof riddleDemoSchema>;

/**
 * Demo block — a riddle whose answer prints upside down, so the reader has to
 * flip the paper. The rotation is block-local intent: the theme's `answer`
 * style is spread and `rotate: 180` added on top, so it works under every
 * theme. (The builtin `qaPair` gets the same effect from a theme override:
 * `shell.textStyles.answer.rotate = 180`.)
 */
export const riddleDemoBlock: BlockDefinition<RiddleDemoData> = defineBlock({
  type: "riddleDemo",
  schema: riddleDemoSchema,
  render: ({ data, ctx }) => {
    const questionStyle = applyTextStyle(ctx.theme.textStyles.question, ctx.fontRoles);
    const answerStyle = applyTextStyle(
      { ...ctx.theme.textStyles.answer, rotate: 180 },
      ctx.fontRoles,
    );
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={questionStyle}>{data.question}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={answerStyle}>{data.answer}</div>
        </div>
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.question`, `data.answer`",
    "Tip: the answer always prints upside down (rotate: 180) — flip the paper to read it",
  ],
});
