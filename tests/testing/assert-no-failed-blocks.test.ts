import { assertNoFailedBlocks } from "pressedslip/testing";
import { describe, expect, it } from "vitest";

type FailureList = {
  blocks: ReadonlyArray<unknown>;
  failedBlocks?: ReadonlyArray<unknown>;
};

describe("assertNoFailedBlocks", () => {
  it("passes when failedBlocks is empty", () => {
    const rendering: FailureList = { blocks: [], failedBlocks: [] };
    expect(() => assertNoFailedBlocks(rendering)).not.toThrow();
  });

  it("passes when failedBlocks is absent", () => {
    const rendering: FailureList = { blocks: [] };
    expect(() => assertNoFailedBlocks(rendering)).not.toThrow();
  });

  it("throws when failedBlocks is non-empty", () => {
    const rendering = {
      blocks: [],
      failedBlocks: [{ type: "kpi", error: "timeout" }],
    } satisfies FailureList;
    expect(() => assertNoFailedBlocks(rendering)).toThrow(/1 failure/);
  });

  it("includes failure info in the error message", () => {
    const rendering = {
      blocks: [],
      failedBlocks: [{ type: "kpi", error: "timeout" }],
    } satisfies FailureList;
    expect(() => assertNoFailedBlocks(rendering)).toThrow(/kpi/);
  });
});
