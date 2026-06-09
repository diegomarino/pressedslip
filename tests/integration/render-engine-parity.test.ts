/**
 * @fileoverview Byte-identical determinism gate between top-level render()
 * (resvg-js native) and /browser render() (resvg-wasm). Per ADR-0018 and the
 * upstream resvg pixel-identical guarantee, both engines should produce
 * identical PNG bytes for the same input.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { keyValueBlock } from "../../src/blocks/key-value.js";
import { kpiBlock } from "../../src/blocks/kpi.js";
import { listBlock } from "../../src/blocks/list.js";
import { qaPairBlock } from "../../src/blocks/qa-pair.js";
import { quotationBlock } from "../../src/blocks/quotation.js";
import { textCellBlock } from "../../src/blocks/text-cell.js";
import { render as renderBrowser } from "../../src/browser/render.js";
import { loadFontFromBuffer } from "../../src/fonts.js";
import { createRegistry } from "../../src/registry.js";
import { render as renderNode } from "../../src/render.js";
import type { BlockDefinition, Composition } from "../../src/types.js";

const require = createRequire(import.meta.url);
const wasmBytes = readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm"));

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_FONT = join(__dirname, "..", "fixtures/fonts/jetbrains-mono-regular.ttf");

const REGISTRY = createRegistry([
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
] as BlockDefinition[]);

/** Minimal required Composition envelope fields. */
const BASE: Pick<Composition, "status" | "failedBlocks" | "providerOutcomes" | "timing"> = {
  status: "ready",
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

const SHAPES: { name: string; blockType: string; data: unknown }[] = [
  { name: "textCell", blockType: "textCell", data: { text: "Hello world" } },
  { name: "kpi", blockType: "kpi", data: { value: "12,345", label: "Steps" } },
  {
    name: "keyValue",
    blockType: "keyValue",
    data: { label: "Temperature", value: "21°C" },
  },
  {
    name: "list",
    blockType: "list",
    data: {
      groups: [{ items: [{ value: "alpha" }, { value: "beta" }, { value: "gamma" }] }],
    },
  },
  {
    name: "qaPair",
    blockType: "qaPair",
    data: { question: "Status?", answer: "Green." },
  },
  {
    name: "quotation",
    blockType: "quotation",
    data: { text: "Build it.", attribution: "—" },
  },
];

function singleSlotComposition(blockType: string, data: unknown): Composition {
  return {
    ...BASE,
    id: `c-${blockType}`,
    version: 1,
    date: "2026-05-21",
    slots: [{ index: 0, blockType, data }],
  };
}

describe("render engine parity (resvg-js vs resvg-wasm)", () => {
  let fonts: Awaited<ReturnType<typeof loadFontFromBuffer>>[] | undefined;

  it.each(SHAPES)("produces byte-identical PNG for shape: $name", async ({ blockType, data }) => {
    if (!fonts) {
      const fontBuf = await readFile(FIXTURE_FONT);
      fonts = [await loadFontFromBuffer("JetBrainsMono", new Uint8Array(fontBuf))];
    }
    const composition = singleSlotComposition(blockType, data);

    const nodeOutput = await renderNode(composition, { registry: REGISTRY, fonts });
    const browserOutput = await renderBrowser(composition, {
      registry: REGISTRY,
      fonts,
      wasm: wasmBytes,
    });

    const nb = Buffer.from(nodeOutput.bytes);
    const wb = Buffer.from(browserOutput.bytes);
    const equal = nb.equals(wb);

    if (!equal) {
      const minLen = Math.min(nb.length, wb.length);
      let firstDiff = -1;
      for (let i = 0; i < minLen; i++) {
        if (nb[i] !== wb[i]) {
          firstDiff = i;
          break;
        }
      }
      // eslint-disable-next-line no-console
      console.error(
        `[parity diverged] shape=${blockType} node.len=${nb.length} wasm.len=${wb.length} firstDiff=${firstDiff}`,
      );
    }
    expect(equal).toBe(true);
  }, 30_000);
});
