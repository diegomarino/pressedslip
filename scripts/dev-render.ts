/**
 * @fileoverview Dev CLI: render a single block fixture (or all fixtures) to
 * a PNG file under out/. Used during development to inspect actual 1-bit
 * print output. Not shipped — local-only.
 *
 * Usage:
 *   pnpm dev:render <block> <fixture>   → out/<block>-<fixture>.png
 *   pnpm dev:render --all                → one PNG per block-fixture pair
 *   pnpm dev:render --watch <block> <fixture>  → re-render on src/ change
 */
import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  builtinBlocks,
  type Composition,
  compose,
  createProviderRegistry,
  createRegistry,
  createStaticTextProvider,
  loadFontFromBuffer,
  render,
} from "../src/index.js";
import { builtinFixtures } from "../src/testing/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "out");
const FONT_PATH = join(__dirname, "..", "tests/fixtures/fonts/jetbrains-mono-regular.ttf");

async function getFonts() {
  const bytes = new Uint8Array(await readFile(FONT_PATH));
  return [await loadFontFromBuffer("JetBrainsMono", bytes)];
}

function compositionFor(blockType: string, fixtureName: string): Composition {
  const shapeFixtures = (builtinFixtures as Record<string, Record<string, unknown>>)[blockType];
  if (!shapeFixtures) {
    throw new Error(
      `Unknown block type: ${blockType}. Known: ${Object.keys(builtinFixtures).join(", ")}`,
    );
  }
  const data = shapeFixtures[fixtureName];
  if (data === undefined) {
    throw new Error(
      `Unknown fixture '${fixtureName}' for block '${blockType}'. Known: ${Object.keys(shapeFixtures).join(", ")}`,
    );
  }
  return {
    id: `dev-${blockType}-${fixtureName}`,
    version: 1,
    date: new Date().toISOString().slice(0, 10),
    status: "ready" as const,
    slots: [{ index: 0, blockType, title: blockType.toUpperCase(), data }],
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
  };
}

async function renderOne(
  blockType: string,
  fixtureName: string,
  providerKey?: string,
): Promise<void> {
  const registry = createRegistry(builtinBlocks);
  const fonts = await getFonts();

  let composition: Composition;
  if (providerKey) {
    const provider = createStaticTextProvider({
      key: providerKey,
      value: "dev-render-static-value",
    });
    const full = await compose({
      providers: createProviderRegistry({ [providerKey]: provider }),
      blocks: registry,
      date: new Date().toISOString().slice(0, 10),
    });
    console.log(
      `[--provider ${providerKey}] compose() status=${full.status}, slots=${full.slots.length}`,
    );
    // Narrow the composition to just the requested block so the output PNG
    // mirrors the single-block view produced by the fixture path.
    const targetSlot = full.slots.find((s) => s.blockType === blockType);
    composition = {
      ...full,
      slots: targetSlot ? [{ ...targetSlot, index: 0 }] : [],
      failedBlocks: full.failedBlocks.filter((fb) => fb.blockType === blockType),
    };
  } else {
    composition = compositionFor(blockType, fixtureName);
  }

  const r = await render(composition, { registry, fonts });
  const suffix = providerKey ? `-provider-${providerKey}` : "";
  const file = join(OUT_DIR, `${blockType}-${fixtureName}${suffix}.png`);
  await writeFile(file, r.bytes);
  console.log(`wrote ${file} (${r.width}×${r.height}, ${r.failedBlocks.length} failedBlocks)`);
}

async function renderAll(providerKey?: string): Promise<void> {
  for (const [blockType, shapeFixtures] of Object.entries(builtinFixtures)) {
    for (const fixtureName of Object.keys(shapeFixtures)) {
      await renderOne(blockType, fixtureName, providerKey);
    }
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const isWatch = args.includes("--watch");
  const isAll = args.includes("--all");
  const providerFlagIdx = args.indexOf("--provider");
  const providerKey = providerFlagIdx !== -1 ? args[providerFlagIdx + 1] : undefined;
  const positional = args.filter((a, i) => {
    if (a.startsWith("--")) return false;
    if (i > 0 && args[i - 1] === "--provider") return false;
    return true;
  });

  const run = async (): Promise<void> => {
    if (isAll) {
      await renderAll(providerKey);
      return;
    }
    const [blockType, fixtureName] = positional;
    if (!blockType || !fixtureName) {
      throw new Error(
        "Usage: dev:render <block> <fixture>  |  --all  |  --watch <block> <fixture>",
      );
    }
    await renderOne(blockType, fixtureName, providerKey);
  };

  await run();

  if (isWatch) {
    const srcDir = join(__dirname, "..", "src");
    console.log(`watching ${srcDir} ...`);
    let pending: NodeJS.Timeout | undefined;
    watch(srcDir, { recursive: true }, () => {
      if (pending) clearTimeout(pending);
      // 100ms debounce coalesces editor save bursts (e.g., format-on-save fires multiple events) into a single re-render.
      pending = setTimeout(() => {
        run().catch((err) => console.error(err));
      }, 100);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
