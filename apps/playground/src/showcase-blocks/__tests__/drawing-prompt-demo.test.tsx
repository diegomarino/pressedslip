/**
 * @fileoverview Unit tests for drawingPromptDemoBlock — prompt text plus a
 * dashed frame whose height defaults to 300 px.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { drawingPromptDemoBlock } from "../drawing-prompt-demo.js";

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

describe("drawingPromptDemoBlock", () => {
  it("renders the prompt and a dashed 300 px frame by default", () => {
    const data = drawingPromptDemoBlock.schema.parse({ prompt: "Draw a cat." });
    const element = drawingPromptDemoBlock.render({ data, ctx: makeCtx("drawingPromptDemo") });
    // biome-ignore lint/style/noNonNullAssertion: render always returns an element
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("Draw a cat.");
    expect(html).toContain("border:2px dashed #111");
    expect(html).toContain("height:300px");
  });

  it("rejects frames outside 80–800 px", () => {
    expect(drawingPromptDemoBlock.schema.safeParse({ prompt: "x", height: 20 }).success).toBe(
      false,
    );
  });
});
