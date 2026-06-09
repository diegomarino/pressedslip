#!/usr/bin/env tsx
/**
 * Renders the canonical visual references for sp7 docs.
 *
 * Outputs:
 *   - One PNG per builtin block (6) at canonical width.
 *   - One PNG per theme (3).
 *   - One Composition example PNG.
 *   - Annotated-overlay PNGs per theme: TODO (manual; see Step 4 notes below).
 *
 * Run via: npx tsx scripts/docs/render-visual-refs.ts
 * Add to package.json scripts: "docs:visual-refs": "tsx scripts/docs/render-visual-refs.ts"
 *
 * Output goes to docs/assets/visual-refs/.
 *
 * Determinism: best-effort — committed PNGs may differ by 1-2 pixels
 * across maintainer machines (resvg-wasm WASM seeding). Regenerate +
 * commit if your local diff is noisy.
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../docs/assets/visual-refs");
mkdirSync(OUT_DIR, { recursive: true });

const FONT_PATH = resolve(__dirname, "../../tests/fixtures/fonts/jetbrains-mono-regular.ttf");
const fontBytes = new Uint8Array(readFileSync(FONT_PATH));
const font = await loadFontFromBuffer("JetBrainsMono", fontBytes);

const registry = createRegistry(builtinBlocks);

// Helpers.
function makeComposition(
  id: string,
  slots: Array<{ blockType: string; data: unknown; title?: string }>,
): Composition {
  return {
    id,
    version: 1,
    date: "2026-05-24",
    status: "ready",
    slots: slots.map((s, i) => ({ index: i, ...s })),
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
  };
}

async function renderToPng(composition: Composition, outName: string): Promise<void> {
  const r = await render(composition, {
    registry,
    fonts: [font],
    width: PAPER.thermal80,
  });
  const outPath = resolve(OUT_DIR, outName);
  writeFileSync(outPath, r.bytes);
  console.log(`[visual-refs] ${outName} — ${r.width}×${r.height}px (${r.bytes.length} bytes)`);
}

// 1. Per-builtin block (6 blocks, warm/default theme with explicit fonts).
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

// 2. Per-theme — same multi-block showcase rendered under each theme.
//    Themes export: default | mono | compact.
const themeShowcaseSlots = [
  {
    blockType: "textCell",
    data: builtinFixtures.textCell[Object.keys(builtinFixtures.textCell)[0]],
    title: "textCell",
  },
  {
    blockType: "kpi",
    data: builtinFixtures.kpi[Object.keys(builtinFixtures.kpi)[0]],
    title: "kpi",
  },
  {
    blockType: "list",
    data: builtinFixtures.list[Object.keys(builtinFixtures.list)[0]],
    title: "list",
  },
];

for (const [themeName, themeTemplate] of Object.entries(themes)) {
  const composition = makeComposition(`theme-${themeName}`, themeShowcaseSlots);
  const r = await render(composition, {
    registry,
    theme: themeTemplate,
    width: PAPER.thermal80,
  });
  const outPath = resolve(OUT_DIR, `theme-${themeName}.png`);
  writeFileSync(outPath, r.bytes);
  console.log(
    `[visual-refs] theme-${themeName}.png — ${r.width}×${r.height}px (${r.bytes.length} bytes)`,
  );
}

// 3. Annotated-overlay PNGs per theme — manual step.
//    The renderer does not yet support a debug-overlay flag.
//    TODO: for each base theme-*.png, author a side-by-side annotated version
//    (padding / margin / font-role boxes) using a graphics tool and check it in
//    as theme-<name>-annotated.png. See T5 Step 4 in the sp7 Phase B+D+E plan.
console.log("[visual-refs] TODO: theme-*-annotated.png — produce manually (see Step 4 notes)");

// 4. Composition example — richer multi-slot composition for architecture/composition.md.
const compositionExample = makeComposition("composition-example", [
  {
    blockType: "textCell",
    data: builtinFixtures.textCell[Object.keys(builtinFixtures.textCell)[0]],
    title: "Headline",
  },
  {
    blockType: "kpi",
    data: builtinFixtures.kpi[Object.keys(builtinFixtures.kpi)[0]],
    title: "KPI",
  },
  {
    blockType: "list",
    data: builtinFixtures.list[Object.keys(builtinFixtures.list)[0]],
    title: "List",
  },
  {
    blockType: "quotation",
    data: builtinFixtures.quotation[Object.keys(builtinFixtures.quotation)[0]],
    title: "Quote",
  },
]);
await renderToPng(compositionExample, "composition-example.png");

console.log("[visual-refs] done");
