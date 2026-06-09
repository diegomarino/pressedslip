/**
 * Render-width contract test.
 *
 * Asserts that when the render pipeline is asked to produce a PNG at
 * PRINT_WIDTH_DOTS, the emitted PNG's IHDR width field equals exactly that
 * constant — ensuring alignment between the render pipeline and transport helpers.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { textCellBlock } from "../../src/blocks/text-cell.js";
import { loadFontFromBuffer } from "../../src/fonts.js";
import { createRegistry } from "../../src/registry.js";
import { render } from "../../src/render.js";
import { PRINT_WIDTH_DOTS } from "../../src/transports/constants.js";
import type { BlockDefinition, Composition } from "../../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontPath = join(__dirname, "..", "fixtures/fonts/jetbrains-mono-regular.ttf");

async function getFonts() {
  const data = new Uint8Array(await readFile(fontPath));
  return [await loadFontFromBuffer("JetBrainsMono", data)];
}

/** Minimal required Composition fields — mirrored from render.test.tsx. */
const BASE: Pick<Composition, "status" | "failedBlocks" | "providerOutcomes" | "timing"> = {
  status: "ready",
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

describe("render-width contract", () => {
  it("PNG emitted at PRINT_WIDTH_DOTS decodes to width = PRINT_WIDTH_DOTS (576)", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", title: "WIDTH-CONTRACT", data: { text: "576" } }],
    };

    const r = await render(composition, {
      registry,
      fonts,
      width: { px: PRINT_WIDTH_DOTS },
    });

    expect(r.bytes).toBeInstanceOf(Uint8Array);

    // Decode the IHDR width from raw PNG bytes — no library dependency needed.
    // Layout: 8-byte PNG signature | 4-byte chunk length | 4-byte "IHDR" type
    //         | 13-byte IHDR data (first 4 bytes = width, big-endian)
    // → width field starts at byte offset 16.
    const view = new DataView(r.bytes.buffer, r.bytes.byteOffset, r.bytes.byteLength);
    const width = view.getUint32(16, false); // big-endian
    expect(width).toBe(PRINT_WIDTH_DOTS);
  });

  it("composition.png width === PRINT_WIDTH_DOTS when no width option is passed (default path)", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c2",
      version: 1,
      date: "2026-05-19",
      slots: [
        { index: 0, blockType: "textCell", title: "DEFAULT-WIDTH", data: { text: "default" } },
      ],
    };

    // No explicit width — exercises DEFAULT_WIDTH = PAPER.thermal80 path.
    const r = await render(composition, { registry, fonts });

    expect(r.bytes).toBeInstanceOf(Uint8Array);

    const view = new DataView(r.bytes.buffer, r.bytes.byteOffset, r.bytes.byteLength);
    const width = view.getUint32(16, false); // big-endian, IHDR offset 16
    expect(width).toBe(PRINT_WIDTH_DOTS);
  });
});
