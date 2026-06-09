/**
 * @fileoverview Playground palette catalog. Variants are demo DraftSlot data
 * grouped by block type. NOT public package API.
 */
import type { DraftSlot } from "../state/draft-composition.js";

export type Variant = {
  id: string;
  label: string;
  slot: DraftSlot;
};

import { keyValueVariants } from "./key-value.js";
import { kpiVariants } from "./kpi.js";
import { listVariants } from "./list.js";
import { qaPairVariants } from "./qa-pair.js";
import { quotationVariants } from "./quotation.js";
import { onThisDayDemoVariants, streakDemoVariants, wordOfDayDemoVariants } from "./showcase.js";
import { textCellVariants } from "./text-cell.js";
import { wordSearchVariants } from "./word-search.js";

export const variantsByBlock: Array<{ blockType: string; label: string; variants: Variant[] }> = [
  { blockType: "textCell", label: "text-cell", variants: textCellVariants },
  { blockType: "kpi", label: "kpi", variants: kpiVariants },
  { blockType: "list", label: "list", variants: listVariants },
  { blockType: "qaPair", label: "qa-pair", variants: qaPairVariants },
  { blockType: "quotation", label: "quotation", variants: quotationVariants },
  { blockType: "keyValue", label: "key-value", variants: keyValueVariants },
  { blockType: "wordSearch", label: "word-search", variants: wordSearchVariants },
  { blockType: "wordOfDayDemo", label: "word-of-day-demo", variants: wordOfDayDemoVariants },
  { blockType: "streakDemo", label: "streak-demo", variants: streakDemoVariants },
  { blockType: "onThisDayDemo", label: "on-this-day-demo", variants: onThisDayDemoVariants },
];
