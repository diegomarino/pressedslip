/**
 * @fileoverview Sample data scenarios for quotationBlock.
 */
import type { QuotationData } from "./quotation.js";

/**
 * Map of scenario name → valid QuotationData for quotationBlock.
 *
 * @example
 * import { quotationFixtures } from "pressedslip/testing";
 * const data = quotationFixtures.withAttribution;
 */
export const quotationFixtures: Record<string, QuotationData> = {
  withAttribution: {
    text: "What we know is a drop, what we don't know is an ocean.",
    attribution: "Isaac Newton",
  },
  anonymous: {
    text: "The best way to predict the future is to invent it.",
  },
  longBody: {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    attribution: "Anonymous",
  },
};
