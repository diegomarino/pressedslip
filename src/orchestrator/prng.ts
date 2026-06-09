/**
 * @fileoverview Deterministic PRNG primitives: FNV-1a 32-bit hash + mulberry32 PRNG. Used by the orchestrator to derive phase-scoped random sequences.
 */

/**
 * FNV-1a 32-bit hash. Deterministic across all JS environments.
 * Used to derive seeds for mulberry32. See spec §7.1.
 */
export function fnv1a32(input: string): number {
  // 0x811c9dc5 = FNV-1a 32-bit offset basis; 0x01000193 = FNV prime.
  // These specific constants are part of the FNV-1a spec — do not change.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * mulberry32 PRNG. 32-bit internal state. Good statistical quality for
 * content selection; NOT cryptographic. See spec §7.2.
 */
export function mulberry32(seed: number): () => number {
  // 0x6d2b79f5 is mulberry32's reference increment constant; the trailing
  // /4294967296 (2^32) maps the 32-bit unsigned result into [0, 1).
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
