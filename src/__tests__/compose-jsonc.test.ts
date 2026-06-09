/**
 * @fileoverview Unit tests for composeJsoncWithHints. Covers emit shape,
 * round-trip invariant, newline normalization (codex F4), nested-meta
 * indent (codex F9), custom blocks, and special-character preservation.
 */

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { composeJsoncWithHints } from "../compose-jsonc.js";
import { defineBlock } from "../define-block.js";
import { createRegistry } from "../registry.js";
import type { JsoncCompositionInput } from "../types.js";

/** Test-local canonical comparator: deep-sorts object keys, then JSON.stringifies. */
function canonicalSortedLocal(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalSortedLocal).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalSortedLocal(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

describe("composeJsoncWithHints", () => {
  it("emits a valid empty composition with no slots and no comments", () => {
    const reg = createRegistry([]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(parseJsonc(text)).toEqual({ date: "2026-05-24", meta: {}, slots: [] });
    expect(text).not.toMatch(/\/\//);
  });

  it("emits a single slot with the registered block's hints as `//` lines above it", () => {
    const echoSchema = z.object({ value: z.string() });
    const echoBlock = defineBlock<{ value: string }>({
      type: "echo",
      schema: echoSchema,
      render: () => null,
      hints: ["Required: `data.value`", "Docs: docs/blocks/echo.md"],
    });
    const reg = createRegistry([echoBlock]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [{ blockType: "echo", data: { value: "hi" } }],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).toContain("// Required: `data.value`");
    expect(text).toContain("// Docs: docs/blocks/echo.md");
    expect(canonicalSortedLocal(parseJsonc(text))).toBe(canonicalSortedLocal(comp));
  });

  it("emits multi-slot compositions with correct trailing-comma placement", () => {
    const echoBlock = defineBlock<{ value: string }>({
      type: "echo",
      schema: z.object({ value: z.string() }),
      render: () => null,
      hints: ["Required: `data.value`"],
    });
    const reg = createRegistry([echoBlock]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [
        { blockType: "echo", data: { value: "a" } },
        { blockType: "echo", data: { value: "b" } },
        { blockType: "echo", data: { value: "c" } },
      ],
    };
    const text = composeJsoncWithHints(comp, reg);
    // Verify slots a and b have trailing commas; slot c (last) does not.
    // Slots have nested data objects, so we test the slot-closing `}` comma
    // placement rather than proximity to `"value"` properties.
    const slotMatches = [...text.matchAll(/^\s*\}\s*,?\s*$/gm)].map((m) => m[0]);
    // 3 slots × (1 data-close `}` + 1 slot-close `}`) = 6 closing braces
    // The slot-level closes: first two have `,` the last does not.
    const slotCloses = slotMatches.filter((l) => /^ {4}\}/.test(l));
    expect(slotCloses[0]).toMatch(/,/); // slot a — trailing comma
    expect(slotCloses[1]).toMatch(/,/); // slot b — trailing comma
    expect(slotCloses[2]).not.toMatch(/,/); // slot c — no trailing comma
    expect(canonicalSortedLocal(parseJsonc(text))).toBe(canonicalSortedLocal(comp));
  });

  it("emits no hint comments for a slot whose block is not in the registry", () => {
    const reg = createRegistry([]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [{ blockType: "unknownType", data: { x: 1 } }],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).not.toMatch(/^\s*\/\//m);
    expect(canonicalSortedLocal(parseJsonc(text))).toBe(canonicalSortedLocal(comp));
  });

  it("emits no hint comments for a registered block without a hints array", () => {
    const noHintBlock = defineBlock<{ x: number }>({
      type: "noHints",
      schema: z.object({ x: z.number() }),
      render: () => null,
    });
    const reg = createRegistry([noHintBlock]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [{ blockType: "noHints", data: { x: 1 } }],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).not.toMatch(/^\s*\/\//m);
  });

  it("preserves backticks and pipes in hint strings", () => {
    const specialBlock = defineBlock<{ v: string }>({
      type: "special",
      schema: z.object({ v: z.string() }),
      render: () => null,
      hints: ["Values of `field`: a|b|c"],
    });
    const reg = createRegistry([specialBlock]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [{ blockType: "special", data: { v: "x" } }],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).toContain("// Values of `field`: a|b|c");
  });

  it("omits the `subject` line when subject is undefined", () => {
    const reg = createRegistry([]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).not.toContain('"subject"');
  });

  it("emits the `subject` line between `date` and `meta` when present", () => {
    const reg = createRegistry([]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      subject: { id: "demo", name: "Demo" },
      meta: {},
      slots: [],
    };
    const text = composeJsoncWithHints(comp, reg);
    const dateIdx = text.indexOf('"date"');
    const subjIdx = text.indexOf('"subject"');
    const metaIdx = text.indexOf('"meta"');
    expect(dateIdx).toBeLessThan(subjIdx);
    expect(subjIdx).toBeLessThan(metaIdx);
  });

  it("normalizes newlines in hint strings to spaces (codex F4)", () => {
    const multiLineBlock = defineBlock<{ v: string }>({
      type: "multiline",
      schema: z.object({ v: z.string() }),
      render: () => null,
      hints: ["line1\nline2", "with\r\ncrlf"],
    });
    const reg = createRegistry([multiLineBlock]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: {},
      slots: [{ blockType: "multiline", data: { v: "x" } }],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).toContain("// line1 line2");
    expect(text).toContain("// with crlf");
    expect(canonicalSortedLocal(parseJsonc(text))).toBe(canonicalSortedLocal(comp));
  });

  it("emits nested meta values with 2-space indent matching slot indent (codex F9)", () => {
    const reg = createRegistry([]);
    const comp: JsoncCompositionInput = {
      date: "2026-05-24",
      meta: { themeId: "default", nested: { k: 1, items: [10, 20] } },
      slots: [],
    };
    const text = composeJsoncWithHints(comp, reg);
    expect(text).toMatch(/"meta": \{\n\s+"themeId"/);
    expect(text).toMatch(/"nested": \{\n\s+"k": 1/);
    expect(canonicalSortedLocal(parseJsonc(text))).toBe(canonicalSortedLocal(comp));
  });
});
