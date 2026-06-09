/**
 * @fileoverview Internal structural-comparison primitive used by the
 * /testing assertion helpers. Recurses over plain objects + arrays;
 * handles Buffer/Uint8Array specially via the `ignoreBuffers` option.
 *
 * Returns null when the two values match structurally; otherwise returns
 * a `{ path, left, right, reason? }` object identifying the first
 * divergence.
 *
 * NOT a public export — consumed only by assertion helpers in
 * src/testing/index.ts.
 */

/**
 * A single point of structural divergence between two compared values.
 * `path` is a JSONPath-style locator (e.g. `$.slots[0].blockType`).
 * `reason` is set for type-class mismatches (e.g. `"buffer-type-mismatch"`).
 */
export type StructuralDiff = { path: string; left: unknown; right: unknown; reason?: string };

/**
 * Options for {@link compareStructurally}.
 * - `ignoreBuffers` (default `true`): when true, two `Uint8Array`/`Buffer`
 *   values are considered equal if their byte lengths match — content is
 *   not compared. Use `false` for byte-exact comparison.
 */
export interface CompareOptions {
  ignoreBuffers?: boolean;
}

function isBufferLike(v: unknown): v is Uint8Array {
  return v instanceof Uint8Array;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !isBufferLike(v);
}

/**
 * Recursively compare two values structurally and return the first
 * divergence, or `null` if they match. Recurses into plain objects and
 * arrays; treats `Buffer`/`Uint8Array` per the `ignoreBuffers` option.
 *
 * Internal primitive — public assertion helpers in `src/testing/index.ts`
 * wrap this and translate the diff into a thrown `AssertionError`.
 *
 * @param a Left value.
 * @param b Right value.
 * @param opts See {@link CompareOptions}.
 * @param path Internal recursion cursor; callers should omit it.
 * @returns The first {@link StructuralDiff} found, or `null` if equal.
 */
export function compareStructurally(
  a: unknown,
  b: unknown,
  opts: CompareOptions = { ignoreBuffers: true },
  path = "$",
): StructuralDiff | null {
  // Buffers: special-case before generic object recursion.
  if (isBufferLike(a) || isBufferLike(b)) {
    if (!isBufferLike(a) || !isBufferLike(b)) {
      return { path, left: a, right: b, reason: "buffer-type-mismatch" };
    }
    if (opts.ignoreBuffers) {
      if (a.length !== b.length) {
        return { path, left: a.length, right: b.length, reason: "buffer-length-mismatch" };
      }
      return null;
    }
    if (a.length !== b.length) {
      return { path, left: a.length, right: b.length, reason: "buffer-length-mismatch" };
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return { path, left: a[i], right: b[i], reason: "buffer-bytes-mismatch" };
    }
    return null;
  }

  // Arrays.
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return { path, left: a, right: b, reason: "type-mismatch" };
    }
    if (a.length !== b.length) {
      return { path, left: a.length, right: b.length, reason: "length-mismatch" };
    }
    for (let i = 0; i < a.length; i++) {
      const diff = compareStructurally(a[i], b[i], opts, `${path}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }

  // Plain objects.
  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) {
      return { path, left: a, right: b, reason: "type-mismatch" };
    }
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length || keysA.some((k, i) => k !== keysB[i])) {
      // Report path as the first key that diverges between the two sorted lists
      const allKeys = Array.from(new Set([...keysA, ...keysB])).sort();
      const missingKey = allKeys.find((k) => !keysA.includes(k) || !keysB.includes(k)) ?? "?";
      return { path: `${path}.${missingKey}`, left: keysA, right: keysB, reason: "key-mismatch" };
    }
    for (const k of keysA) {
      const diff = compareStructurally(a[k], b[k], opts, `${path}.${k}`);
      if (diff) return diff;
    }
    return null;
  }

  // Scalars.
  if (a === b) return null;
  return { path, left: a, right: b };
}
