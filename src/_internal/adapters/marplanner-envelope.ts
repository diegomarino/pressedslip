/**
 * @fileoverview Replay-harness adapter scaffold. Maps a sanitized
 * `BriefingEnvelopeV1` snapshot directly onto a `Composition`.
 *
 * REPLAY-ONLY: this adapter MUST NOT call provider fetch() methods. The
 * envelope already contains snapshot data; adapter is a pure transformation.
 *
 * Coverage: only block shapes present in committed replay fixtures
 * (tests/fixtures/replay/). Production shapes outside the fixture subset are
 * deferred. This adapter is read-only; production adapter support lives in
 * marplanner.
 */

import { randomUUID } from "node:crypto";
import { _computeStatus } from "../../orchestrator/compute-status.js";
import type { Composition, FailedBlock, Slot, Subject } from "../../types.js";
import type { BriefingEnvelopeV1 } from "./types.js";

/**
 * Replay-side dependencies. `knownBlockTypes` lets the harness say "treat
 * these block types as valid; anything else is a failedBlock."
 */
export interface AdapterDeps {
  readonly knownBlockTypes: ReadonlySet<string>;
}

/**
 * Maps a sanitized `BriefingEnvelopeV1` snapshot to a `Composition`.
 *
 * Status derivation uses the canonical `_computeStatus` truth table.
 * In the replay context: `enabledCount = slots + failedBlocks`,
 * `okCount = slots.length`, `failCount = failedBlocks.length`. Suppressed and
 * render-fail counters are zero (replay adapter never invokes render or
 * suppression logic).
 */
export async function adaptToComposition(
  envelope: BriefingEnvelopeV1,
  deps: AdapterDeps,
): Promise<Composition> {
  const slots: Slot[] = [];
  const failedBlocks: FailedBlock[] = [];

  for (let i = 0; i < envelope.blocks.length; i++) {
    const b = envelope.blocks[i];
    if (b === undefined) continue;
    if (deps.knownBlockTypes.has(b.type)) {
      slots.push({
        index: i,
        blockType: b.type,
        data: b.data,
        title: b.title,
      });
    } else {
      failedBlocks.push({
        index: i,
        blockType: b.type,
        reason: {
          name: "UnknownBlockType",
          message: `Unknown block type "${b.type}" (fixture-subset coverage only)`,
        },
      });
    }
  }

  const subject: Subject = { id: envelope.member.id, name: envelope.member.name };

  const status = _computeStatus({
    enabledCount: slots.length + failedBlocks.length,
    okCount: slots.length,
    failCount: failedBlocks.length,
    suppressedCount: 0,
    renderFailCount: 0,
    providerErrorCount: 0,
  });

  return {
    id: randomUUID(),
    version: envelope.version,
    date: envelope.date,
    status,
    slots,
    failedBlocks,
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    subject,
  };
}
