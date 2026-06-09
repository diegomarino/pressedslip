import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { listBlock } from "../../../src/blocks/list.js";
import { textCellBlock } from "../../../src/blocks/text-cell.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";
import type { RenderContext } from "../../../src/types.js";

const ctxWithTheme = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as RenderContext;

function renderElementToHtml(el: ReactElement | null): string {
  expect(el).not.toBeNull();
  if (el === null) {
    throw new Error("Expected block to render an element");
  }
  return renderToStaticMarkup(el);
}

describe("textCellBlock", () => {
  it("has type 'textCell' and a Zod schema validating { text: string }", () => {
    expect(textCellBlock.type).toBe("textCell");
    expect(textCellBlock.schema.safeParse({ text: "hello" }).success).toBe(true);
    expect(textCellBlock.schema.safeParse({}).success).toBe(false);
  });

  it("renders the text", () => {
    const el = textCellBlock.render({ data: { text: "hello world" }, ctx: ctxWithTheme });
    const html = renderElementToHtml(el);
    expect(html).toContain("hello world");
  });
});

describe("listBlock", () => {
  it("has type 'list' and validates schema correctly", () => {
    expect(listBlock.type).toBe("list");
    expect(
      listBlock.schema.safeParse({
        groups: [{ items: [{ value: "a" }, { value: "b" }] }],
      }).success,
    ).toBe(true);
    expect(listBlock.schema.safeParse({ groups: [] }).success).toBe(false);
    expect(listBlock.schema.safeParse({ groups: [{ title: "X" }] }).success).toBe(false);
  });

  it("renders items with id and separator", () => {
    const el = listBlock.render({
      data: {
        groups: [
          {
            separator: ": ",
            items: [
              { id: "1969", value: "Moon landing" },
              { id: "1989", value: "Berlin Wall falls" },
            ],
          },
        ],
      },
      ctx: ctxWithTheme,
    });
    const html = renderElementToHtml(el);
    expect(html).toContain("1969");
    expect(html).toContain("Moon landing");
    expect(html).toContain("1989");
    expect(html).toContain("Berlin Wall falls");
  });

  it("renders items without id as plain text", () => {
    const el = listBlock.render({
      data: { groups: [{ items: [{ value: "plain item" }] }] },
      ctx: ctxWithTheme,
    });
    const html = renderElementToHtml(el);
    expect(html).toContain("plain item");
  });

  it("renders multiple groups with titles", () => {
    const el = listBlock.render({
      data: {
        groups: [
          { title: "EVENTS", items: [{ value: "a" }, { value: "b" }] },
          { title: "BIRTHS", items: [{ value: "c" }] },
        ],
      },
      ctx: ctxWithTheme,
    });
    const html = renderElementToHtml(el);
    expect(html).toContain("EVENTS");
    expect(html).toContain("BIRTHS");
    expect(html).toContain("a");
    expect(html).toContain("b");
    expect(html).toContain("c");
  });

  it("renders group without title (no undefined in output)", () => {
    const el = listBlock.render({
      data: { groups: [{ items: [{ value: "x" }] }] },
      ctx: ctxWithTheme,
    });
    const html = renderElementToHtml(el);
    expect(html).not.toContain("undefined");
  });
});
