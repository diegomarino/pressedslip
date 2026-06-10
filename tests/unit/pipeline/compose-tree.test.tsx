import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { listBlock } from "../../../src/blocks/list.js";
import { textCellBlock } from "../../../src/blocks/text-cell.js";
import { noopLogger } from "../../../src/logger.js";
import { composeTree } from "../../../src/pipeline/compose-tree.js";
import { createRegistry } from "../../../src/registry.js";
import type { BlockDefinition, Composition } from "../../../src/types.js";

const registry = createRegistry([textCellBlock, listBlock] as BlockDefinition[]);

/** Minimal required Composition fields. */
const BASE: Pick<Composition, "status" | "failedBlocks" | "providerOutcomes" | "timing"> = {
  status: "ready",
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

describe("composeTree — happy path", () => {
  it("renders a single textCell block", () => {
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", title: "MESSAGE", data: { text: "hi" } }],
    };
    const { element, failedBlocks } = composeTree(composition, {
      registry,
      logger: noopLogger,
      onUnknownType: "warn",
      onBlockError: "skip",
      width: 576,
      dpi: 203,
    });
    expect(failedBlocks).toEqual([]);
    const html = renderToStaticMarkup(element);
    expect(html).toContain("hi");
    expect(html).toContain("MESSAGE");
    expect(html).toContain("2026-05-19");
  });
});

describe("composeTree — unknown type", () => {
  it('records the drop and warns when onUnknownType="warn"', () => {
    const warn = vi.fn();
    const logger = { ...noopLogger, warn };
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "wheather", data: {} }],
    };
    const { failedBlocks } = composeTree(composition, {
      registry,
      logger,
      onUnknownType: "warn",
      onBlockError: "skip",
      width: 576,
      dpi: 203,
    });
    expect(failedBlocks).toHaveLength(1);
    expect(failedBlocks[0]?.blockType).toBe("wheather");
    expect(failedBlocks[0]?.reason.message).toMatch(/unknown.*type/i);
    expect(warn).toHaveBeenCalled();
  });

  it('records the drop silently when onUnknownType="skip"', () => {
    const warn = vi.fn();
    const logger = { ...noopLogger, warn };
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "wheather", data: {} }],
    };
    const { failedBlocks } = composeTree(composition, {
      registry,
      logger,
      onUnknownType: "skip",
      onBlockError: "skip",
      width: 576,
      dpi: 203,
    });
    expect(failedBlocks).toHaveLength(1); // ALWAYS recorded
    expect(warn).not.toHaveBeenCalled();
  });

  it('throws when onUnknownType="throw"', () => {
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "wheather", data: {} }],
    };
    expect(() =>
      composeTree(composition, {
        registry,
        logger: noopLogger,
        onUnknownType: "throw",
        onBlockError: "skip",
        width: 576,
        dpi: 203,
      }),
    ).toThrow(/unknown block type/i);
  });
});

describe("composeTree — schema validation failure", () => {
  it("records the failure when block.data is invalid", () => {
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "textCell", data: { wrong: "shape" } }],
    };
    const { failedBlocks } = composeTree(composition, {
      registry,
      logger: noopLogger,
      onUnknownType: "warn",
      onBlockError: "skip",
      width: 576,
      dpi: 203,
    });
    expect(failedBlocks).toHaveLength(1);
    expect(failedBlocks[0]?.reason.message).toMatch(/schema validation failed/i);
  });
});

describe("composeTree — render exception", () => {
  it("records the failure when block.render throws", () => {
    const explodingRegistry = createRegistry([
      {
        type: "bomb",
        schema: { safeParse: () => ({ success: true, data: {} }) } as never,
        render: () => {
          throw new Error("boom");
        },
      },
    ]);
    const composition: Composition = {
      ...BASE,
      id: "c1",
      version: 1,
      date: "2026-05-19",
      slots: [{ index: 0, blockType: "bomb", data: {} }],
    };
    const { failedBlocks } = composeTree(composition, {
      registry: explodingRegistry,
      logger: noopLogger,
      onUnknownType: "warn",
      onBlockError: "skip",
      width: 576,
      dpi: 203,
    });
    expect(failedBlocks).toHaveLength(1);
    expect(failedBlocks[0]?.reason.message).toContain("boom");
  });
});
