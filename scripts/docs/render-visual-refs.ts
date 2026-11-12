#!/usr/bin/env tsx
/**
 * Renders the canonical visual references for docs.
 *
 * Outputs:
 *   - One PNG per builtin block (8) at canonical width, from its first fixture.
 *   - One PNG per `jsonc` example in docs/blocks/*.md (`doc-<page>-<n>.png`, n from 1),
 *     embedded right below the example so docs and images can't drift apart.
 *   - One PNG per image and wordSearch fixture (`block-<type>-<fixture>.png`), for galleries.
 *   - One PNG per playground showcase variant (`showcase-<variant-id>.png`).
 *   - Recipe illustrations (`recipe-*.png`) for docs/guide/recipes.md.
 *   - One PNG per theme (3).
 *   - Composition example PNGs (morning briefing, kids briefing).
 *   - The README hero (`hero.png`): the playground's example slips (presets.ts)
 *     side by side on a grey background, each ending in a torn paper edge.
 *
 * Run via: pnpm docs:visual-refs
 * Output goes to docs/assets/visual-refs/.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode as decodePng, encode as encodePng } from "fast-png";
import { type ParseError, parse as parseJsonc } from "jsonc-parser";
import { presets } from "../../apps/playground/src/presets.js";
import { showcaseBlocks } from "../../apps/playground/src/showcase-blocks/index.js";
import { emojiPng } from "../../apps/playground/src/variants/assets/emoji.js";
import {
  drawingPromptDemoVariants,
  onThisDayDemoVariants,
  phonicsDemoVariants,
  riddleDemoVariants,
  routineDemoVariants,
  streakDemoVariants,
  wordOfDayDemoVariants,
} from "../../apps/playground/src/variants/showcase.js";
import {
  builtinBlocks,
  type Composition,
  createRegistry,
  loadFontFromBuffer,
  PAPER,
  render,
  type ThemeInput,
  themes,
} from "../../src/index.js";
import { builtinFixtures } from "../../src/testing/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../docs/assets/visual-refs");
mkdirSync(OUT_DIR, { recursive: true });

const FONT_PATH = resolve(__dirname, "../../tests/fixtures/fonts/jetbrains-mono-regular.ttf");
const fontBytes = new Uint8Array(readFileSync(FONT_PATH));
const font = await loadFontFromBuffer("JetBrainsMono", fontBytes);

const registry = createRegistry([...builtinBlocks, ...showcaseBlocks]);

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

/**
 * Drops the slip's date header: everything down to the end of its bottom rule,
 * the first row that is mostly ink. Single-block images read better without it.
 */
function cropHeader(bytes: Uint8Array): Uint8Array {
  const png = decodePng(bytes);
  const channels = png.channels;
  const rowBytes = png.width * channels;
  const isInk = (y: number, x: number) => (png.data[y * rowBytes + x * channels] ?? 255) < 128;
  let ruleEnd = -1;
  for (let y = 0; y < png.height; y++) {
    let ink = 0;
    for (let x = 0; x < png.width; x++) if (isInk(y, x)) ink++;
    if (ink > png.width * 0.8) ruleEnd = y;
    else if (ruleEnd >= 0) break;
  }
  if (ruleEnd < 0) return bytes;
  const top = ruleEnd + 1;
  return encodePng({
    ...png,
    height: png.height - top,
    data: png.data.slice(top * rowBytes),
  });
}

async function renderToPng(
  composition: Composition,
  outName: string,
  themeTemplate?: ThemeInput,
  { crop = false }: { crop?: boolean } = {},
): Promise<void> {
  const options = themeTemplate
    ? { registry, theme: themeTemplate, width: PAPER.thermal80 }
    : { registry, fonts: [font], width: PAPER.thermal80 };
  const r = await render(composition, options);
  // A rejected block still yields a PNG (blank where the block should be):
  // fail loudly so a broken doc example can't ship an empty image.
  if (r.failedBlocks.length > 0)
    throw new Error(`${outName}: ${JSON.stringify(r.failedBlocks.map((f) => f.reason.message))}`);
  const bytes = crop ? cropHeader(r.bytes) : r.bytes;
  const outPath = resolve(OUT_DIR, outName);
  writeFileSync(outPath, bytes);
  console.log(`[visual-refs] ${outName} — ${bytes.length} bytes`);
}

// 1. Per-builtin block (individual fixtures, unchanged).
const blockTypes = [
  "textCell",
  "list",
  "keyValue",
  "qaPair",
  "kpi",
  "quotation",
  "wordSearch",
  "image",
] as const;

for (const blockType of blockTypes) {
  const fixtures = builtinFixtures[blockType as keyof typeof builtinFixtures];
  const firstKey = Object.keys(fixtures)[0];
  const data = fixtures[firstKey];
  const composition = makeComposition(`block-${blockType}`, [
    { blockType, data, title: blockType },
  ]);
  await renderToPng(composition, `block-${blockType}.png`);
  if (blockType !== "image" && blockType !== "wordSearch") continue;
  for (const [key, fixture] of Object.entries(fixtures)) {
    const one = makeComposition(`block-${blockType}-${key}`, [
      { blockType, data: fixture, title: blockType },
    ]);
    await renderToPng(one, `block-${blockType}-${key}.png`, undefined, { crop: true });
  }
}

// 1a. Every `jsonc` example in docs/blocks/*.md, rendered exactly as written.
const BLOCK_DOCS_DIR = resolve(__dirname, "../../docs/blocks");
for (const file of readdirSync(BLOCK_DOCS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort()) {
  const page = file.replace(/\.md$/, "");
  const markdown = readFileSync(resolve(BLOCK_DOCS_DIR, file), "utf8");
  const fences = [...markdown.matchAll(/```jsonc\n([\s\S]*?)```/g)];
  for (const [i, fence] of fences.entries()) {
    const errors: ParseError[] = [];
    const slot = parseJsonc(fence[1] ?? "", errors) as {
      blockType: string;
      data: unknown;
      title?: string;
    };
    if (errors.length > 0) throw new Error(`${file} example ${i + 1}: invalid JSONC`);
    const composition = makeComposition(`doc-${page}-${i + 1}`, [slot]);
    await renderToPng(composition, `doc-${page}-${i + 1}.png`, undefined, { crop: true });
  }
}

// 1b. Playground showcase variants, rendered with the mono theme (JetBrains Mono, CDN).
const showcaseVariants = [
  ...wordOfDayDemoVariants,
  ...streakDemoVariants,
  ...onThisDayDemoVariants,
  ...phonicsDemoVariants,
  ...routineDemoVariants,
  ...drawingPromptDemoVariants,
  ...riddleDemoVariants,
];
for (const variant of showcaseVariants) {
  const composition = makeComposition(`showcase-${variant.id}`, [variant.slot]);
  await renderToPng(composition, `showcase-${variant.id}.png`, themes.mono, { crop: true });
}

// 1c. Recipe: the same emoji PNG at a plain 1-bit threshold vs Floyd–Steinberg.
for (const dither of ["none", "floyd-steinberg"] as const) {
  const composition = makeComposition(`recipe-emoji-${dither}`, [
    {
      blockType: "image",
      title: `dither: ${dither}`,
      data: {
        layout: "column",
        fit: "none",
        dither,
        images: [{ src: emojiPng.balletShoes }, { src: emojiPng.soap }],
      },
    },
  ]);
  await renderToPng(composition, `recipe-emoji-${dither}.png`, undefined, { crop: true });
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

// 4. Kids briefing — showcase blocks plus a riddle whose answer prints upside
// down through a theme override (`textStyles.answer.rotate = 180`).
/** A theme whose `answer` text style prints upside down. */
function withUpsideDownAnswers<T extends (typeof themes)[keyof typeof themes]>(theme: T): T {
  return {
    ...theme,
    shell: {
      ...theme.shell,
      textStyles: {
        ...theme.shell.textStyles,
        answer: { ...theme.shell.textStyles?.answer, rotate: 180 },
      },
    },
  };
}
const kidsTheme = withUpsideDownAnswers(themes.mono);
const kidsSlots = [
  phonicsDemoVariants[0].slot,
  routineDemoVariants[0].slot,
  {
    blockType: "qaPair",
    title: "RIDDLE",
    data: {
      question: "What has hands but can't clap?",
      answer: "A clock",
    },
  },
  {
    blockType: "wordSearch",
    title: "FIND THE ANIMALS",
    data: builtinFixtures.wordSearch.animals,
  },
  {
    ...drawingPromptDemoVariants[0].slot,
    data: { prompt: "Draw your favourite animal.", height: 220 },
  },
];
await renderToPng(
  makeComposition("composition-kids", kidsSlots),
  "composition-kids.png",
  kidsTheme,
);

// The riddle alone, for the README's data → paper pairs.
await renderToPng(
  makeComposition("showcase-riddle-upside-down", [kidsSlots[2]]),
  "showcase-riddle-upside-down.png",
  kidsTheme,
  { crop: true },
);

// 5. README hero: the playground's three example slips (apps/playground/src/
// presets.ts), each in its own theme, side by side.
const heroSlips = presets.map((preset) => ({
  theme: themes[preset.themeId],
  composition: {
    ...makeComposition(`hero-${preset.id}`, preset.draft.slots),
    subject: preset.draft.subject,
  } as Composition,
}));
const strips = [];
for (const { theme, composition } of heroSlips) {
  const r = await render(composition, { registry, theme, width: PAPER.thermal80 });
  if (r.failedBlocks.length > 0)
    throw new Error(`hero ${composition.id}: ${JSON.stringify(r.failedBlocks)}`);
  strips.push(decodePng(r.bytes));
}
const GAP = 56;
const TEAR = 14; // torn-edge tooth height
const BG = 226;
const stripHeight = Math.max(...strips.map((p) => p.height)) + 24;
const heroWidth = strips.reduce((w, p) => w + p.width, 0) + (strips.length + 1) * GAP;
const heroHeight = GAP + stripHeight + TEAR + GAP;
const hero = new Uint8Array(heroWidth * heroHeight).fill(BG);
for (const [i, strip] of strips.entries()) {
  const left = GAP + i * (strip.width + GAP);
  for (let y = 0; y < stripHeight + TEAR; y++) {
    for (let x = 0; x < strip.width; x++) {
      // Sawtooth bottom edge: the paper ends between stripHeight and stripHeight + TEAR.
      const phase = (x + i * 7) % (TEAR * 2);
      const edge = stripHeight + (phase < TEAR ? phase : TEAR * 2 - phase);
      if (y >= edge) continue;
      const value =
        y < strip.height ? (strip.data[(y * strip.width + x) * strip.channels] ?? 255) : 255;
      hero[(GAP + y) * heroWidth + left + x] = value;
    }
  }
}
const heroPng = encodePng({ width: heroWidth, height: heroHeight, channels: 1, data: hero });
writeFileSync(resolve(OUT_DIR, "hero.png"), heroPng);
console.log(`[visual-refs] hero.png — ${heroWidth}×${heroHeight}px (${heroPng.length} bytes)`);

console.log("[visual-refs] done");
