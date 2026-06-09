/**
 * @fileoverview Build-time hero PNG generation. Builds a synthetic
 * Composition from initial-composition.ts and runs Node-side render()
 * (resvg-js) to emit public/hero.png. The browser bundle does NOT need
 * this — it loads the static PNG and only boots wasm on first user Render
 * click. Spec §3.4 + §3.6.
 *
 * NO compose() invocation — that's the provider→render orchestrator and is
 * irrelevant for "render this exact slot data" use cases. See src/render.tsx
 * which accepts a Composition directly and runs it through composeTree.
 *
 * biome-ignore-all lint/suspicious/noConsole: CLI script; stdout/stderr ARE the output channel.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyHeaderDefaults,
  applyShellDefaults,
  createRegistry,
  keyValueBlock,
  kpiBlock,
  listBlock,
  loadFontFromBuffer,
  qaPairBlock,
  quotationBlock,
  render,
  textCellBlock,
  themes,
  wordSearchBlock,
} from "pressedslip";
import { showcaseBlocks } from "../src/showcase-blocks/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");

async function main() {
  const { initialComposition } = await import("../src/initial-composition.ts");

  const registry = createRegistry([
    keyValueBlock,
    kpiBlock,
    listBlock,
    qaPairBlock,
    quotationBlock,
    textCellBlock,
    wordSearchBlock,
    ...showcaseBlocks,
  ]);

  // Load Inter fonts from test fixtures (deterministic; avoids CDN dep at build time).
  const repoRoot = resolve(appRoot, "../..");
  const fontBytes = await readFile(
    resolve(repoRoot, "src/__tests__/fixtures/baseline/fonts/Inter-Regular.ttf"),
  );
  const fontBoldBytes = await readFile(
    resolve(repoRoot, "src/__tests__/fixtures/baseline/fonts/Inter-Bold.ttf"),
  );

  // Synthesize a Composition envelope from the DraftComposition. `index` is
  // positional — must equal each slot's position in the array (composeTree
  // uses it for stable React keys). Stub `id`/`version`/`status`/`timing` to
  // satisfy the Composition type; the render path ignores them.
  const composition = {
    id: "hero-prerender",
    version: 1,
    date: initialComposition.date,
    status: "ready",
    ...(initialComposition.subject !== undefined ? { subject: initialComposition.subject } : {}),
    slots: initialComposition.slots.map((s, index) => ({
      index,
      blockType: s.blockType,
      data: s.data,
      ...(s.title !== undefined ? { title: s.title } : {}),
    })),
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    meta: initialComposition.meta,
  };

  // Build a PreparedTheme using local Inter fonts (CDN-free deterministic build).
  // Mirrors the regression test approach: local binaries + themes.default shell/header config.
  const interRegular = await loadFontFromBuffer("Inter", new Uint8Array(fontBytes), {
    weight: 400,
  });
  const interBold = await loadFontFromBuffer("Inter", new Uint8Array(fontBoldBytes), {
    weight: 700,
  });
  const localFonts = [interRegular, interBold];
  /** @type {import("pressedslip").PreparedTheme} */
  const preparedTheme = {
    _kind: "prepared",
    id: "default-local",
    label: "Default (local fonts)",
    fonts: localFonts,
    fontRoles: {
      body: localFonts,
      display: [interBold],
    },
    shell: applyShellDefaults(themes.default.shell),
    header: applyHeaderDefaults(themes.default.header),
  };

  const rendered = await render(composition, {
    registry,
    theme: preparedTheme,
  });

  // If any slot failed schema validation, fail loudly — don't ship a broken hero.
  if (rendered.failedBlocks.length > 0) {
    console.error("✗ pre-render-hero: some slots failed schema validation:");
    for (const fb of rendered.failedBlocks) {
      console.error(`  - index=${fb.index} blockType=${fb.blockType}: ${fb.reason.message}`);
    }
    process.exit(1);
  }

  const outPath = resolve(appRoot, "public/hero.png");
  await writeFile(outPath, rendered.bytes);
  console.log(`✓ hero.png written: ${outPath} (${rendered.width}×${rendered.height})`);
}

main().catch((err) => {
  console.error("✗ pre-render-hero failed:", err);
  process.exit(1);
});
