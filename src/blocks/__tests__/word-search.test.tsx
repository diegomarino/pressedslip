/**
 * @fileoverview Unit tests for wordSearchBlock — schema validation and render behavior.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHELL_DEFAULTS } from "../../themes/apply-defaults.js";
import type { RenderContext } from "../../types.js";
import type { WordSearchData } from "../word-search.js";
import { wordSearchBlock } from "../word-search.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

/** Minimal RenderContext stub for wordSearchBlock render tests. */
function makeCtx(themeOverrides: Partial<typeof SHELL_DEFAULTS> = {}): RenderContext {
  return {
    block: { index: 0, blockType: "wordSearch", data: {}, title: "T" },
    composition: {
      id: "test",
      version: 1,
      date: "2026-06-07",
      status: "ready",
      slots: [],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    },
    logger: { debug: noop, info: noop, warn: noop, error: noop },
    theme: { ...SHELL_DEFAULTS, ...themeOverrides },
    fontRoles: {},
    contentWidth: 528, // thermal-80 (576) minus 2×24px shell padding; cells size against this
  } as unknown as RenderContext;
}

/** 6×6 grid with 4 hidden words — same grid as the fixture. */
const basicGrid: string[][] = [
  ["D", "A", "R", "T", "B", "C"],
  ["F", "C", "A", "T", "G", "H"],
  ["D", "O", "G", "L", "M", "N"],
  ["S", "U", "N", "P", "Q", "R"],
  ["B", "C", "F", "V", "W", "X"],
  ["Y", "Z", "B", "C", "D", "F"],
];

describe("wordSearchBlock — schema validation", () => {
  it("rejects jagged grids (rows of different lengths)", () => {
    const result = wordSearchBlock.schema.safeParse({
      grid: [
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E"], // 5 cols, differs from 6
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
      ],
      words: ["HELLO"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects grids with fewer than 6 rows", () => {
    const result = wordSearchBlock.schema.safeParse({
      grid: [
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
        ["A", "B", "C", "D", "E", "F"],
        // only 5 rows
      ],
      words: ["HELLO"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects grids with fewer than 6 columns", () => {
    const result = wordSearchBlock.schema.safeParse({
      grid: Array.from({ length: 6 }, () => ["A", "B", "C", "D", "E"]), // 5 cols
      words: ["HELLO"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects grids with more than 12 rows", () => {
    const result = wordSearchBlock.schema.safeParse({
      grid: Array.from({ length: 13 }, () => ["A", "B", "C", "D", "E", "F"]),
      words: ["HELLO"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects grids with more than 12 columns", () => {
    const result = wordSearchBlock.schema.safeParse({
      grid: Array.from({ length: 6 }, () => Array.from({ length: 13 }, () => "A")),
      words: ["HELLO"],
    });
    expect(result.success).toBe(false);
  });
});

describe("wordSearchBlock — render", () => {
  it("renders one cell per grid position at the NORMAL cell size when it fits (6 cols → 36px)", () => {
    const ctx = makeCtx();
    const data: WordSearchData = { grid: basicGrid, words: ["DART"] };
    const element = wordSearchBlock.render({ data, ctx });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: basicGrid is a non-empty literal defined above
    const cols = basicGrid[0]!.length;
    // Mirror the block's sizing: NORMAL 36px, shrinking only if it overflows
    // (availableWidth = ctx.contentWidth − 16 own wrapper). 6 cols on 528 stays 36px.
    const cellSize = Math.max(16, Math.min(36, Math.floor((ctx.contentWidth - 16) / cols)));
    expect(cellSize).toBe(36);
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    const cellCount = (html.match(new RegExp(`width:${cellSize}px`, "g")) ?? []).length;
    expect(cellCount).toBe(basicGrid.length * cols);
  });

  it("shrinks cells below NORMAL when the grid would overflow a narrow paper width", () => {
    // 12 cols on a 58mm-class paper (384px): contentWidth = 384−48 = 336;
    // availableWidth = 336−16 = 320; floor(320/12) = 26px.
    const ctx = makeCtx();
    (ctx as { contentWidth: number }).contentWidth = 384 - 48;
    const wideGrid: string[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 12 }, () => "A"),
    );
    const data: WordSearchData = { grid: wideGrid, words: ["AA"] };
    const element = wordSearchBlock.render({ data, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    const availableWidth = ctx.contentWidth - 16;
    const expected = Math.max(16, Math.min(36, Math.floor(availableWidth / 12)));
    expect(expected).toBe(26);
    expect(html).toContain(`width:${expected}px`);
    // And the grid must fit inside the available content width.
    expect(expected * 12).toBeLessThanOrEqual(availableWidth);
  });

  it("renders grid cells with JetBrains Mono font family (identity intent)", () => {
    const ctx = makeCtx();
    const data: WordSearchData = { grid: basicGrid, words: ["DART"] };
    const element = wordSearchBlock.render({ data, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("JetBrains Mono");
  });

  it("splits 5-word list into 3 left + 2 right (left-heavy, Math.ceil)", () => {
    const ctx = makeCtx();
    // left: [DART, CAT, DOG], right: [SUN, RAT] — DOG must appear before SUN in DOM
    const data: WordSearchData = {
      grid: basicGrid,
      words: ["DART", "CAT", "DOG", "SUN", "RAT"],
    };
    const element = wordSearchBlock.render({ data, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("SUN");
    expect(html).toContain("RAT");
    // DOG is the last word in the left column; SUN is the first in the right.
    // Left column is serialized before right column, so indexOf(DOG) < indexOf(SUN).
    expect(html.indexOf("DOG")).toBeLessThan(html.indexOf("SUN"));
  });

  it("renders ruled gridlines via per-side borders (Satori-safe, no shorthand)", () => {
    const ctx = makeCtx();
    const data: WordSearchData = { grid: basicGrid, words: ["DART"] };
    const element = wordSearchBlock.render({ data, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    // Satori has no `border` shorthand: container draws top+left, cells draw right+bottom.
    expect(html).toContain("border-top-style:solid");
    expect(html).toContain("border-left-width:1px");
    expect(html).toContain("border-right-style:solid");
    expect(html).toContain("border-bottom-width:1px");
  });

  it("draws an inter-cell gridline on every cell (right + bottom edge)", () => {
    const ctx = makeCtx();
    const data: WordSearchData = { grid: basicGrid, words: ["DART"] };
    const element = wordSearchBlock.render({ data, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    // biome-ignore lint/style/noNonNullAssertion: basicGrid is a non-empty literal defined above
    const cellCount = basicGrid.length * basicGrid[0]!.length;
    expect((html.match(/border-right-width:1px/g) ?? []).length).toBe(cellCount);
    expect((html.match(/border-bottom-width:1px/g) ?? []).length).toBe(cellCount);
  });
});
