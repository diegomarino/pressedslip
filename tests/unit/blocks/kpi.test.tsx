/**
 * @fileoverview Unit tests for kpiBlock — large value with optional label
 * and caption. Generic stat-card primitive.
 */
import { describe, expect, it } from "vitest";
import { kpiFixtures } from "../../../src/blocks/kpi.fixtures.js";
import { kpiBlock } from "../../../src/blocks/kpi.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";

describe("kpiBlock", () => {
  it("type is 'kpi'", () => {
    expect(kpiBlock.type).toBe("kpi");
  });

  it("schema validates minimal data (value only)", () => {
    expect(kpiBlock.schema.safeParse({ value: "42" }).success).toBe(true);
  });

  it("schema validates with optional label and caption", () => {
    const r = kpiBlock.schema.safeParse({
      value: "22°",
      label: "Temperature",
      caption: "+2° vs yesterday",
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects missing value", () => {
    expect(kpiBlock.schema.safeParse({ label: "x" }).success).toBe(false);
  });

  it("render handles caption without label", () => {
    const ctx = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as Parameters<
      typeof kpiBlock.render
    >[0]["ctx"];
    const out = kpiBlock.render({
      data: { value: "99%", caption: "7-day avg" },
      ctx,
    });
    expect(out).not.toBeNull();
  });

  it("render returns a ReactElement for all fixtures", () => {
    const ctx = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as Parameters<
      typeof kpiBlock.render
    >[0]["ctx"];
    for (const data of Object.values(kpiFixtures)) {
      expect(kpiBlock.schema.safeParse(data).success).toBe(true);
      const out = kpiBlock.render({ data, ctx });
      expect(out).not.toBeNull();
    }
  });
});
