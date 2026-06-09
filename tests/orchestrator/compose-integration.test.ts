// tests/orchestrator/compose-integration.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { compose } from "../../src/orchestrator/compose.js";
import { defineProvider } from "../../src/providers/define-provider.js";
import { createProviderRegistry } from "../../src/providers/registry.js";
import { createRegistry } from "../../src/registry.js";

const weatherProvider = defineProvider({
  key: "weather",
  scope: "shared",
  freshness: "per-day",
  fetch: async () => ({ ok: "data", value: { temp: 20 } }),
});

const blockWeather = defineBlock({
  type: "wx",
  schema: z.object({ temp: z.number() }),
  dependencies: ["weather"],
  render: () => null,
});

const blockStatic = defineBlock({
  type: "st",
  schema: z.object({}),
  render: () => null,
});

describe("compose() end-to-end", () => {
  it('happy path: returns Composition with status:"ready" + slots filled', async () => {
    const composition = await compose({
      providers: createProviderRegistry({ weather: weatherProvider }),
      blocks: createRegistry([blockWeather, blockStatic]),
      date: "2026-05-22",
    });
    expect(composition.status).toBe("ready");
    expect(composition.slots).toHaveLength(2);
    expect(composition.failedBlocks).toHaveLength(0);
    expect(composition.providerOutcomes.weather?.ok).toBe("data");
    expect(composition.timing.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("produces a deterministic Composition for same (date, subjectId)", async () => {
    const personalProvider = defineProvider({
      key: "quote",
      scope: "personal",
      freshness: "per-day",
      fetch: async (ctx) => ({ ok: "data", value: { idx: Math.floor(ctx.random() * 100) } }),
    });
    const blockQuote = defineBlock({
      type: "q",
      schema: z.object({ idx: z.number() }),
      dependencies: ["quote"],
      render: () => null,
    });
    const args = {
      providers: createProviderRegistry({ quote: personalProvider }),
      blocks: createRegistry([blockQuote]),
      date: "2026-05-22",
      ctx: { subjectId: "user-1" },
    };
    const a = await compose(args);
    const b = await compose(args);
    expect(JSON.stringify(a.slots)).toBe(JSON.stringify(b.slots));
  });

  it('parallel-hard with one error → status:"failed", all enabled blocks in failedBlocks', async () => {
    const failing = defineProvider({
      key: "bad",
      scope: "shared",
      freshness: "per-day",
      fetch: async () => {
        throw new Error("boom");
      },
    });
    const block = defineBlock({
      type: "b",
      schema: z.object({}),
      dependencies: ["bad"],
      render: () => null,
    });
    const composition = await compose({
      providers: createProviderRegistry({ bad: failing }),
      blocks: createRegistry([block, blockStatic]),
      date: "2026-05-22",
      mode: "parallel-hard",
    });
    expect(composition.status).toBe("failed");
    expect(composition.failedBlocks).toHaveLength(2);
    expect(composition.slots).toHaveLength(0);
  });

  it("JSON-serializes round-trip (M14 payloadJson contract)", async () => {
    const composition = await compose({
      providers: createProviderRegistry({ weather: weatherProvider }),
      blocks: createRegistry([blockWeather]),
      date: "2026-05-22",
    });
    const json = JSON.stringify(composition);
    const parsed = JSON.parse(json);
    expect(parsed.status).toBe(composition.status);
    expect(parsed.slots).toEqual(composition.slots);
  });
});
