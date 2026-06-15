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

  it("does NOT false-positive on hash-style titles (BlockShell '# ' filler is intentionally clipped)", async () => {
    // Regression for the codex review on PR #10: BlockShell with titleStyle:"hash"
    // renders `"# ".repeat(200)` inside an `overflow:"hidden"` div. Satori serializes
    // that as a <g clip-path="url(...)"> wrapper; resvg clips the 3000+px filler
    // run to the title-strip box, so the detector must skip paths inside the
    // clipped subtree. A keyValue block with showTitle and a fits-cleanly value
    // must report canvasOverflow: null.
    const titledBlock = defineBlock({
      type: "titled-keyvalue",
      schema: z.object({ label: z.string(), value: z.string() }),
      render: ({ data }) => (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ fontWeight: 700 }}>{data.label}</div>
          <div>{data.value}</div>
        </div>
      ),
      shell: { showTitle: true },
    });

    const fonts = await getFonts();
    const preparedTheme = {
      _kind: "prepared" as const,
      id: "test-hash",
      label: "Test hash-title",
      fonts,
      fontRoles: { body: fonts, mono: fonts },
      shell: {
        contentPadding: "normal" as const,
        separatorThickness: "thin" as const,
        separatorColor: "#000",
        titleStyle: "hash" as const,
        titleFontRole: "mono",
        titleFontSize: 18,
        titleFontWeight: 400,
        titleAlignment: "right" as const,
        titleFillChar: "#",
        titleBg: "#000",
        titleFg: "#fff",
        textStyles: {
          body: { fontSize: 16 },
          label: { fontSize: 14 },
          emphasis: { fontWeight: 700 },
          display: { fontSize: 24 },
          question: { fontWeight: 700 },
          answer: {},
        },
        listItemGap: 6,
        listItemBullet: "-" as const,
      },
      header: {
        nameFontRole: "mono",
        nameFontSize: 20,
        nameFontWeight: 400,
        nameColor: "#000",
        dateFontRole: "mono",
        dateFontSize: 12,
        dateFontWeight: 400,
        dateColor: "#000",
        padding: 8,
        bottomRuleHeight: 1,
        bottomRuleColor: "#000",
      },
      // biome-ignore lint/suspicious/noExplicitAny: structural-typed for test fixture
    } as any;

    const composition: Composition = {
      id: "hash-title-regression",
      version: 1,
      date: "2026-06-15",
      status: "ready",
      slots: [
        {
          index: 0,
          blockType: "titled-keyvalue",
          title: "Summary",
          data: { label: "Status", value: "OK" },
        },
      ],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    };

    const warn = vi.fn();
    const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() };

    const r = await render(composition, {
      registry: createRegistry([...builtinBlocks, titledBlock]),
      theme: preparedTheme,
      logger,
    });

    expect(r.canvasOverflow).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});
