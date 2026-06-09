/**
 * @fileoverview Tests for applyTextStyle helper and resolveFontFamily.
 */
import { describe, expect, it } from "vitest";
import type { LoadedFont } from "../../types.js";
import { applyTextStyle } from "../apply-text-style.js";

// `loadFontFromBuffer` is async; construct LoadedFont synchronously here
// since applyTextStyle never inspects font bytes — only `.name`.
function fakeFont(name: string, weight = 400, style: "normal" | "italic" = "normal"): LoadedFont {
  return { name, data: new Uint8Array([0, 0, 0, 0]), weight, style };
}

describe("applyTextStyle", () => {
  it("returns {} for undefined input", () => {
    expect(applyTextStyle(undefined, {})).toEqual({});
  });

  it("maps simple scalar fields verbatim", () => {
    expect(
      applyTextStyle(
        {
          fontSize: 20,
          fontWeight: 700,
          fontStyle: "italic",
          color: "#333",
          textAlign: "right",
          lineHeight: 1.4,
          textTransform: "uppercase",
        },
        {},
      ),
    ).toEqual({
      fontSize: 20,
      fontWeight: 700,
      fontStyle: "italic",
      color: "#333",
      textAlign: "right",
      lineHeight: 1.4,
      textTransform: "uppercase",
    });
  });

  it("omits undefined fields from output", () => {
    expect(applyTextStyle({ fontSize: 18 }, {})).toEqual({ fontSize: 18 });
  });

  it("translates rotate to transform string", () => {
    expect(applyTextStyle({ rotate: 180 }, {})).toEqual({ transform: "rotate(180deg)" });
    expect(applyTextStyle({ rotate: 0 }, {})).toEqual({ transform: "rotate(0deg)" });
  });

  it("resolves fontRole against fontRoles registry", () => {
    const fontRoles = { body: [fakeFont("Inter", 400)] };
    expect(applyTextStyle({ fontRole: "body" }, fontRoles)).toEqual({ fontFamily: "Inter" });
  });

  it("silently omits fontFamily for unknown fontRole (loud failure happens at theme-prepare time)", () => {
    expect(applyTextStyle({ fontRole: "unknown" }, {})).toEqual({});
  });

  it("uses first entry's name when role has multiple weights/styles (all share family)", () => {
    const fontRoles = {
      body: [fakeFont("Inter", 400, "normal"), fakeFont("Inter", 700, "normal")],
    };
    expect(applyTextStyle({ fontRole: "body", fontWeight: 700 }, fontRoles)).toEqual({
      fontFamily: "Inter",
      fontWeight: 700,
    });
  });

  it("combines fontRole + scalars", () => {
    const fontRoles = { body: [fakeFont("Inter", 400)] };
    expect(applyTextStyle({ fontRole: "body", fontSize: 18, color: "#000" }, fontRoles)).toEqual({
      fontFamily: "Inter",
      fontSize: 18,
      color: "#000",
    });
  });
});
