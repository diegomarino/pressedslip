/**
 * @fileoverview Tests for composeTree — specifically RenderContext.theme and fontRoles wiring.
 */
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../define-block.js";
import { noopLogger } from "../../logger.js";
import { createRegistry } from "../../registry.js";
import type { Composition, RenderContext } from "../../types.js";
import { composeTree } from "../compose-tree.js";

/** Minimal valid Composition for unit tests — only the fields composeTree reads. */
function makeComposition(overrides: Partial<Composition> = {}): Composition {
  return {
    id: "test-id",
    version: 1,
    date: "2026-05-27",
    status: "ready",
    slots: [],
    failedBlocks: [],
    providerOutcomes: {},
    timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    ...overrides,
  };
}

describe("composeTree — RenderContext.theme + fontRoles", () => {
  it("populates ctx.theme with SHELL_DEFAULTS and ctx.fontRoles={} when no prepared theme passed", () => {
    const spy = vi.fn((_ctx: RenderContext) => null);
    const block = defineBlock({
      type: "spy",
      schema: z.object({}),
      render: ({ ctx }) => {
        spy(ctx);
        return null;
      },
    });

    const composition = makeComposition({
      slots: [{ index: 0, blockType: "spy", data: {}, title: "T" }],
    });

    composeTree(composition, {
      registry: createRegistry([block]),
      logger: noopLogger,
      onUnknownType: "skip",
      onBlockError: "skip",
      width: 576,
      dpi: 203,
    });

    expect(spy).toHaveBeenCalledOnce();
    const ctx = spy.mock.calls[0]?.[0] as RenderContext;
    expect(ctx.theme).toBeDefined();
    expect(ctx.theme.textStyles.body).toEqual({ fontSize: 20 });
    expect(ctx.fontRoles).toEqual({});
    // contentWidth = paper width (576) minus 2×24px shell horizontal padding.
    expect(ctx.contentWidth).toBe(528);
    expect(ctx.dpi).toBe(203);
  });
});
