/**
 * @fileoverview Status computation: the normative _computeStatus truth table (R1–R9 from spec §8.1) plus the public computeBriefingStatus helper.
 */
import type { BriefingStatus, Composition } from "../types.js";

/**
 * Counters that determine the briefing status via the _computeStatus truth table.
 * Returned by status-computation helpers; may also be accumulated during
 * provider/render phases for real-time status updates.
 */
export type StatusCounters = {
  readonly enabledCount: number;
  readonly okCount: number;
  readonly failCount: number;
  readonly suppressedCount: number;
  readonly renderFailCount: number;
  readonly providerErrorCount: number;
};

/**
 * Map counters → status per the spec §8.1 truth table. Pure function.
 * Throws a programmer error if the invariant
 * `okCount + failCount + suppressedCount + renderFailCount ≤ enabledCount`
 * is violated.
 * @internal
 */
export function _computeStatus(c: StatusCounters): BriefingStatus {
  const sum = c.okCount + c.failCount + c.suppressedCount + c.renderFailCount;
  if (sum > c.enabledCount) {
    throw new Error(
      `_computeStatus: invariant violated — sub-counters sum to ${sum} but enabledCount is ${c.enabledCount}`,
    );
  }
  if (c.renderFailCount > 0) return "render-failed"; // R1
  if (c.enabledCount === 0) return "ready"; // R2
  if (c.okCount === c.enabledCount) return "ready"; // R3
  if (c.okCount === 0 && c.failCount > 0) return "failed"; // R4
  if (c.okCount === 0 && c.failCount === 0 && c.suppressedCount > 0) return "ready"; // R5
  if (c.okCount > 0 && c.failCount > 0) return "partial"; // R7
  if (c.okCount > 0 && c.failCount === 0 && c.suppressedCount > 0) return "ready"; // R8
  throw new Error(`_computeStatus: unreachable rule fallback for counters ${JSON.stringify(c)}`);
}

/**
 * Re-derive the briefing status from a completed Composition.
 *
 * Useful after consumer mutations (e.g., manual retries that patch slots or
 * failedBlocks). Re-runs the truth table from slot/failedBlock counts. Suppressed
 * slots are not preserved in a finished Composition so their counter is treated
 * as zero (this matches the status `compose()` originally returned).
 *
 * @param composition - A Composition produced by `compose()`.
 * @returns The recomputed `BriefingStatus` based on current slot and failure counts.
 * @example
 * ```ts
 * import { computeBriefingStatus, compose, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const registry = createRegistry(builtinBlocks);
 * const composition = await compose({ providers: {}, blocks: registry, date: "2026-01-15" });
 * const status = computeBriefingStatus(composition);
 * console.log(status); // "ready"
 * ```
 */
export function computeBriefingStatus(composition: Composition): BriefingStatus {
  const okCount = composition.slots.length;
  const failCount = composition.failedBlocks.length;
  const providerErrorCount = Object.values(composition.providerOutcomes).filter(
    (o) => o.ok === "error",
  ).length;
  const enabledCount = okCount + failCount;
  // A finished Composition does NOT record suppressed slots (they were
  // intentionally omitted) or distinguish render-fail from provider-fail
  // (failedBlocks aggregates both). Re-derivation cannot reconstruct those
  // counters — set to 0 and let _computeStatus's truth table fall through
  // to the rule that matches okCount + failCount. This matches the original
  // status computation for any Composition that compose() actually returned.
  return _computeStatus({
    enabledCount,
    okCount,
    failCount,
    suppressedCount: 0,
    renderFailCount: 0,
    providerErrorCount,
  });
}
