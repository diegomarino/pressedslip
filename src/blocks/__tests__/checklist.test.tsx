/**
 * @fileoverview Unit tests for checklistBlock — schema, rows, box vs text
 * style from theme tokens, wrap-safe row styles.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHELL_DEFAULTS } from "../../themes/apply-defaults.js";
import type { RenderContext } from "../../types.js";
import { checklistFixtures } from "../checklist.fixtures.js";
import { checklistBlock } from "../checklist.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(themeOverrides: Partial<typeof SHELL_DEFAULTS> = {}): RenderContext {
  return {
    block: { index: 0, blockType: "checklist", data: {}, title: "T" },
    composition: {},
    logger: { info: noop, warn: noop, error: noop },
    theme: { ...SHELL_DEFAULTS, ...themeOverrides },
    fontRoles: {},
  } as unknown as RenderContext;
}

function html(items: string[], overrides: Partial<typeof SHELL_DEFAULTS> = {}): string {
  const el = checklistBlock.render({ data: { items }, ctx: makeCtx(overrides) });
  // biome-ignore lint/style/noNonNullAssertion: render never returns null here
  return renderToStaticMarkup(el!);
}

describe("checklistBlock — schema", () => {
  it("has type 'checklist'", () => {
    expect(checklistBlock.type).toBe("checklist");
  });
  it("accepts a list of strings", () => {
    expect(checklistBlock.schema.safeParse({ items: ["a", "b"] }).success).toBe(true);
  });
  it("rejects empty items, missing items and non-string items", () => {
    expect(checklistBlock.schema.safeParse({ items: [] }).success).toBe(false);
    expect(checklistBlock.schema.safeParse({}).success).toBe(false);
    expect(checklistBlock.schema.safeParse({ items: [{ text: "a" }] }).success).toBe(false);
  });
  it("accepts every fixture", () => {
    for (const data of Object.values(checklistFixtures)) {
      expect(checklistBlock.schema.safeParse(data).success).toBe(true);
    }
  });
});

describe("checklistBlock — rendering", () => {
  it("renders one row per item, in order", () => {
    const out = html(["alpha", "beta", "gamma"]);
    expect(out.match(/align-items:flex-start/g)?.length).toBe(3);
    expect(out.indexOf("alpha")).toBeLessThan(out.indexOf("beta"));
    expect(out.indexOf("beta")).toBeLessThan(out.indexOf("gamma"));
  });

  it("box style draws a bordered div from the theme tokens", () => {
    const out = html(["x"], {
      checkboxSize: 18,
      checkboxBorderWidth: 3,
      checkboxRadius: 4,
      checkboxColor: "#123456",
    });
    expect(out).toContain("width:18px");
    expect(out).toContain("height:18px");
    expect(out).toContain("border-width:3px");
    expect(out).toContain("border-radius:4px");
    expect(out).toContain("#123456");
    expect(out).not.toContain("[ ]");
  });

  it("box style never uses the Unicode ballot-box glyph", () => {
    expect(html(["x"])).not.toContain("☐");
  });

  it("text style renders checkboxGlyph and draws no bordered box", () => {
    const out = html(["x"], { checkboxStyle: "text", checkboxGlyph: "[ ]" });
    expect(out).toContain("[ ]");
    expect(out).not.toContain("border-width");
  });

  it("uses listItemGap as the box/text gap", () => {
    expect(html(["x"], { listItemGap: 12 })).toContain("padding-right:12");
  });

  it("wrap-safe row: box pinned (flex-shrink:0), text min-width:0, top aligned", () => {
    const out = html(["long ".repeat(40)]);
    expect(out).toContain("flex-shrink:0");
    expect(out).toContain("min-width:0");
    expect(out).toContain("align-items:flex-start");
  });

  it("offsets the box to centre on the first text line", () => {
    // body 20px * 1.2 = 24 line, box 16 → margin-top 4
    expect(html(["x"])).toContain("margin-top:4");
  });
});
