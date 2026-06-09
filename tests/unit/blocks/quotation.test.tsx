/**
 * @fileoverview Unit tests for quotationBlock — quoted body with optional
 * attribution.
 */
import { describe, expect, it } from "vitest";
import { quotationFixtures } from "../../../src/blocks/quotation.fixtures.js";
import { quotationBlock } from "../../../src/blocks/quotation.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";

describe("quotationBlock", () => {
  it("type is 'quotation'", () => {
    expect(quotationBlock.type).toBe("quotation");
  });

  it("schema validates with just text", () => {
    expect(quotationBlock.schema.safeParse({ text: "Hello." }).success).toBe(true);
  });

  it("schema validates with text and attribution", () => {
    expect(quotationBlock.schema.safeParse({ text: "Hi.", attribution: "Newton" }).success).toBe(
      true,
    );
  });

  it("schema rejects missing text", () => {
    expect(quotationBlock.schema.safeParse({ attribution: "x" }).success).toBe(false);
  });

  it("render returns a ReactElement for all fixtures", () => {
    const ctx = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as Parameters<
      typeof quotationBlock.render
    >[0]["ctx"];
    for (const data of Object.values(quotationFixtures)) {
      expect(quotationBlock.schema.safeParse(data).success).toBe(true);
      const out = quotationBlock.render({ data, ctx });
      expect(out).not.toBeNull();
    }
  });
});
