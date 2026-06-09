/**
 * @fileoverview Unit tests for textCellBlock — schema validation and render
 * shape across the align variant matrix. fontSize removed in sp8f.
 */
import { describe, expect, it } from "vitest";
import { textCellFixtures } from "../../../src/blocks/text-cell.fixtures.js";
import { textCellBlock } from "../../../src/blocks/text-cell.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";

const ctx = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as Parameters<
  typeof textCellBlock.render
>[0]["ctx"];

describe("textCellBlock", () => {
  it("type is 'textCell'", () => {
    expect(textCellBlock.type).toBe("textCell");
  });

  it("schema validates minimal data", () => {
    const r = textCellBlock.schema.safeParse({ text: "hello" });
    expect(r.success).toBe(true);
  });

  it("schema rejects missing text", () => {
    const r = textCellBlock.schema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("schema accepts every align enum value", () => {
    for (const align of ["left", "center", "right", "justify"] as const) {
      const r = textCellBlock.schema.safeParse({ text: "x", align });
      expect(r.success).toBe(true);
    }
  });

  it("schema strips fontSize field — removed in sp8f", () => {
    const r = textCellBlock.schema.safeParse({ text: "x", fontSize: "small" });
    expect(r.success).toBe(true);
    expect((r as { data?: unknown }).data).toEqual({ text: "x" }); // fontSize stripped
  });

  it("render returns a ReactElement for all fixtures", () => {
    for (const data of Object.values(textCellFixtures)) {
      expect(textCellBlock.schema.safeParse(data).success).toBe(true);
      const out = textCellBlock.render({ data, ctx });
      expect(out).not.toBeNull();
    }
  });
});
