/** @jsxRuntime automatic */
/** @jsxImportSource react */
/**
 * Pattern: a custom block that reuses theme text styles and prints the answer
 * upside down, so the reader flips the paper. Adapted from marplanner's riddle
 * block (MIT).
 *
 * Copy into your project, then:
 *   npx tsx <skill>/scripts/render.mjs slip.json --blocks ./riddle-block.tsx
 * with a slot like { "blockType": "riddle", "title": "RIDDLE", "data": { "question": "…", "answer": "…" } }
 *
 * No custom block needed if you only want qaPair upside down: override the
 * theme's `answer` text style with `rotate: 180` (see upside-down-theme.mjs).
 */
import { applyTextStyle, type BlockDefinition, defineBlock } from "pressedslip";
import { type ZodType, z } from "zod";

type RiddleData = { question: string; answer: string };

const schema: ZodType<RiddleData> = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const riddleBlock: BlockDefinition<RiddleData> = defineBlock({
  type: "riddle",
  schema,
  render: ({ data, ctx }) => {
    const question = applyTextStyle(ctx.theme.textStyles.question, ctx.fontRoles);
    // Only 0 and 180 are safe: other angles swap the bounding box in Satori.
    const answer = applyTextStyle({ ...ctx.theme.textStyles.answer, rotate: 180 }, ctx.fontRoles);
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={question}>{data.question}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={answer}>{data.answer}</div>
        </div>
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: ["Required: `data.question`, `data.answer`", "Tip: the answer prints upside down"],
});

export const blocks = [riddleBlock];

export const exampleSlots = [
  {
    blockType: "riddle",
    title: "RIDDLE",
    data: { question: "What has keys but can't open locks?", answer: "A piano" },
  },
];
