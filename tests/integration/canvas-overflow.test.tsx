/**
 * @fileoverview End-to-end regression for canvas-edge clipping detection.
 *
 * Reproduces the exact bug reported by downstream consumers: a block author
 * writes a flex row with a fixed-width label + an unconstrained value `<div>`.
 * Yoga measures the value at max-content (intrinsic ~1100px), Satori emits
 * glyph paths past the canvas, resvg crops at the right edge — last word of
 * every wrapped line truncated mid-character.
 *
 * Before the fix: `r.canvasOverflow` field did not exist; render returned
 * successfully with silently-cropped bytes.
 * After the fix: `r.canvasOverflow` is non-null with overflowPx > 0, and the
 * configured logger receives a structured warn under the "warn" policy.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Composition } from "../../src/index.js";
import {
  builtinBlocks,
  createRegistry,
  defineBlock,
  type LoadedFont,
  loadFontFromBuffer,
  render,
} from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getFonts(): Promise<LoadedFont[]> {
  const data = new Uint8Array(
    await readFile(join(__dirname, "..", "fixtures/fonts/jetbrains-mono-regular.ttf")),
  );
  return [await loadFontFromBuffer("JetBrainsMono", data)];
}

/** Block reproducing canvas-edge clipping. The unbreakable token forces
 *  Satori to lay glyphs past the BlockShell's 528px content area (576 - 2*24
 *  shell padding), exercising the exact resvg-crop failure mode the detector
 *  is built to catch. A breakable phrase like the original bug report wraps
 *  cleanly inside BlockShell's `width:100%` column constraint and so does NOT
 *  overflow when wrapped by the shell — the bug surfaces with content that
 *  Yoga cannot break (no whitespace, no soft-hyphen). */
const mealsBlock = defineBlock({
  type: "meals",
  schema: z.object({ lunch: z.string() }),
  render: ({ data }) => (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>Lunch:</div>
      <div>{data.lunch}</div>
    </div>
  ),
});

/** A string with no whitespace and no breakpoint — forces Satori to emit
 *  glyph paths past the canvas because Yoga has nowhere to wrap. */
const UNBREAKABLE = "Supercalifragilisticexpialidocious".repeat(3);

function makeComposition(lunch: string): Composition {
  return {
    id: "regression-canvas-overflow",
    version: 1,
    date: "2026-06-15",
    status: "ready",
    slots: [{ index: 0, blockType: "meals", data: { lunch } }],
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
  };
}

describe("integration — canvas overflow detection", () => {
  it("detects the bug-report repro (long meal value in unbounded flex row)", async () => {
    const composition = makeComposition(UNBREAKABLE);
    const fonts = await getFonts();
    const warn = vi.fn();
    const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() };

    const r = await render(composition, {
      registry: createRegistry([...builtinBlocks, mealsBlock]),
      fonts,
      logger,
    });

    expect(r.canvasOverflow).not.toBeNull();
    expect(r.canvasOverflow?.overflowPx).toBeGreaterThan(0);
    expect(r.canvasOverflow?.widthPx).toBe(576); // PAPER.thermal80 default

    expect(warn).toHaveBeenCalledWith(
      "Canvas overflow detected",
      expect.objectContaining({
        widthPx: 576,
        overflowPx: expect.any(Number),
        hint: expect.stringContaining("minWidth:0"),
      }),
    );
  });

  it("returns canvasOverflow: null when content fits the canvas", async () => {
    // Short, breakable string inside the SAME bug-form block. BlockShell's
    // `width: 100%` column constraint lets Satori wrap normally; nothing
    // extends past the canvas edge.
    const composition = makeComposition("Pizza");
    const fonts = await getFonts();
    const warn = vi.fn();
    const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() };

    const r = await render(composition, {
      registry: createRegistry([...builtinBlocks, mealsBlock]),
      fonts,
      logger,
    });

    expect(r.canvasOverflow).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('throws when onCanvasOverflow: "throw" and content overflows', async () => {
    const composition = makeComposition(UNBREAKABLE);
    const fonts = await getFonts();

    await expect(
      render(composition, {
        registry: createRegistry([...builtinBlocks, mealsBlock]),
        fonts,
        onCanvasOverflow: "throw",
      }),
    ).rejects.toThrow(/Canvas overflow detected/);
  });

  it('is silent under onCanvasOverflow: "ignore" but still reports via canvasOverflow', async () => {
    const composition = makeComposition(UNBREAKABLE);
    const fonts = await getFonts();
    const warn = vi.fn();
    const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() };

    const r = await render(composition, {
      registry: createRegistry([...builtinBlocks, mealsBlock]),
      fonts,
      logger,
      onCanvasOverflow: "ignore",
    });

    expect(warn).not.toHaveBeenCalled();
    expect(r.canvasOverflow).not.toBeNull();
    expect(r.canvasOverflow?.overflowPx).toBeGreaterThan(0);
  });
});
