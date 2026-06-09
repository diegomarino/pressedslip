/**
 * @fileoverview Playground variants for quotationBlock.
 */
import type { Variant } from "./index.js";

export const quotationVariants: Variant[] = [
  {
    id: "quotation-daily-qotd",
    label: "quotation · quote of the day (with attribution)",
    slot: {
      blockType: "quotation",
      title: "QUOTE",
      data: {
        text: "The best time to plant a tree was twenty years ago. The second best time is now.",
        attribution: "Chinese proverb",
      },
    },
  },
  {
    id: "quotation-code-review",
    label: "quotation · code review comment (no title, wildcard)",
    slot: {
      blockType: "quotation",
      data: {
        text: "This abstraction is doing three jobs. Pick one and extract the rest — future-you will send a thank-you note.",
        attribution: "— PR review · github.com/diegomarino/pressedslip #47",
      },
    },
  },
];
