// tests/types.test-d.ts
import { describe, expectTypeOf, it } from "vitest";
import type {
  BriefingStatus,
  Cache,
  ComposeContext,
  ComposeOptions,
  Composition,
  FailedBlock,
  ProviderContext,
  ProviderDefinition,
  ProviderOutcome,
  ProviderResult,
  ReadOnlyCache,
  SerializableError,
  Slot,
  TimingInfo,
} from "../src/types.js";

describe("public type surface", () => {
  it("BriefingStatus is the 5-state union", () => {
    expectTypeOf<BriefingStatus>().toEqualTypeOf<
      "pending" | "ready" | "partial" | "failed" | "render-failed"
    >();
  });

  it("Slot has index, blockType, data, and optional title", () => {
    expectTypeOf<Slot>().toEqualTypeOf<{
      readonly index: number;
      readonly blockType: string;
      readonly data: unknown;
      readonly title?: string;
    }>();
  });

  it("FailedBlock uses SerializableError reason", () => {
    expectTypeOf<FailedBlock["reason"]>().toEqualTypeOf<SerializableError>();
    expectTypeOf<FailedBlock["index"]>().toEqualTypeOf<number>();
    expectTypeOf<FailedBlock["blockType"]>().toEqualTypeOf<string>();
  });

  it("Composition.status is BriefingStatus and slots is readonly Slot[]", () => {
    expectTypeOf<Composition["status"]>().toEqualTypeOf<BriefingStatus>();
    expectTypeOf<Composition["slots"]>().toEqualTypeOf<readonly Slot[]>();
  });

  it("ProviderResult is discriminated by ok", () => {
    type R = ProviderResult<number>;
    expectTypeOf<Extract<R, { ok: "data" }>>().toMatchTypeOf<{ ok: "data"; value: number }>();
    expectTypeOf<Extract<R, { ok: "suppressed" }>>().toMatchTypeOf<{ ok: "suppressed" }>();
    expectTypeOf<Extract<R, { ok: "error" }>>().toMatchTypeOf<{
      ok: "error";
      reason: SerializableError;
    }>();
  });

  it("ReadOnlyCache exposes only get", () => {
    expectTypeOf<ReadOnlyCache>().toEqualTypeOf<{
      get<T>(key: string): Promise<T | undefined>;
    }>();
  });

  it("Cache extends ReadOnlyCache with set/delete/clear", () => {
    expectTypeOf<Cache["get"]>().toEqualTypeOf<ReadOnlyCache["get"]>();
    expectTypeOf<Cache["set"]>().toBeFunction();
    expectTypeOf<Cache["delete"]>().toBeFunction();
    expectTypeOf<Cache["clear"]>().toBeFunction();
  });
});
