/**
 * @fileoverview wordSearchBlock: render-only word-search grid. Caller provides
 * the pre-filled grid and word list; this block renders them with square monospace
 * cells at a normal 36px target (the grid grows with column count, shrinking only to
 * fit the paper width) and a 2-column word list below.
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
 * Renders a monospace grid (square cells at a normal 36px target that shrink to
 * fit `ctx.contentWidth` when needed, JetBrains Mono) bordered by `ctx.theme.separatorColor`,
 * with hidden words listed in two columns below. Grid construction is the caller's
 * responsibility — this block is render-only.
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
    // Cell sizing: cells default to a NORMAL size and the grid grows with the
    // column count (a 12-col puzzle is physically wider than a 6-col one). Only
    // when the grid would overflow the available content width do cells shrink to
    // fit, down to a MIN legibility floor. This is the inverse of a fill-the-paper
    // approach — small grids stay small, they don't stretch.
    const NORMAL_CELL = 36;
    const MIN_CELL = 16;
    const WRAPPER_PADDING = 8; // this block's own outer padding, per side (see wrapper below)
    // ctx.contentWidth is the usable width inside the shell's horizontal padding;
    // subtract this block's own wrapper padding to get the grid's budget. Schema
    // guarantees a non-empty rectangular grid, so grid[0] always exists.
    const cols = data.grid[0]?.length ?? 6;
    const availableWidth = ctx.contentWidth - 2 * WRAPPER_PADDING;
    const cellSize = Math.max(MIN_CELL, Math.min(NORMAL_CELL, Math.floor(availableWidth / cols)));
    // fontSize tracks cellSize at a 21/24 ratio (≈0.875) to preserve glyph fit while
    // keeping the letters comfortably large within each ruled cell.
    const cellFontSize = Math.round(cellSize * (21 / 24));
    // fontFamily/fontSize: identity intent — monospace alignment is non-negotiable for word-search.
    // Each cell draws its right + bottom edge; the container (below) draws top + left.
    // Shared edges therefore render exactly one 1px line — no doubled seams. Satori
    // defaults to border-box, so the inset borders don't change the cell's outer size.
    const cellStyle = {
      width: cellSize,
      height: cellSize,
      display: "flex" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      fontFamily: '"JetBrains Mono"',
      fontSize: cellFontSize,
      borderRightWidth: 1,
      borderRightStyle: "solid" as const,
      borderRightColor: ctx.theme.separatorColor,
      borderBottomWidth: 1,
      borderBottomStyle: "solid" as const,
      borderBottomColor: ctx.theme.separatorColor,
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
        {/* Grid container — draws only the top + left edges; cells supply right + bottom,
            so every row/column is separated by a single 1px ruled line (no doubled seams).
            Satori does not support the `border` shorthand — use individual properties. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: ctx.theme.separatorColor,
            borderLeftWidth: 1,
            borderLeftStyle: "solid",
            borderLeftColor: ctx.theme.separatorColor,
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
