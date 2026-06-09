/**
 * @fileoverview Unit tests for validateTheme — the loud-failure half of the
 * unknown-fontRole policy (throws at prepare time, before any block renders).
 */
import { describe, expect, it } from "vitest";
import type { LoadedFont } from "../../types.js";
import { applyHeaderDefaults, applyShellDefaults } from "../apply-defaults.js";
import type { PreparedTheme } from "../types.js";
import { validateTheme } from "../validate.js";

function makePrepared(overrides: Partial<PreparedTheme>): PreparedTheme {
  return {
    _kind: "prepared",
    id: "x",
    label: "X",
    fonts: [],
    fontRoles: {},
    shell: applyShellDefaults({ titleStyle: "block" }),
    header: applyHeaderDefaults({}),
    ...overrides,
  };
}

describe("validateTheme", () => {
  it("passes when no textStyles reference a fontRole", () => {
    expect(() => validateTheme(makePrepared({}))).not.toThrow();
  });

  it("passes when textStyles fontRole resolves in fontRoles registry", () => {
    const prepared = makePrepared({
      fontRoles: { body: [] as LoadedFont[] },
      shell: applyShellDefaults({
        titleStyle: "block",
        textStyles: { body: { fontRole: "body" } },
      }),
    });
    expect(() => validateTheme(prepared)).not.toThrow();
  });

  it("throws when textStyles.body.fontRole is unknown", () => {
    const prepared = makePrepared({
      fontRoles: { body: [] as LoadedFont[] },
      shell: applyShellDefaults({
        titleStyle: "block",
        textStyles: { emphasis: { fontRole: "nope" } },
      }),
    });
    expect(() => validateTheme(prepared)).toThrow(/unknown fontRole 'nope'/);
  });

  it("throws on unknown role in extras", () => {
    const prepared = makePrepared({
      fontRoles: {},
      shell: applyShellDefaults({
        titleStyle: "block",
        textStyles: { extras: { footnote: { fontRole: "missing" } } },
      }),
    });
    expect(() => validateTheme(prepared)).toThrow(/unknown fontRole 'missing'/);
  });
});
