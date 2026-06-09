/**
 * @fileoverview wordSearchBlock: render-only word-search grid. Caller provides
 * the pre-filled grid and word list; this block renders them with fixed 24×24px
 * monospace cells and a 2-column word list below.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

// No .default() in this schema — input and output types are identical, so ZodType<Output> is a sound annotation.
const wordSearchSchema: ZodType<{
  grid: string[][];
  words: string[];
}> = z
  .object({
    grid: z
      .array(z.array(z.string().length(1)))
      .min(6)
      .max(12),
    words: z.array(z.string().min(1)).min(1),
  })
  .refine(
    (data) => {
      const cols = data.grid[0]?.length ?? 0;
      return cols >= 6 && cols <= 12 && data.grid.every((row) => row.length === cols);
    },
    { message: "grid must be rectangular (all rows same length) and 6–12 columns wide" },
  );

/**
 * Data shape accepted by wordSearchBlock. `grid` is an NxM matrix of single
 * uppercase characters (6–12 rows, 6–12 cols, rectangular). `words` is the
 * list of hidden words displayed below the grid.
 */
export type WordSearchData = z.infer<typeof wordSearchSchema>;

/**
 * Built-in word-search grid block.
 *
 * Renders a fixed-size monospace grid (24×24px cells, JetBrains Mono 14px)
 * bordered by `ctx.theme.separatorColor`, with hidden words listed in two
 * columns below. Grid construction is the caller's responsibility — this block
 * is render-only.
 *
 * @example
 * ```ts
 * import { wordSearchBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([wordSearchBlock]);
 * // slot data: { grid: [["D","A","R","T",...], ...], words: ["DART", "CAT"] }
 * ```
 */
export const wordSearchBlock: BlockDefinition<WordSearchData> = defineBlock({
  type: "wordSearch",
  schema: wordSearchSchema,
  render: ({ data, ctx }) => {
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    // fontFamily/fontSize: identity intent — monospace alignment is non-negotiable for word-search.
    const cellStyle = {
      width: 24,
      height: 24,
      display: "flex" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      fontFamily: '"JetBrains Mono"',
      fontSize: 20,
    };
    const midpoint = Math.ceil(data.words.length / 2);
    const leftWords = data.words.slice(0, midpoint);
    const rightWords = data.words.slice(midpoint);

    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Grid container — outer border via separatorColor; no inter-cell gaps.
            Satori does not support the `border` shorthand — use individual properties. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: ctx.theme.separatorColor,
          }}
        >
          {data.grid.map((row, ri) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable per data
            <div key={ri} style={{ display: "flex", flexDirection: "row" }}>
              {row.map((cell, ci) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cell order is stable per data
                <div key={ci} style={cellStyle}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Word list: 2 columns, left-heavy split via Math.ceil */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            gap: 8,
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {leftWords.map((word, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: word order is stable per data
              <div key={i} style={bodyStyle}>
                {word}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {rightWords.map((word, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: word order is stable per data
              <div key={i} style={bodyStyle}>
                {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: [
    "Required: `data.grid` (string[][], 6–12 rows, 6–12 cols, rectangular)",
    "Required: `data.words` (string[], min 1)",
    "Note: grid must be caller-constructed; pressedslip does not generate puzzles",
    "Docs: docs/blocks/word-search.md",
  ],
});
