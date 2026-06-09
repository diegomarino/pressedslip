/**
 * @fileoverview Mono theme — JetBrains Mono with hash-fill title strip.
 * Best for developer-notebook / terminal aesthetic. See docs/themes.md.
 */
import { defineTheme } from "../index.js";

/**
 * Built-in mono theme.
 * Uses JetBrains Mono font with a hash-style title (# characters as separator).
 */
export const monoTheme = defineTheme({
  id: "mono",
  label: "Mono · receipt-style",
  roleUrls: {
    body: [
      {
        family: "JetBrains Mono",
        // TTF via Google Fonts static files (satori requires TTF/OTF; WOFF2 not supported).
        url: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf",
        weight: 400,
        style: "normal",
      },
    ],
    mono: [
      {
        family: "JetBrains Mono",
        url: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf",
        weight: 400,
        style: "normal",
      },
    ],
  },
  shell: {
    titleStyle: "hash",
    titleFontRole: "mono",
    titleFontSize: 18,
    titleAlignment: "right",
    titleFillChar: "#",
    contentPadding: "normal",
    separatorThickness: "none",
    listItemBullet: "-",
  },
  header: {
    nameFontRole: "mono",
    nameFontSize: 24,
    nameFontWeight: 400,
    dateFontSize: 14,
    padding: 16,
    bottomRuleHeight: 2,
  },
});
