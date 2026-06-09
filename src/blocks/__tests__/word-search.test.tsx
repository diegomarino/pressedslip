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
  it("renders one cell per grid position (6×6 = 36 cells with width:24px)", () => {
    const ctx = makeCtx();
    const data: WordSearchData = { grid: basicGrid, words: ["DART"] };
    const element = wordSearchBlock.render({ data, ctx });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    const cellCount = (html.match(/width:24px/g) ?? []).length;
    // biome-ignore lint/style/noNonNullAssertion: basicGrid is a non-empty literal defined above
    expect(cellCount).toBe(basicGrid.length * basicGrid[0]!.length);
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

  it("renders grid container with explicit border-style:solid (Satori-safe, no shorthand)", () => {
    const ctx = makeCtx();
    const data: WordSearchData = { grid: basicGrid, words: ["DART"] };
    const element = wordSearchBlock.render({ data, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    // Satori does not support the `border` shorthand; individual properties are used.
    expect(html).toContain("border-style:solid");
    expect(html).toContain("border-width:1px");
  });
});
