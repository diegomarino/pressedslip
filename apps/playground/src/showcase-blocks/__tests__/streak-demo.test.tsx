/**
 * @fileoverview Unit tests for streakDemoBlock — display + label TextStyles
 * + 7 box-model div dots using body color.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { streakDemoBlock } from "../streak-demo.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(): RenderContext {
  return {
    block: { index: 0, blockType: "streakDemo", data: {}, title: "T" },
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
      textStyles: {
        ...SHELL_DEFAULTS.textStyles,
        display: { fontSize: 36, fontWeight: 700 },
        label: { fontSize: 12 },
        body: { fontSize: 16, color: "#111" },
      },
    },
    fontRoles: {},
  } as unknown as RenderContext;
}

describe("streakDemoBlock", () => {
  it("renders 7 dots with 5 filled + 2 empty for mixed last7", () => {
    const ctx = makeCtx();
    const element = streakDemoBlock.render({
      data: {
        days: 12,
        last7: [true, true, false, true, true, true, false],
        label: "deep work mornings",
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("12");
    expect(html).toContain("deep work mornings");
    // 5 filled dots → 5 occurrences of background-color:#111
    const filled = html.match(/background-color:#111/g) ?? [];
    expect(filled.length).toBe(5);
    // 2 empty dots → 2 occurrences of border:1px solid #111 (or similar)
    const empty = html.match(/border:1px solid #111/g) ?? [];
    expect(empty.length).toBe(2);
  });

  it("renders 7 empty dots with no filled background when last7 is all false", () => {
    const ctx = makeCtx();
    const element = streakDemoBlock.render({
      data: {
        days: 0,
        last7: [false, false, false, false, false, false, false],
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("0");
    const filled = html.match(/background-color:#111/g) ?? [];
    expect(filled.length).toBe(0);
    const empty = html.match(/border:1px solid #111/g) ?? [];
    expect(empty.length).toBe(7);
  });
});
