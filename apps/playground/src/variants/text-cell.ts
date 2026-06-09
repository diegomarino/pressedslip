/**
 * @fileoverview Playground variants for textCellBlock.
 */
import type { Variant } from "./index.js";

export const textCellVariants: Variant[] = [
  {
    id: "text-cell-daily-header",
    label: "text-cell · daily header (centered)",
    slot: {
      blockType: "textCell",
      title: "HEADER",
      data: { text: "Mon · 24 May 2026", align: "center" },
    },
  },
  {
    id: "text-cell-daily-footer",
    label: "text-cell · daily footer (centered)",
    slot: {
      blockType: "textCell",
      title: "FOOTER",
      data: {
        text: "Generated at 06:15 · Barcelona · Have a focused day.",
        align: "center",
      },
    },
  },
  {
    id: "text-cell-memo-paragraph",
    label: "text-cell · memo body paragraph (justified, no title)",
    slot: {
      blockType: "textCell",
      data: {
        text: "Per the 22 May sync, the Q2 rollout is deferred to 14 June pending legal sign-off. All squad leads must update their roadmaps and flag blockers to Elena Voss by EOD Friday.",
        align: "justify",
      },
    },
  },
];
