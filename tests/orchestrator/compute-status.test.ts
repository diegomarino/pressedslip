import { describe, expect, it } from "vitest";
import {
  _computeStatus,
  computeBriefingStatus,
  type StatusCounters,
} from "../../src/orchestrator/compute-status.js";
import type { Composition } from "../../src/types.js";

function counters(p: Partial<StatusCounters>): StatusCounters {
  return {
    enabledCount: 0,
    okCount: 0,
    failCount: 0,
    suppressedCount: 0,
    renderFailCount: 0,
    providerErrorCount: 0,
    ...p,
  };
}

describe("_computeStatus truth table", () => {
  it("R1: renderFailCount > 0 → render-failed (highest priority)", () => {
    expect(_computeStatus(counters({ enabledCount: 3, okCount: 2, renderFailCount: 1 }))).toBe(
      "render-failed",
    );
  });

  it("R2: enabledCount === 0 → ready (vacuous)", () => {
    expect(_computeStatus(counters({ enabledCount: 0 }))).toBe("ready");
  });

  it("R3: okCount === enabledCount → ready", () => {
    expect(_computeStatus(counters({ enabledCount: 3, okCount: 3 }))).toBe("ready");
  });

  it("R4: okCount === 0 && failCount > 0 → failed", () => {
    expect(_computeStatus(counters({ enabledCount: 3, failCount: 3 }))).toBe("failed");
  });

  it("R5: okCount === 0 && failCount === 0 && suppressedCount > 0 → ready (all suppressed)", () => {
    expect(_computeStatus(counters({ enabledCount: 3, suppressedCount: 3 }))).toBe("ready");
  });

  it("R7: okCount > 0 && failCount > 0 → partial", () => {
    expect(_computeStatus(counters({ enabledCount: 3, okCount: 2, failCount: 1 }))).toBe("partial");
  });

  it("R8: okCount > 0 && failCount === 0 && suppressedCount > 0 → ready (ok + intentional omissions)", () => {
    expect(_computeStatus(counters({ enabledCount: 3, okCount: 2, suppressedCount: 1 }))).toBe(
      "ready",
    );
  });

  it("throws programmer error if counters violate the invariant", () => {
    // okCount + failCount + suppressedCount + renderFailCount > enabledCount
    expect(() => _computeStatus(counters({ enabledCount: 1, okCount: 2 }))).toThrow();
  });
});

describe("computeBriefingStatus (public helper)", () => {
  it("derives status from a Composition", () => {
    const composition: Composition = {
      id: "c1",
      version: 1,
      date: "2026-05-22",
      status: "ready", // existing status — ignored by helper, recomputed
      slots: [
        { index: 0, blockType: "textCell", data: { body: "a" } },
        { index: 1, blockType: "list", data: { items: [] } },
      ],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 1, fetchPhaseMs: 0, renderPhaseMs: 1 },
    };
    expect(computeBriefingStatus(composition)).toBe("ready");
  });

  it('returns "failed" when all enabled blocks are in failedBlocks', () => {
    const composition: Composition = {
      id: "c2",
      version: 1,
      date: "2026-05-22",
      status: "ready",
      slots: [],
      failedBlocks: [
        { index: 0, blockType: "textCell", reason: { name: "Error", message: "boom" } },
      ],
      providerOutcomes: {},
      timing: { totalMs: 1, fetchPhaseMs: 0, renderPhaseMs: 1 },
    };
    // enabledCount derived from slots.length + failedBlocks.length = 1
    expect(computeBriefingStatus(composition)).toBe("failed");
  });
});
