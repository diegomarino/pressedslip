/**
 * @fileoverview Smoke tests for the 3 builtin themes shipped in v1.
 */
import { describe, expect, it } from "vitest";
import { themes } from "../builtins/index.js";

describe("builtin themes", () => {
  it("ships exactly 3 themes with stable ids", () => {
    expect(Object.keys(themes)).toEqual(["default", "mono", "compact"]);
    expect(themes.default.id).toBe("default");
    expect(themes.mono.id).toBe("mono");
    expect(themes.compact.id).toBe("compact");
  });

  it("each theme has at least one body role url", () => {
    for (const t of Object.values(themes)) {
      expect(t.roleUrls.body).toBeDefined();
      expect(t.roleUrls.body?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("each theme declares a titleStyle", () => {
    expect(themes.default.shell.titleStyle).toBe("block");
    expect(themes.mono.shell.titleStyle).toBe("hash");
    expect(themes.compact.shell.titleStyle).toBe("plain");
  });

  it("each theme resolves to a defined listItemBullet after defaults", async () => {
    const { applyShellDefaults } = await import("../apply-defaults.js");
    for (const [name, t] of Object.entries(themes)) {
      const resolved = applyShellDefaults(t.shell);
      expect(resolved.listItemBullet, `theme ${name}`).toBeDefined();
      expect(typeof resolved.listItemBullet, `theme ${name}`).toBe("string");
      expect(resolved.listItemBullet.length, `theme ${name}`).toBeGreaterThan(0);
    }
  });

  it("monoTheme overrides listItemBullet to '-'", () => {
    expect(themes.mono.shell.listItemBullet).toBe("-");
  });

  it("default and compact themes inherit '•' (no explicit override)", () => {
    expect(themes.default.shell.listItemBullet).toBeUndefined();
    expect(themes.compact.shell.listItemBullet).toBeUndefined();
  });
});
