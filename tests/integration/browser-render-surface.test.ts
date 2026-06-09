import { describe, expect, it } from "vitest";
import * as Browser from "../../src/browser/index.js";

describe("/browser public surface", () => {
  it("exports render as a function", () => {
    expect(typeof Browser.render).toBe("function");
  });

  it("exports compose, defineProvider, createMemoryCache", () => {
    expect(typeof Browser.compose).toBe("function");
    expect(typeof Browser.defineProvider).toBe("function");
    expect(typeof Browser.createMemoryCache).toBe("function");
  });
});
