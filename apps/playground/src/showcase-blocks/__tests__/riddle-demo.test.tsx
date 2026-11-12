/**
 * @fileoverview Unit tests for riddleDemoBlock — question upright, answer
 * rotated 180° on top of the theme's answer style.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { riddleDemoBlock } from "../riddle-demo.js";

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

describe("riddleDemoBlock", () => {
  it("rotates only the answer, whatever the theme", () => {
    const data = riddleDemoBlock.schema.parse({ question: "What has hands?", answer: "A clock" });
    const element = riddleDemoBlock.render({ data, ctx: makeCtx("riddleDemo") });
    // biome-ignore lint/style/noNonNullAssertion: render always returns an element
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("What has hands?");
    expect(html.match(/rotate\(180deg\)/g) ?? []).toHaveLength(1);
    expect(html).toMatch(/rotate\(180deg\)[^>]*>A clock</);
  });

  it("requires both question and answer", () => {
    expect(riddleDemoBlock.schema.safeParse({ question: "Q" }).success).toBe(false);
  });
});
