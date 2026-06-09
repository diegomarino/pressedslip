/**
 * @fileoverview Compact theme — Atkinson Hyperlegible with plain title strip.
 * Best for dense receipts; minimizes ink/heat consumption. See docs/themes.md.
 */
import { defineTheme } from "../index.js";

/**
 * Built-in compact theme.
 * Uses Atkinson Hyperlegible font with a plain-style title (no inversion or decoration).
 * Optimized for density and accessibility.
 */
export const compactTheme = defineTheme({
  id: "compact",
  label: "Compact · hyperlegible",
  roleUrls: {
    body: [
      {
        family: "Atkinson Hyperlegible",
        // TTF via Google Fonts static files (satori requires TTF/OTF; WOFF2 not supported).
        url: "https://fonts.gstatic.com/s/atkinsonhyperlegible/v12/9Bt23C1KxNDXMspQ1lPyU89-1h6ONRlW45GE5Q.ttf",
        weight: 400,
        style: "normal",
      },
    ],
  },
  shell: {
    titleStyle: "plain",
    titleFontRole: "body",
    titleFontSize: 16,
    titleFontWeight: 700,
    titleAlignment: "left",
    contentPadding: "compact",
    separatorThickness: "thin",
  },
  header: {
    nameFontRole: "body",
    nameFontSize: 20,
    nameFontWeight: 700,
    dateFontSize: 12,
    padding: 12,
    bottomRuleHeight: 1,
  },
});
