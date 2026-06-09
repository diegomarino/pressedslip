/**
 * @fileoverview Resolve a dotted path against a Slot. Used by the replay
 * harness to evaluate `contentChecks`. Path grammar (spec §3 Decision 5):
 *
 *   path     := top | data
 *   top      := "title" | "blockType" | "index"
 *   data     := "data" ( "." identifier | "." digits )+
 */

import type { Slot } from "../../src/types.js";

const PATH_RE = /^(title|blockType|index|data(?:\.[a-zA-Z_$][\w$]*|\.\d+)+)$/;

export function resolvePath(slot: Slot, path: string): unknown {
  if (!PATH_RE.test(path)) {
    const err = new Error(`Invalid contentCheck path: "${path}"`);
    (err as Error & { code: string }).code = "INVALID_CONTENT_PATH";
    throw err;
  }
  if (path === "title" || path === "blockType" || path === "index") {
    return (slot as unknown as Record<string, unknown>)[path];
  }
  // data.<subpath>
  const segs = path.split(".").slice(1); // drop "data"
  let cur: unknown = slot.data;
  for (const seg of segs) {
    if (cur === null || typeof cur !== "object") {
      const err = new Error(`Path "${path}" traversed into non-object at "${seg}"`);
      (err as Error & { code: string }).code = "INVALID_CONTENT_PATH";
      throw err;
    }
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}
