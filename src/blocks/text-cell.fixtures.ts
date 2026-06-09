/**
 * @fileoverview Sample data scenarios for textCellBlock. Consumed by unit
 * tests, the dev-render CLI, and the `/testing` subpath export.
 */
import type { TextCellData } from "./text-cell.js";

/**
 * Map of scenario name → valid TextCellData for textCellBlock.
 *
 * @example
 * import { textCellFixtures } from "pressedslip/testing";
 * const data = textCellFixtures.basic;
 */
export const textCellFixtures: Record<string, TextCellData> = {
  basic: { text: "Octopuses have three hearts and blue blood." },
  centeredBanner: { text: "Daily Briefing", align: "center" },
  rightFootnote: { text: "Generated 06:00", align: "right" },
  longJustified: {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    align: "justify",
  },
};
