/**
 * @fileoverview qaPairBlock: a question/answer pair with a deliberate
 * vertical gap between the two fields. Distinct from keyValueBlock in
 * visual grammar — equal typographic weight, paused not stacked.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

const qaPairSchema: ZodType<{ question: string; answer: string }> = z.object({
  question: z.string(),
  answer: z.string(),
});

/** Data shape accepted by qaPairBlock. */
export type QaPairData = z.infer<typeof qaPairSchema>;

/**
 * Built-in question/answer block.
 *
 * Renders `data.question` and `data.answer` in a 12 px gap column. Font sizes
 * are controlled by the theme's `question` and `answer` TextStyle slots
 * (defaults: 18 px each). Covers riddles, trivia, word-of-day, would-you-rather.
 *
 * @example
 * ```ts
 * import { qaPairBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([qaPairBlock]);
 * // slot data: { question: "What is the capital of France?", answer: "Paris" }
 * ```
 */
export const qaPairBlock: BlockDefinition<QaPairData> = defineBlock({
  type: "qaPair",
  schema: qaPairSchema,
  render: ({ data, ctx }) => {
    const questionStyle = applyTextStyle(ctx.theme.textStyles.question, ctx.fontRoles);
    const answerStyle = applyTextStyle(ctx.theme.textStyles.answer, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={questionStyle}>{data.question}</div>
        <div style={answerStyle}>{data.answer}</div>
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: ["Required: `data.question`, `data.answer`", "Docs: docs/blocks/qa-pair.md"],
});
