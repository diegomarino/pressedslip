/**
 * @fileoverview Unit tests for phonicsDemoBlock — schema invariant, font
 * fitting from contentWidth, and dot/dash sound buttons per grapheme.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PHONICS_MAX_FONT_PX,
  phonicsAdvanceEm,
  phonicsDemoBlock,
  phonicsFontSize,
} from "../phonics-demo.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(blockType: string): RenderContext {
  return {
    block: { index: 0, blockType, data: {}, title: "T" },
    composition: {
      id: "test",
      version: 1,
      date: "2026-05-31",
      status: "ready",
      slots: [],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    },
    logger: { info: noop, warn: noop, error: noop },
    theme: {
      ...SHELL_DEFAULTS,
      textStyles: { ...SHELL_DEFAULTS.textStyles, body: { fontSize: 16, color: "#111" } },
    },
    fontRoles: {},
    contentWidth: 544,
  } as unknown as RenderContext;
}

function render(data: unknown): string {
  const parsed = phonicsDemoBlock.schema.parse(data);
  const element = phonicsDemoBlock.render({ data: parsed, ctx: makeCtx("phonicsDemo") });
  // biome-ignore lint/style/noNonNullAssertion: render always returns an element
  return renderToStaticMarkup(element!);
}

describe("phonicsDemoBlock", () => {
  it("rejects graphemes that don't join back into the word", () => {
    const r = phonicsDemoBlock.schema.safeParse({
      words: [{ word: "ship", graphemes: ["s", "ip"] }],
    });
    expect(r.success).toBe(false);
  });

  it("caps short words and shrinks long ones to fit", () => {
    const short = [{ word: "cat", graphemes: ["c", "a", "t"] }];
    expect(phonicsFontSize(short, 544)).toBe(PHONICS_MAX_FONT_PX);
    const long = [{ word: "elephants", graphemes: ["e", "l", "e", "ph", "a", "n", "t", "s"] }];
    const size = phonicsFontSize(long, 544);
    expect(size).toBeLessThan(PHONICS_MAX_FONT_PX);
    expect(size * 9 * 0.66).toBeLessThanOrEqual(544 - 16);
  });

  it("budgets a full em for wide letters so WWWW stays on the paper", () => {
    const wide = [{ word: "WWWW", graphemes: ["W", "W", "W", "W"] }];
    const size = phonicsFontSize(wide, 544);
    // Inter's W advances ~0.96 em; four of them must fit the 528 px inner width.
    expect(size * 4 * 0.96).toBeLessThanOrEqual(544 - 16);
    expect(size).toBeLessThan(PHONICS_MAX_FONT_PX);
  });

  it("never estimates below the monospaced 0.6 em advance", () => {
    for (const c of ["i", "l", "'", "é", "Ñ", "m", "W", "😀"]) {
      expect(phonicsAdvanceEm(c)).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("draws a dot per letter and a stretched dash per digraph", () => {
    const html = render({ words: [{ word: "night", graphemes: ["n", "igh", "t"] }] });
    expect(html.match(/align-self:stretch/g) ?? []).toHaveLength(1);
    expect(html.match(/background-color:#111/g) ?? []).toHaveLength(3);
  });

  it("prints tricky words without marks", () => {
    const html = render({ words: [{ word: "the", graphemes: ["the"], tricky: true }] });
    expect(html).toContain("the");
    expect(html).not.toContain("background-color");
  });
});
