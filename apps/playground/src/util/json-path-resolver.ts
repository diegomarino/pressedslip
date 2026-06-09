/**
 * @fileoverview Shared JSON path→character-range resolver. Used for
 * Zod→linter position mapping: maps a Zod error path like
 * ["slots", 1, "data", "value"] to the {from, to} of that field's value,
 * so the CodeMirror lint gutter points at the right character.
 *
 * Uses `jsonc-parser` so the resolver is tolerant of JSONC syntax (line/block
 * comments + trailing commas). CodeMirror's syntax highlighting still goes
 * through @codemirror/lang-json (@lezer/json), which is fine: comments render
 * as plain text, no red squiggles fire because @codemirror/lang-json's
 * `jsonParseLinter()` is not wired — only our custom Zod linter is.
 */

import { findNodeAtLocation, type JSONPath, parseTree } from "jsonc-parser";

export type JsonRange = { from: number; to: number };

export type JsonPathSegment = string | number;

export function resolveJsonPath(text: string, path: readonly JsonPathSegment[]): JsonRange | null {
  const tree = parseTree(text, [], { allowTrailingComma: true });
  if (tree === undefined) return null;
  const node = findNodeAtLocation(tree, path as JSONPath);
  if (node === undefined) return null;
  return { from: node.offset, to: node.offset + node.length };
}
