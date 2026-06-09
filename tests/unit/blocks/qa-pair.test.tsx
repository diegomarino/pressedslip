/**
 * @fileoverview Unit tests for qaPairBlock — question/answer pair with
 * vertical pause and equal typographic weight.
 */
import { describe, expect, it } from "vitest";
import { qaPairFixtures } from "../../../src/blocks/qa-pair.fixtures.js";
import { qaPairBlock } from "../../../src/blocks/qa-pair.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";

describe("qaPairBlock", () => {
  it("type is 'qaPair'", () => {
    expect(qaPairBlock.type).toBe("qaPair");
  });

  it("schema validates minimal data", () => {
    const r = qaPairBlock.schema.safeParse({ question: "Q?", answer: "A." });
    expect(r.success).toBe(true);
  });

  it("schema rejects missing question", () => {
    expect(qaPairBlock.schema.safeParse({ answer: "A" }).success).toBe(false);
  });

  it("schema rejects missing answer", () => {
    expect(qaPairBlock.schema.safeParse({ question: "Q" }).success).toBe(false);
  });

  it("render returns a ReactElement for all fixtures", () => {
    const ctx = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as Parameters<
      typeof qaPairBlock.render
    >[0]["ctx"];
    for (const data of Object.values(qaPairFixtures)) {
      expect(qaPairBlock.schema.safeParse(data).success).toBe(true);
      const out = qaPairBlock.render({ data, ctx });
      expect(out).not.toBeNull();
    }
  });
});
