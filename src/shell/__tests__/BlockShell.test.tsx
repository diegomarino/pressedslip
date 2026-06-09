/**
 * @fileoverview Tests for BlockShell body cascade, fontRoles prop, and body fontRole warning.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SHELL_DEFAULTS } from "../../themes/apply-defaults.js";
import type { LoadedFont } from "../../types.js";
import { BlockShell } from "../BlockShell.js";

// Synchronous LoadedFont fixture — bypasses async loadFontFromBuffer; the
// cascade only reads `.name`.
function fakeFont(name: string, weight = 400): LoadedFont {
  return { name, data: new Uint8Array([0, 0, 0, 0]), weight, style: "normal" };
}

describe("BlockShell — body cascade", () => {
  it("renders with color:black and no font cascade when no theme passed (default)", () => {
    const html = renderToStaticMarkup(
      <BlockShell>
        <span>hello</span>
      </BlockShell>,
    );
    expect(html).toContain("color:black");
    // SHELL_DEFAULTS.textStyles.body has only fontSize:20 — cascade injects it
    expect(html).toContain("font-size:20");
    expect(html).not.toContain("font-family");
  });

  it("propagates body.color and body.fontSize from theme", () => {
    const theme = {
      ...SHELL_DEFAULTS,
      textStyles: { ...SHELL_DEFAULTS.textStyles, body: { fontSize: 20, color: "#333" } },
    };
    const html = renderToStaticMarkup(
      <BlockShell theme={theme}>
        <span>x</span>
      </BlockShell>,
    );
    expect(html).toContain("color:#333");
    expect(html).toContain("font-size:20");
  });

  it("injects fontFamily when body.fontRole is set AND fontRoles prop is passed", () => {
    const theme = {
      ...SHELL_DEFAULTS,
      textStyles: { ...SHELL_DEFAULTS.textStyles, body: { fontRole: "body" } },
    };
    const html = renderToStaticMarkup(
      <BlockShell theme={theme} fontRoles={{ body: [fakeFont("Inter")] }}>
        <span>x</span>
      </BlockShell>,
    );
    expect(html).toContain("font-family:Inter");
  });

  it("emits one-time console.warn when theme has body.fontRole but fontRoles prop is absent", async () => {
    // vi.resetModules() clears the module registry so the dynamic import below
    // gets a fresh module instance with bodyFontRoleWarned = false, regardless
    // of whether earlier tests already imported BlockShell.
    vi.resetModules();
    const { BlockShell: FreshBlockShell } = await import("../BlockShell.js");
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional mock stub
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const theme = {
        ...SHELL_DEFAULTS,
        textStyles: { ...SHELL_DEFAULTS.textStyles, body: { fontRole: "body" } },
      };
      // First render: warn called once
      renderToStaticMarkup(<FreshBlockShell theme={theme}>x</FreshBlockShell>);
      // Second render: not called again (one-time semantics)
      renderToStaticMarkup(<FreshBlockShell theme={theme}>y</FreshBlockShell>);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/body\.fontRole/);
    } finally {
      warn.mockRestore();
    }
  });

  it("does NOT propagate textAlign / textTransform / rotate via cascade", () => {
    const theme = {
      ...SHELL_DEFAULTS,
      textStyles: {
        ...SHELL_DEFAULTS.textStyles,
        body: { textAlign: "right" as const, textTransform: "uppercase" as const, rotate: 180 },
      },
    };
    const html = renderToStaticMarkup(<BlockShell theme={theme}>x</BlockShell>);
    expect(html).not.toContain("text-align");
    expect(html).not.toContain("text-transform");
    expect(html).not.toContain("transform:rotate");
  });
});
