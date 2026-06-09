/**
 * @fileoverview Default theme — Inter sans-serif with inverted black title strip.
 * Best for general-purpose modern receipts. See docs/themes.md.
 */
import { defineTheme } from "../index.js";

/**
 * Built-in default theme.
 * Uses Inter font with a block-style inverted title (black background, white text).
 */
export const defaultTheme = defineTheme({
  id: "default",
  label: "Default",
  roleUrls: {
    body: [
      {
        family: "Inter",
        // TTF via Google Fonts static files (satori requires TTF/OTF; WOFF2 not supported).
        url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
        weight: 400,
        style: "normal",
      },
      {
        family: "Inter",
        url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
        weight: 700,
        style: "normal",
      },
    ],
    display: [
      {
        family: "Inter",
        url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
        weight: 700,
        style: "normal",
      },
    ],
  },
  shell: {
    titleStyle: "block",
    titleFontRole: "display",
    titleFontSize: 24,
    titleAlignment: "right",
    titleBg: "#000",
    titleFg: "#fff",
    contentPadding: "normal",
    separatorThickness: "thin",
  },
  header: {
    nameFontRole: "display",
    nameFontSize: 32,
    nameFontWeight: 700,
    dateFontSize: 16,
    padding: 24,
    bottomRuleHeight: 4,
  },
});
