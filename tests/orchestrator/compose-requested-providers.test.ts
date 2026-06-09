// tests/orchestrator/compose-requested-providers.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { computeRequestedProviders } from "../../src/orchestrator/compose.js";

const blockWeather = defineBlock({
  type: "wx",
  schema: z.object({}),
  dependencies: ["weather"],
  render: () => null,
});
const blockProfile = defineBlock({
  type: "pr",
  schema: z.object({}),
  dependencies: ["profile"],
  render: () => null,
});
const blockBoth = defineBlock({
  type: "bo",
  schema: z.object({}),
  dependencies: ["weather", "profile"],
  render: () => null,
});
const blockZero = defineBlock({ type: "zr", schema: z.object({}), render: () => null });

describe("computeRequestedProviders", () => {
  it("returns the union of dependencies across enabled blocks", () => {
    const result = computeRequestedProviders([blockWeather, blockProfile, blockZero], null);
    expect([...result].sort()).toEqual(["profile", "weather"]);
  });

  it("returns an empty set when only zero-dep blocks are enabled", () => {
    const result = computeRequestedProviders([blockZero], null);
    expect(result.size).toBe(0);
  });

  it("filters by onlyTypes when provided", () => {
    const result = computeRequestedProviders([blockWeather, blockProfile, blockBoth], ["wx"]);
    expect([...result]).toEqual(["weather"]);
  });

  it("deduplicates dependencies across multiple blocks", () => {
    const result = computeRequestedProviders([blockWeather, blockBoth], null);
    expect([...result].sort()).toEqual(["profile", "weather"]);
  });
});
