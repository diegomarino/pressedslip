/**
 * @fileoverview Unit tests for onThisDayDemoBlock — conditional sections +
 * listItemBullet theme-token adoption.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { onThisDayDemoBlock } from "../on-this-day-demo.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(themeOverride: Partial<typeof SHELL_DEFAULTS> = {}): RenderContext {
  return {
    block: { index: 0, blockType: "onThisDayDemo", data: {}, title: "T" },
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
      ...themeOverride,
      textStyles: {
        ...SHELL_DEFAULTS.textStyles,
        label: { fontSize: 13, fontWeight: 700 },
        body: { fontSize: 16 },
        ...(themeOverride.textStyles ?? {}),
      },
    },
    fontRoles: {},
  } as unknown as RenderContext;
}

describe("onThisDayDemoBlock", () => {
  it("renders 3 section headers and bullet-prefixed items with the theme's listItemBullet (default •)", () => {
    const ctx = makeCtx();
    const element = onThisDayDemoBlock.render({
      data: {
        events: ["1969 — Apollo 11 lands on the Moon.", "1976 — Viking 1 lands on Mars."],
        births: ["1304 — Petrarch, Italian scholar and poet."],
        deaths: ["1937 — Guglielmo Marconi, Italian inventor (radio)."],
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("Events");
    expect(html).toContain("Births");
    expect(html).toContain("Deaths");
    // Each of the 4 items is prefixed with "• " (U+2022 + space)
    const bulletMatches = html.match(/•\s/g) ?? [];
    expect(bulletMatches.length).toBe(4);
  });

  it("renders only the events section when births and deaths are absent", () => {
    const ctx = makeCtx();
    const element = onThisDayDemoBlock.render({
      data: {
        events: ["1969 — Apollo 11 lands on the Moon."],
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("Events");
    expect(html).not.toContain("Births");
    expect(html).not.toContain("Deaths");
  });
});
