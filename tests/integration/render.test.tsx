import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "fast-png";
import { describe, expect, it } from "vitest";
import { listBlock } from "../../src/blocks/list.js";
import { textCellBlock } from "../../src/blocks/text-cell.js";
import { loadFontFromBuffer } from "../../src/fonts.js";
import { createRegistry } from "../../src/registry.js";
import { render } from "../../src/render.js";
import type { BlockDefinition, Composition, CompositionInput } from "../../src/types.js";

// Keep listBlock imported per plan (forward-use); reference to satisfy lints.
void listBlock;

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontPath = join(__dirname, "..", "fixtures/fonts/jetbrains-mono-regular.ttf");

async function getFonts() {
  const data = new Uint8Array(await readFile(fontPath));
  return [await loadFontFromBuffer("JetBrainsMono", data)];
}

/** Minimal required Composition fields. */
const BASE: Pick<Composition, "status" | "failedBlocks" | "providerOutcomes" | "timing"> = {
  status: "ready",
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

describe("render — smoke", () => {
  it("renders a minimal Composition to a valid PNG", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", title: "HELLO", data: { text: "world" } }],
    };
    const r = await render(composition, { registry, fonts });
    expect(r.format).toBe("png-1bit");
    expect(r.width % 8).toBe(0);
    expect(r.height).toBeGreaterThan(0);
    expect(r.failedBlocks).toEqual([]);
    // fast-png decode returns grayscale shape (channels=1) for 1-bit PNGs
    const png = decode(new Uint8Array(r.bytes));
    expect(png.width).toBe(r.width);
    expect(png.height).toBe(r.height);
  });
});

describe("render — CompositionInput (diagnostic fields optional)", () => {
  it("accepts a hand-built composition without diagnostics, byte-identical to stubbed", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const bare: CompositionInput = {
      id: "c1",
      version: 1,
      date: "2026-05-19",
      status: "ready",
      slots: [{ index: 0, blockType: "textCell", title: "HELLO", data: { text: "world" } }],
    };
    const stubbed: Composition = { ...BASE, ...bare };
    const a = await render(bare, { registry, fonts });
    const b = await render(stubbed, { registry, fonts });
    expect(a.failedBlocks).toEqual([]);
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
  });

  it("normalizes explicit undefined diagnostics (no TypeError in renderers)", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const withUndefined: CompositionInput = {
      id: "c1",
      version: 1,
      date: "2026-05-19",
      status: "ready",
      slots: [{ index: 0, blockType: "textCell", data: { text: "ok" } }],
      failedBlocks: undefined,
      providerOutcomes: undefined,
      timing: undefined,
    };
    const r = await render(withUndefined, { registry, fonts });
    expect(r.format).toBe("png-1bit");
    expect(r.failedBlocks).toEqual([]);
  });
});

describe("render — failedBlocks always present", () => {
  it("returns empty array when no failures", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", data: { text: "ok" } }],
    };
    const r = await render(composition, { registry, fonts });
    expect(r.failedBlocks).toBeDefined();
    expect(Array.isArray(r.failedBlocks)).toBe(true);
    expect(r.failedBlocks.length).toBe(0);
  });

  it("records unknown-type drops in failedBlocks regardless of mode", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [
        { index: 0, blockType: "textCell", data: { text: "ok" } },
        { index: 1, blockType: "unknown", data: {} },
      ],
    };
    const r = await render(composition, {
      registry,
      fonts,
      onUnknownType: "skip",
    });
    expect(r.failedBlocks).toHaveLength(1);
    expect(r.failedBlocks[0]?.blockType).toBe("unknown");
  });

  it("records schema failures in failedBlocks", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", data: { wrong: "field" } }],
    };
    const r = await render(composition, { registry, fonts });
    expect(r.failedBlocks).toHaveLength(1);
    expect(r.failedBlocks[0]?.reason.message).toMatch(/schema validation/i);
  });
});

describe("render — width handling", () => {
  it("uses thermal80 default (576px) when width omitted", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", data: { text: "x" } }],
    };
    const r = await render(composition, { registry, fonts });
    expect(r.width).toBe(576); // PAPER.thermal80 printable area (576px)
  });

  it("respects explicit { px } width", async () => {
    const fonts = await getFonts();
    const registry = createRegistry([textCellBlock] as BlockDefinition[]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", data: { text: "x" } }],
    };
    const r = await render(composition, {
      registry,
      fonts,
      width: { px: 384 },
    });
    expect(r.width).toBe(384);
  });
});
