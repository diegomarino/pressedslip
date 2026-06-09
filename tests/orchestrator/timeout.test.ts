import { describe, expect, it } from "vitest";
import { TimeoutError, withTimeout } from "../../src/orchestrator/timeout.js";

describe("TimeoutError", () => {
  it('is an Error subclass with name "TimeoutError"', () => {
    const e = new TimeoutError("test", 100);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("TimeoutError");
    expect(e.message).toContain("test");
    expect(e.message).toContain("100");
  });
});

describe("withTimeout", () => {
  it("resolves with the promise value if it completes in time", async () => {
    const result = await withTimeout(Promise.resolve(42), 100, "op");
    expect(result).toBe(42);
  });

  it("rejects with TimeoutError if the promise exceeds the timeout", async () => {
    const slow = new Promise<number>((r) => setTimeout(() => r(1), 200));
    await expect(withTimeout(slow, 50, "slow-op")).rejects.toBeInstanceOf(TimeoutError);
  });

  it("propagates the original rejection if it rejects before timeout", async () => {
    const fail = Promise.reject(new Error("original failure"));
    await expect(withTimeout(fail, 100, "op")).rejects.toThrow("original failure");
  });

  it("clears its timer once the underlying promise settles", async () => {
    // Smoke test: if the timer were NOT cleared, vitest would hang past the timeout.
    const fast = Promise.resolve("done");
    const result = await withTimeout(fast, 5000, "op");
    expect(result).toBe("done");
  });
});
