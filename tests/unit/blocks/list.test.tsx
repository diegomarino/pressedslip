/**
 * @fileoverview Unit tests for listBlock — flat (1 group), sectioned
 * (N groups), with and without item id/separator.
 */
import { describe, expect, it } from "vitest";
import { listFixtures } from "../../../src/blocks/list.fixtures.js";
import { listBlock } from "../../../src/blocks/list.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";

/** Minimal ctx stub that satisfies listBlock.render (reads ctx.theme.listItemGap). */
const minCtx = { theme: SHELL_DEFAULTS, fontRoles: {} } as Parameters<
  typeof listBlock.render
>[0]["ctx"];

describe("listBlock", () => {
  it("type is 'list'", () => {
    expect(listBlock.type).toBe("list");
  });

  it("schema accepts flat list (1 group, no title)", () => {
    const r = listBlock.schema.safeParse({
      groups: [{ items: [{ value: "a" }, { value: "b" }] }],
    });
    expect(r.success).toBe(true);
  });

  it("schema accepts sectioned list with title and separator", () => {
    const r = listBlock.schema.safeParse({
      groups: [
        { title: "EVENTS", separator: ": ", items: [{ id: "1969", value: "Moon landing" }] },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects groups missing the items array", () => {
    const r = listBlock.schema.safeParse({ groups: [{ title: "X" }] });
    expect(r.success).toBe(false);
  });

  it("schema rejects items missing value", () => {
    const r = listBlock.schema.safeParse({
      groups: [{ items: [{ id: "x" }] }],
    });
    expect(r.success).toBe(false);
  });

  it("render returns a ReactElement for all fixtures", () => {
    const ctx = minCtx;
    for (const data of Object.values(listFixtures)) {
      expect(listBlock.schema.safeParse(data).success).toBe(true);
      const out = listBlock.render({ data, ctx });
      expect(out).not.toBeNull();
    }
  });

  it("render handles items with no id (lossless plain text path)", () => {
    const ctx = minCtx;
    const out = listBlock.render({
      data: { groups: [{ items: [{ value: "1969: Moon landing" }] }] },
      ctx,
    });
    expect(out).not.toBeNull();
  });

  it("render handles a group with empty items array", () => {
    const ctx = minCtx;
    const out = listBlock.render({
      data: { groups: [{ title: "ANNUAL EVENTS", items: [] }] },
      ctx,
    });
    expect(out).not.toBeNull();
  });
});
