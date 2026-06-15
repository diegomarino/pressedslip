/**
 * @fileoverview Empirical audit: which built-in blocks tolerate long breakable
 * strings (with whitespace) and which silently clip at the canvas edge.
 *
 * Two flavors of long input:
 *   1. LONG_BREAKABLE — many word-spaced tokens; Satori CAN wrap it.
 *      → Classifies LAYOUT vulnerability: blocks that use flex-row without
 *        `minWidth: 0` on text-bearing children overflow; column-stacked
 *        blocks are immune because every text node gets the full row width.
 *   2. UNBREAKABLE — one long token with no whitespace; Satori CANNOT wrap.
 *      → Surfaces a CONTENT vulnerability that hits every block equally.
 *        Yoga's `minWidth: auto` (default) forbids shrinking a flex item
 *        below its intrinsic content width, and the intrinsic of an
 *        unbreakable token is the full rendered glyph run. No layout
 *        change saves you.
 *
 * This file locks the classification in CI so the detector regresses
 * loudly if a layout change makes a previously-immune block vulnerable.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Composition, LoadedFont } from "../../index.js";
import { builtinBlocks, createRegistry, loadFontFromBuffer, render } from "../../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Long, whitespace-separated string. Total intrinsic width far exceeds the
 *  528 px shell content area, but every individual word fits — so a properly
 *  laid-out column-stacked block can wrap and stay within bounds. */
const LONG_BREAKABLE =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";

/** Single token without break opportunities. Yoga cannot wrap; no built-in
 *  block can prevent overflow regardless of layout strategy. */
const UNBREAKABLE = "Supercalifragilisticexpialidocious".repeat(3);

async function getFonts(): Promise<LoadedFont[]> {
  const data = new Uint8Array(
    await readFile(
      join(__dirname, "..", "..", "..", "tests", "fixtures", "fonts", "jetbrains-mono-regular.ttf"),
    ),
  );
  return [await loadFontFromBuffer("JetBrainsMono", data)];
}

function compose(slots: Composition["slots"]): Composition {
  return {
    id: "audit",
    version: 1,
    date: "2026-06-15",
    status: "ready",
    slots,
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
  };
}

async function renderSlot(slots: Composition["slots"]) {
  return render(compose(slots), {
    registry: createRegistry([...builtinBlocks]),
    fonts: await getFonts(),
    onCanvasOverflow: "ignore",
  });
}

describe("built-in block audit — LONG BREAKABLE text (classifies layout)", () => {
  it("keyValue: immune (column-stacked, value gets full row width)", async () => {
    const r = await renderSlot([
      { index: 0, blockType: "keyValue", data: { label: "Key", value: LONG_BREAKABLE } },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });

  it("qaPair: immune (column-stacked)", async () => {
    const r = await renderSlot([
      { index: 0, blockType: "qaPair", data: { question: "Q?", answer: LONG_BREAKABLE } },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });

  it("kpi: immune (column-stacked)", async () => {
    const r = await renderSlot([
      {
        index: 0,
        blockType: "kpi",
        data: { label: "Label", value: LONG_BREAKABLE, caption: LONG_BREAKABLE },
      },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });

  it("quotation: immune (column-stacked)", async () => {
    const r = await renderSlot([
      {
        index: 0,
        blockType: "quotation",
        data: { text: LONG_BREAKABLE, attribution: "anon" },
      },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });

  it("textCell: immune (flex-row with single span child wraps fine)", async () => {
    const r = await renderSlot([
      { index: 0, blockType: "textCell", data: { text: LONG_BREAKABLE } },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });

  it("list: immune (safe flex-row idiom: value has flexGrow:1 + minWidth:0)", async () => {
    // After the canvas-overflow fix, src/blocks/list.tsx pins the id with
    // flexShrink:0 AND constrains the value with flexGrow:1 + flexBasis:0 +
    // minWidth:0 + width:100%. Long breakable values wrap inside the row.
    const r = await renderSlot([
      {
        index: 0,
        blockType: "list",
        data: {
          groups: [{ items: [{ id: "1", value: LONG_BREAKABLE }] }],
        },
      },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });

  it("list: immune to a borderline-long single word (was the latent failure mode)", async () => {
    // A single word ~400 px wide: would have overflowed against the old
    // (id + intrinsic value) layout once intrinsic > (528 − id width). The
    // safe idiom lets Satori treat this as one block in the remaining row
    // space and either fit it or wrap downstream — either way, no canvas
    // overflow.
    const borderlineWord = "antidisestablishmentarianism";
    const r = await renderSlot([
      {
        index: 0,
        blockType: "list",
        data: {
          groups: [
            {
              items: [
                { id: "1", value: borderlineWord },
                { id: "2", value: `${borderlineWord} short tail` },
              ],
            },
          ],
        },
      },
    ]);
    expect(r.canvasOverflow).toBeNull();
  });
});

describe("built-in block audit — UNBREAKABLE token (content-side issue, not layout)", () => {
  // Every block overflows here. The point of these tests is not to flag layout
  // bugs but to LOCK the diagnostic: the detector correctly fires for content
  // that no layout can rescue, so the warning is actionable upstream (split
  // the token, set max length, add `wordBreak: break-word` once Satori supports
  // it, etc.).
  const blocks = [
    {
      type: "keyValue",
      data: { label: "k", value: UNBREAKABLE },
    },
    {
      type: "qaPair",
      data: { question: "q", answer: UNBREAKABLE },
    },
    {
      type: "kpi",
      data: { value: UNBREAKABLE },
    },
    {
      type: "quotation",
      data: { text: UNBREAKABLE },
    },
    {
      type: "textCell",
      data: { text: UNBREAKABLE },
    },
    {
      type: "list",
      data: { groups: [{ items: [{ id: "1", value: UNBREAKABLE }] }] },
    },
  ];

  for (const block of blocks) {
    it(`${block.type}: detector reports overflow (no layout fix possible)`, async () => {
      const r = await renderSlot([{ index: 0, blockType: block.type, data: block.data }]);
      expect(r.canvasOverflow).not.toBeNull();
      expect(r.canvasOverflow?.overflowPx).toBeGreaterThan(0);
    });
  }
});
