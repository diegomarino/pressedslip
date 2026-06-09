import { describe, expect, it } from "vitest";

describe("scaffold smoke", () => {
  it("imports the package entry without error", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});
