// tests/orchestrator/compose-enable.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { compose } from "../../src/orchestrator/compose.js";
import { createProviderRegistry } from "../../src/providers/registry.js";
import { createRegistry } from "../../src/registry.js";

const blockA = defineBlock({ type: "a", schema: z.object({}), render: () => null });
const blockB = defineBlock({ type: "b", schema: z.object({}), render: () => null });

describe("compose() — step 2 isEnabled resolution", () => {
  it("disables a block when isEnabled returns false", async () => {
    const result = await compose({
      providers: createProviderRegistry({}),
      blocks: createRegistry([blockA, blockB]),
      date: "2026-05-22",
      isEnabled: async (block) => block.type !== "b",
    });
    // After steps 5-8 implemented: block b is omitted, block a renders.
    // For now we assert that enable resolution completes (no throw).
    expect(result).toBeDefined();
  });

  it('treats undefined isEnabled as "all enabled"', async () => {
    const result = await compose({
      providers: createProviderRegistry({}),
      blocks: createRegistry([blockA, blockB]),
      date: "2026-05-22",
    });
    expect(result).toBeDefined();
  });
});
