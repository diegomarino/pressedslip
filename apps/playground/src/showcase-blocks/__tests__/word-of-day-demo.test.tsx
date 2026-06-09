/**
 * @fileoverview Unit tests for wordOfDayDemoBlock — TextStyles per-slot + extras fallback.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { wordOfDayDemoBlock } from "../word-of-day-demo.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(textStylesOverride: Record<string, unknown> = {}): RenderContext {
  return {
    block: { index: 0, blockType: "wordOfDayDemo", data: {}, title: "T" },
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
        label: { fontSize: 12, color: "#a00" },
        body: { fontSize: 16 },
        emphasis: { fontStyle: "italic" },
        ...textStylesOverride,
      },
    },
    fontRoles: {},
  } as unknown as RenderContext;
}

describe("wordOfDayDemoBlock", () => {
  it("renders all 5 fields with their TextStyles applied (full fixture)", () => {
    const ctx = makeCtx({
      extras: { pronunciation: { fontSize: 12, fontStyle: "italic", color: "#666" } },
    });
    const element = wordOfDayDemoBlock.render({
      data: {
        word: "petrichor",
        type: "noun",
        definition: "The pleasant, earthy smell after rain on dry soil.",
        example: "The petrichor reminded her of summer mornings.",
        pronunciation: "/ˈpɛtrɪkɔːr/",
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("petrichor");
    expect(html).toContain("noun");
    expect(html).toContain("The pleasant, earthy smell after rain on dry soil.");
    expect(html).toContain("The petrichor reminded her of summer mornings.");
    expect(html).toContain("/ˈpɛtrɪkɔːr/");
    // display TextStyle on word
    expect(html).toContain("font-size:36");
    // label TextStyle on type
    expect(html).toContain("color:#a00");
    // emphasis TextStyle on example (italic)
    expect(html).toContain("font-style:italic");
  });

  it("omits the example span gracefully when `example` is absent", () => {
    const ctx = makeCtx();
    const element = wordOfDayDemoBlock.render({
      data: {
        word: "petrichor",
        type: "noun",
        definition: "The pleasant, earthy smell after rain on dry soil.",
        pronunciation: "/ˈpɛtrɪkɔːr/",
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("petrichor");
    expect(html).not.toContain("reminded her of summer mornings");
    // No font-style:italic (emphasis span absent)
    expect(html).not.toContain("font-style:italic");
  });

  it("falls back to label TextStyle when `extras.pronunciation` is undefined (ADR-0026 canonical-first-then-extras)", () => {
    // makeCtx() by default does NOT set extras.pronunciation → renders pronunciation
    // with the LABEL TextStyle as the documented fallback. No crash.
    const ctx = makeCtx();
    const element = wordOfDayDemoBlock.render({
      data: {
        word: "petrichor",
        type: "noun",
        definition: "The pleasant, earthy smell after rain on dry soil.",
        pronunciation: "/ˈpɛtrɪkɔːr/",
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("/ˈpɛtrɪkɔːr/");
    // Pronunciation got label color (#a00) because extras.pronunciation was undefined
    // → fallback to label slot. Asserts a SECOND occurrence of color:#a00 in addition
    // to the one on `type`.
    const matches = html.match(/color:#a00/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
