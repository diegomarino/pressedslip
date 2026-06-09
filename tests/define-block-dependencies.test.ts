// tests/define-block-dependencies.test.ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../src/define-block.js";

describe("defineBlock dependencies", () => {
  it("accepts an optional dependencies array", () => {
    const b = defineBlock({
      type: "weather-card",
      schema: z.object({ temp: z.number() }),
      dependencies: ["weather"],
      render: () => null,
    });
    expect(b.dependencies).toEqual(["weather"]);
  });

  it("omits dependencies entirely when not declared (backwards compat)", () => {
    const b = defineBlock({
      type: "static",
      schema: z.object({}),
      render: () => null,
    });
    expect(b.dependencies).toBeUndefined();
  });
});
