// tests/orchestrator/compose-render.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { renderEnabledBlocks } from "../../src/orchestrator/compose.js";
import { mulberry32 } from "../../src/orchestrator/prng.js";

const blockA = defineBlock({
  type: "a",
  schema: z.object({ x: z.number() }),
  dependencies: ["provA"],
  render: () => null,
});

const blockNoDep = defineBlock({
  type: "nd",
  schema: z.object({}),
  render: () => null,
});

describe("renderEnabledBlocks (step 5)", () => {
  it("produces a Slot for a block whose provider returned data", () => {
    const result = renderEnabledBlocks({
      enabledBlocks: [blockA],
      providerData: { provA: { x: 42 } },
      providerOutcomes: { provA: { key: "provA", ok: "data", durationMs: 1, cacheHit: false } },
      hardAbort: false,
      ctx: {
        date: "2026-05-22",
        random: mulberry32(1),
        cache: { get: async () => undefined },
        userCtx: {},
      },
    });
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0]).toMatchObject({ index: 0, blockType: "a", data: { x: 42 } });
    expect(result.counters.okCount).toBe(1);
    expect(result.failedBlocks).toHaveLength(0);
  });

  it('marks a block FAILED when its provider returned {ok:"error"}', () => {
    const result = renderEnabledBlocks({
      enabledBlocks: [blockA],
      providerData: {},
      providerOutcomes: {
        provA: {
          key: "provA",
          ok: "error",
          durationMs: 1,
          cacheHit: false,
          reason: { name: "Error", message: "fetch failed" },
        },
      },
      hardAbort: false,
      ctx: {
        date: "2026-05-22",
        random: mulberry32(1),
        cache: { get: async () => undefined },
        userCtx: {},
      },
    });
    expect(result.slots).toHaveLength(0);
    expect(result.failedBlocks).toHaveLength(1);
    expect(result.failedBlocks[0]).toMatchObject({ blockType: "a", failedProvider: "provA" });
    expect(result.counters.failCount).toBe(1);
  });

  it('SUPPRESSES a block when its provider returned {ok:"suppressed"}', () => {
    const result = renderEnabledBlocks({
      enabledBlocks: [blockA],
      providerData: {},
      providerOutcomes: {
        provA: { key: "provA", ok: "suppressed", durationMs: 1, cacheHit: false },
      },
      hardAbort: false,
      ctx: {
        date: "2026-05-22",
        random: mulberry32(1),
        cache: { get: async () => undefined },
        userCtx: {},
      },
    });
    expect(result.slots).toHaveLength(0);
    expect(result.failedBlocks).toHaveLength(0);
    expect(result.counters.suppressedCount).toBe(1);
  });

  it("zero-dep block renders successfully without provider data", () => {
    const result = renderEnabledBlocks({
      enabledBlocks: [blockNoDep],
      providerData: {},
      providerOutcomes: {},
      hardAbort: false,
      ctx: {
        date: "2026-05-22",
        random: mulberry32(1),
        cache: { get: async () => undefined },
        userCtx: {},
      },
    });
    expect(result.slots).toHaveLength(1);
    expect(result.counters.okCount).toBe(1);
  });

  it("hardAbort=true marks ALL enabled blocks as FailedBlock with HardModeAbort", () => {
    const result = renderEnabledBlocks({
      enabledBlocks: [blockA, blockNoDep],
      providerData: {},
      providerOutcomes: {
        provA: {
          key: "provA",
          ok: "error",
          durationMs: 1,
          cacheHit: false,
          reason: { name: "Error", message: "x" },
        },
      },
      hardAbort: true,
      hardAbortProvider: "provA",
      ctx: {
        date: "2026-05-22",
        random: mulberry32(1),
        cache: { get: async () => undefined },
        userCtx: {},
      },
    });
    expect(result.slots).toHaveLength(0);
    expect(result.failedBlocks).toHaveLength(2);
    expect(result.failedBlocks.every((f) => f.reason.name === "HardModeAbort")).toBe(true);
    expect(result.failedBlocks.every((f) => f.failedProvider === "provA")).toBe(true);
    expect(result.counters.failCount).toBe(2);
  });
});
