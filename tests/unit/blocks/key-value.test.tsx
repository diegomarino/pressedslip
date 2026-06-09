/**
 * @fileoverview Unit tests for keyValueBlock — label/value pair with
 * typographic emphasis on label.
 */
import { describe, expect, it } from "vitest";
import { keyValueFixtures } from "../../../src/blocks/key-value.fixtures.js";
import { keyValueBlock } from "../../../src/blocks/key-value.js";
import { SHELL_DEFAULTS } from "../../../src/themes/apply-defaults.js";

describe("keyValueBlock", () => {
  it("type is 'keyValue'", () => {
    expect(keyValueBlock.type).toBe("keyValue");
  });

  it("schema validates minimal data", () => {
    const r = keyValueBlock.schema.safeParse({ label: "Temp", value: "22°" });
    expect(r.success).toBe(true);
  });

  it("schema rejects missing label", () => {
    expect(keyValueBlock.schema.safeParse({ value: "x" }).success).toBe(false);
  });

  it("schema rejects missing value", () => {
    expect(keyValueBlock.schema.safeParse({ label: "x" }).success).toBe(false);
  });

  it("render returns a ReactElement for all fixtures", () => {
    const ctx = { theme: SHELL_DEFAULTS, fontRoles: {} } as unknown as Parameters<
      typeof keyValueBlock.render
    >[0]["ctx"];
    for (const data of Object.values(keyValueFixtures)) {
      expect(keyValueBlock.schema.safeParse(data).success).toBe(true);
      const out = keyValueBlock.render({ data, ctx });
      expect(out).not.toBeNull();
    }
  });
});
