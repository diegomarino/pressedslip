/** biome-ignore-all lint/suspicious/noConsole: CLI script; stdout/stderr ARE the output channel. */
import {
  imageBlock,
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
  wordSearchBlock,
} from "pressedslip";
import {
  onThisDayDemoBlock,
  streakDemoBlock,
  wordOfDayDemoBlock,
} from "../src/showcase-blocks/index.ts";
import { tuxPng } from "../src/variants/assets/tux.ts";
import { variantsByBlock } from "../src/variants/index.ts";

const blocks = {
  image: imageBlock,
  keyValue: keyValueBlock,
  kpi: kpiBlock,
  list: listBlock,
  qaPair: qaPairBlock,
  quotation: quotationBlock,
  textCell: textCellBlock,
  wordSearch: wordSearchBlock,
  wordOfDayDemo: wordOfDayDemoBlock,
  streakDemo: streakDemoBlock,
  onThisDayDemo: onThisDayDemoBlock,
};
let failed = 0;
for (const group of variantsByBlock) {
  const def = blocks[group.blockType];
  if (!def) {
    console.error(`✗ no block for ${group.blockType}`);
    failed++;
    continue;
  }
  for (const v of group.variants) {
    const data = structuredClone(v.slot.data);
    // Check the URL variant's shape offline; browser smoke tests exercise loading.
    if (v.id === "image-tux") data.images[0].src = tuxPng;
    const r = def.schema.safeParse(data);
    if (!r.success) {
      console.error(`✗ ${v.id}: ${r.error.message}`);
      failed++;
    } else console.log(`✓ ${v.id}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
