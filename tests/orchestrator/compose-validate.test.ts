// tests/orchestrator/compose-validate.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { compose } from "../../src/orchestrator/compose.js";
import { defineProvider } from "../../src/providers/define-provider.js";
import { createProviderRegistry } from "../../src/providers/registry.js";
import { createRegistry } from "../../src/registry.js";

const personalProvider = defineProvider({
  key: "profile",
  scope: "personal",
  freshness: "per-day",
  fetch: async () => ({ ok: "data", value: { name: "x" } }),
});

const sharedProvider = defineProvider({
  key: "weather",
  scope: "shared",
  freshness: "per-day",
  fetch: async () => ({ ok: "data", value: { temp: 20 } }),
});

const hourlyProvider = defineProvider({
  key: "market",
  scope: "shared",
  freshness: "per-hour",
  fetch: async () => ({ ok: "data", value: 1 }),
});

const blockA = defineBlock({
  type: "a",
  schema: z.object({}),
  dependencies: ["weather"],
  render: () => null,
});

describe("compose() — input validation (step 1)", () => {
  it("throws when providers registry is missing", async () => {
    // @ts-expect-error intentional bad input
    await expect(compose({ blocks: createRegistry([]), date: "2026-05-22" })).rejects.toThrow(
      /providers/i,
    );
  });

  it("throws when date is malformed", async () => {
    await expect(
      compose({
        providers: createProviderRegistry({}),
        blocks: createRegistry([]),
        date: "not-a-date",
      }),
    ).rejects.toThrow(/date/i);
  });

  it("throws when block declares a dependency on an unregistered provider key", async () => {
    await expect(
      compose({
        providers: createProviderRegistry({}),
        blocks: createRegistry([blockA]),
        date: "2026-05-22",
      }),
    ).rejects.toThrow(/dependency 'weather'/);
  });

  it("throws when onlyTypes is non-null but previousComposition is missing", async () => {
    await expect(
      compose({
        providers: createProviderRegistry({ weather: sharedProvider }),
        blocks: createRegistry([blockA]),
        date: "2026-05-22",
        onlyTypes: ["a"],
      }),
    ).rejects.toThrow(/previousComposition/i);
  });

  it("throws when ctx.subjectId is missing and a provider has scope:personal", async () => {
    await expect(
      compose({
        providers: createProviderRegistry({ profile: personalProvider }),
        blocks: createRegistry([
          defineBlock({
            type: "p",
            schema: z.object({}),
            dependencies: ["profile"],
            render: () => null,
          }),
        ]),
        date: "2026-05-22",
      }),
    ).rejects.toThrow(/subjectId/);
  });

  it("throws when ctx.subjectId is empty string", async () => {
    await expect(
      compose({
        providers: createProviderRegistry({ profile: personalProvider }),
        blocks: createRegistry([
          defineBlock({
            type: "p",
            schema: z.object({}),
            dependencies: ["profile"],
            render: () => null,
          }),
        ]),
        date: "2026-05-22",
        ctx: { subjectId: "" },
      }),
    ).rejects.toThrow(/subjectId/);
  });

  it("throws when ctx.hour is missing and a provider has freshness:per-hour", async () => {
    await expect(
      compose({
        providers: createProviderRegistry({ market: hourlyProvider }),
        blocks: createRegistry([
          defineBlock({
            type: "m",
            schema: z.object({}),
            dependencies: ["market"],
            render: () => null,
          }),
        ]),
        date: "2026-05-22",
      }),
    ).rejects.toThrow(/hour/);
  });
});
