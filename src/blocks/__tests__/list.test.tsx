/**
 * @fileoverview Unit tests for listBlock — row gap rendering and theme override.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHELL_DEFAULTS } from "../../themes/apply-defaults.js";
import type { RenderContext } from "../../types.js";
import type { ListData } from "../list.js";
import { listBlock } from "../list.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

/** Minimal RenderContext stub for listBlock render tests. */
function makeCtx(themeOverrides: Partial<typeof SHELL_DEFAULTS> = {}): RenderContext {
  return {
    block: { index: 0, blockType: "list", data: {}, title: "T" },
    composition: {
      id: "test",
      version: 1,
      date: "2026-05-30",
      status: "ready",
      slots: [],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    },
    logger: { info: noop, warn: noop, error: noop },
    theme: { ...SHELL_DEFAULTS, ...themeOverrides },
    fontRoles: {},
  } as unknown as RenderContext;
}

const dataWithIds: ListData = {
  groups: [
    {
      separator: " ",
      items: [
        { id: "08:30", value: "Morning stretches" },
        { id: "09:00", value: "Team standup" },
      ],
    },
  ],
};

const dataFlat: ListData = {
  groups: [{ items: [{ value: "Buy milk" }] }],
};

describe("listBlock — row gap (via paddingRight on id div)", () => {
  // Note: listItemGap is rendered as padding-right on the bold id div, not as
  // flex `gap` on the row container. Satori's flex gap is unreliable when a
  // sibling's value wraps — see ShellTheme.listItemGap jsdoc.

  it("renders rows with the default padding-right:8 from SHELL_DEFAULTS", () => {
    const ctx = makeCtx();
    const element = listBlock.render({ data: dataWithIds, ctx });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("padding-right:8");
  });

  it("uses theme.listItemGap override when set to 12", () => {
    const ctx = makeCtx({ listItemGap: 12 });
    const element = listBlock.render({ data: dataWithIds, ctx });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("padding-right:12");
  });

  it("uses theme.listItemGap = 0 when explicitly zeroed", () => {
    const ctx = makeCtx({ listItemGap: 0 });
    const element = listBlock.render({ data: dataWithIds, ctx });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("padding-right:0");
  });

  it("flat items (no id) render the value plainly — no padding-right", () => {
    const ctx = makeCtx();
    const element = listBlock.render({ data: dataFlat, ctx });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("Buy milk");
    // No id present → no padding-right
    expect(html).not.toContain("padding-right");
  });

  it("preserves id↔value spacing on wrap-row", () => {
    const ctx = makeCtx();
    const element = listBlock.render({
      data: {
        groups: [
          {
            items: [
              {
                id: "08:30",
                value: "Long enough value text to force a wrap to a second line in the row",
              },
            ],
          },
        ],
      },
      ctx,
    });
    expect(element).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: null checked above
    const html = renderToStaticMarkup(element!);
    // T4 chose flexShrink:0 on the bold id div — assert the style survives
    // through Satori-bound JSX (react-dom serializes CSS as kebab-case)
    expect(html).toContain("flex-shrink:0");
  });
});
