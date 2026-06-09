#!/usr/bin/env tsx
/**
 * Renders the canonical visual references for docs.
 *
 * Outputs:
 *   - One PNG per builtin block (6) at canonical width.
 *   - One PNG per theme (3).
 *   - One Composition example PNG (morning briefing).
 *
 * Run via: pnpm docs:visual-refs
 * Output goes to docs/assets/visual-refs/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  builtinBlocks,
  type Composition,
  createRegistry,
  loadFontFromBuffer,
  PAPER,
  render,
  themes,
} from "../../src/index.js";
import { builtinFixtures } from "../../src/testing/index.js";
import { streakBlockNode } from "./streak-block-node.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../docs/assets/visual-refs");
mkdirSync(OUT_DIR, { recursive: true });

const FONT_PATH = resolve(__dirname, "../../tests/fixtures/fonts/jetbrains-mono-regular.ttf");
const fontBytes = new Uint8Array(readFileSync(FONT_PATH));
const font = await loadFontFromBuffer("JetBrainsMono", fontBytes);

const registry = createRegistry([...builtinBlocks, streakBlockNode]);

// Helpers.
function makeComposition(
  id: string,
  slots: Array<{ blockType: string; data: unknown; title?: string }>,
): Composition {
  return {
    id,
    version: 1,
    date: "2026-06-09",
    status: "ready",
    slots: slots.map((s, i) => ({ index: i, ...s })),
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
  };
}

async function renderToPng(
  composition: Composition,
  outName: string,
  themeTemplate?: (typeof themes)[keyof typeof themes],
): Promise<void> {
  const options = themeTemplate
    ? { registry, theme: themeTemplate, width: PAPER.thermal80 }
    : { registry, fonts: [font], width: PAPER.thermal80 };
  const r = await render(composition, options);
  const outPath = resolve(OUT_DIR, outName);
  writeFileSync(outPath, r.bytes);
  console.log(`[visual-refs] ${outName} — ${r.width}×${r.height}px (${r.bytes.length} bytes)`);
}

// 1. Per-builtin block (individual fixtures, unchanged).
const blockTypes = ["textCell", "list", "keyValue", "qaPair", "kpi", "quotation"] as const;

for (const blockType of blockTypes) {
  const fixtures = builtinFixtures[blockType as keyof typeof builtinFixtures];
  const firstKey = Object.keys(fixtures)[0];
  const data = fixtures[firstKey];
  const composition = makeComposition(`block-${blockType}`, [
    { blockType, data, title: blockType },
  ]);
  await renderToPng(composition, `block-${blockType}.png`);
}

// Morning briefing slots — shared between the hero and theme comparison images.
const morningBriefingSlots = [
  {
    blockType: "kpi",
    title: "WEATHER",
    data: { value: "18°C", label: "OLEIROS", caption: "Partly cloudy · low 13°C" },
  },
  {
    blockType: "list",
    title: "CALENDAR",
    data: {
      groups: [
        {
          title: "MORNING",
          items: [
            { id: "09:00", value: "Weekly sync · Design × Eng" },
            { id: "10:30", value: "1-on-1 with María" },
          ],
        },
        {
          title: "AFTERNOON",
          items: [
            { id: "14:00", value: "Deep work block" },
            { id: "16:45", value: "Product demo · Acme Corp" },
          ],
        },
      ],
    },
  },
  {
    blockType: "quotation",
    title: "QUOTE",
    data: { text: "Make it work, make it right, make it fast.", attribution: "Kent Beck" },
  },
  {
    blockType: "keyValue",
    title: "DAYLIGHT",
    data: { label: "Sunrise · Sunset", value: "06:22 · 21:04" },
  },
  {
    blockType: "streakDemo",
    title: "STREAK",
    data: {
      days: 12,
      last7: [true, true, false, true, true, true, true],
      label: "deep work mornings",
    },
  },
];

// 2. Per-theme — morning briefing under each theme.
for (const [themeName, themeTemplate] of Object.entries(themes)) {
  const composition = makeComposition(`theme-${themeName}`, morningBriefingSlots);
  await renderToPng(composition, `theme-${themeName}.png`, themeTemplate);
}

// 3. Composition example — hero image for the README.
const compositionExample = makeComposition("composition-example", morningBriefingSlots);
await renderToPng(compositionExample, "composition-example.png");

console.log("[visual-refs] done");
