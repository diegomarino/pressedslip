/**
 * @fileoverview Unit tests for applyShellDefaults and applyHeaderDefaults helpers.
 */
import { describe, expect, it } from "vitest";
import {
  applyHeaderDefaults,
  applyShellDefaults,
  HEADER_DEFAULTS,
  SHELL_DEFAULTS,
} from "../apply-defaults.js";
import type { ShellTheme } from "../types.js";

describe("applyShellDefaults", () => {
  it("spreads defaults under input overrides", () => {
    const result = applyShellDefaults({ titleStyle: "hash", titleFillChar: "*" });
    expect(result.titleStyle).toBe("hash");
    expect(result.titleFillChar).toBe("*");
    expect(result.titleFontSize).toBe(SHELL_DEFAULTS.titleFontSize);
    expect(result.titleAlignment).toBe(SHELL_DEFAULTS.titleAlignment);
  });
});

describe("applyHeaderDefaults", () => {
  it("spreads defaults under input overrides", () => {
    const result = applyHeaderDefaults({ padding: 16, nameFontSize: 20 });
    expect(result.padding).toBe(16);
    expect(result.nameFontSize).toBe(20);
    expect(result.bottomRuleHeight).toBe(HEADER_DEFAULTS.bottomRuleHeight);
    expect(result.dateFontSize).toBe(HEADER_DEFAULTS.dateFontSize);
  });
});

describe("applyShellDefaults — textStyles", () => {
  it("populates all 6 canonical slots + extras when input.textStyles is omitted", () => {
    const out = applyShellDefaults({ titleStyle: "block" } as ShellTheme);
    expect(out.textStyles.body).toEqual({ fontSize: 20 });
    expect(out.textStyles.emphasis).toEqual({});
    expect(out.textStyles.display).toEqual({ fontSize: 36, lineHeight: 1.1 });
    expect(out.textStyles.label).toEqual({ fontSize: 16 });
    expect(out.textStyles.question).toEqual({ fontSize: 20 });
    expect(out.textStyles.answer).toEqual({ fontSize: 20 });
    expect(out.textStyles.extras).toEqual({});
  });

  it("preserves other slots when only `body` is supplied (CRIT-2 deep-merge)", () => {
    const out = applyShellDefaults({
      titleStyle: "block",
      textStyles: { body: { fontWeight: 700 } },
    } as ShellTheme);
    expect(out.textStyles.body).toEqual({ fontSize: 20, fontWeight: 700 });
    expect(out.textStyles.emphasis).toEqual({});
    expect(out.textStyles.display).toEqual({ fontSize: 36, lineHeight: 1.1 });
    expect(out.textStyles.extras).toEqual({});
  });

  it("merges body field-by-field; input overrides default fontSize", () => {
    const out = applyShellDefaults({
      titleStyle: "block",
      textStyles: { body: { fontSize: 20, color: "#333" } },
    } as ShellTheme);
    expect(out.textStyles.body).toEqual({ fontSize: 20, color: "#333" });
  });

  it("passes non-body slots through verbatim", () => {
    const out = applyShellDefaults({
      titleStyle: "block",
      textStyles: { emphasis: { fontSize: 24, fontStyle: "italic" } },
    } as ShellTheme);
    expect(out.textStyles.emphasis).toEqual({ fontSize: 24, fontStyle: "italic" });
    expect(out.textStyles.body).toEqual({ fontSize: 20 });
  });

  it("SHELL_DEFAULTS.textStyles is the canonical shape", () => {
    expect(SHELL_DEFAULTS.textStyles.body).toEqual({ fontSize: 20 });
    expect(SHELL_DEFAULTS.textStyles.emphasis).toEqual({});
    expect(SHELL_DEFAULTS.textStyles.display).toEqual({ fontSize: 36, lineHeight: 1.1 });
    expect(SHELL_DEFAULTS.textStyles.label).toEqual({ fontSize: 16 });
    expect(SHELL_DEFAULTS.textStyles.question).toEqual({ fontSize: 20 });
    expect(SHELL_DEFAULTS.textStyles.answer).toEqual({ fontSize: 20 });
  });
});

describe("applyShellDefaults — listItemBullet", () => {
  it("defaults listItemBullet to '•'", () => {
    expect(SHELL_DEFAULTS.listItemBullet).toBe("•");
  });

  it("applyShellDefaults keeps listItemBullet override", () => {
    expect(applyShellDefaults({ listItemBullet: "-" } as ShellTheme).listItemBullet).toBe("-");
  });

  it("applyShellDefaults falls back to '•' when omitted", () => {
    expect(applyShellDefaults({} as ShellTheme).listItemBullet).toBe("•");
  });
});
