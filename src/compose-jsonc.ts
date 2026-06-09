/**
 * @fileoverview composeJsoncWithHints — emits a JSONC string from a
 * JsoncCompositionInput, injecting BlockDefinition.hints as `//` line
 * comments above each slot.
 */
import type { JsoncCompositionInput, Registry } from "./types.js";

/** Replace newlines with spaces so each hint emits as a single `//` line. */
function normalizeHintLine(h: string): string {
  return h.replace(/\r?\n/g, " ");
}

/** Indent every line of a multi-line block by `indent` (prepended to each line). */
function reindent(block: string, indent: string): string {
  return block
    .split("\n")
    .map((l) => `${indent}${l}`)
    .join("\n");
}

/**
 * Compose a JSONC string from a JsoncCompositionInput, injecting block hints as comments.
 *
 * Each slot is preceded by `//` line comments sourced from
 * `BlockDefinition.hints` for that block type, helping editors understand
 * the expected data shape. Round-trip invariant: `parseJsonc(result)` is
 * structurally equal to `composition` for JSON-serializable inputs.
 *
 * @param composition - Minimal composition-shaped input with date, meta, and slots.
 * @param registry - Block registry used to look up hints for each slot's blockType.
 * @returns A JSONC string with inline comments; feed to `parseJsonc` to round-trip.
 * @example
 * ```ts
 * import { composeJsoncWithHints, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const registry = createRegistry(builtinBlocks);
 * const jsonc = composeJsoncWithHints(
 *   { date: "2026-01-15", meta: {}, slots: [{ blockType: "kpi", data: { value: "42" } }] },
 *   registry,
 * );
 * console.log(jsonc); // { "date": "2026-01-15", ... with // hints above each slot }
 * ```
 */
export function composeJsoncWithHints(
  composition: JsoncCompositionInput,
  registry: Registry,
): string {
  const lines: string[] = ["{"];
  lines.push(`  "date": ${JSON.stringify(composition.date)},`);
  if (composition.subject !== undefined) {
    lines.push(`  "subject": ${JSON.stringify(composition.subject)},`);
  }
  const metaJson = JSON.stringify(composition.meta, null, 2);
  lines.push(`  "meta": ${reindent(metaJson, "  ").trimStart()},`);
  lines.push(`  "slots": [`);
  for (const [i, slot] of composition.slots.entries()) {
    const def = registry.find(slot.blockType);
    const hints = def?.hints ?? [];
    for (const h of hints) lines.push(`    // ${normalizeHintLine(h)}`);
    const slotJson = JSON.stringify(slot, null, 2);
    const indented = reindent(slotJson, "    ");
    const trailingComma = i === composition.slots.length - 1 ? "" : ",";
    lines.push(`${indented}${trailingComma}`);
  }
  lines.push(`  ]`);
  lines.push(`}`);
  return lines.join("\n");
}
