import { describe, expectTypeOf, it } from "vitest";
import type {
  Block,
  BlockDefinition,
  BlockDefinitionSpec,
  BlockShellOptions,
  BriefingStatus,
  Cache,
  Composition,
  FailedBlock,
  LoadedFont,
  Logger,
  PaperPreset,
  Registry,
  RenderContext,
  Rendering,
  RenderOptions,
  Slot,
  Subject,
  WidthSpec,
} from "../../src/types.js";

describe("public type surface", () => {
  it("Composition has the required structural fields", () => {
    expectTypeOf<Composition>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<Composition>().toHaveProperty("version").toEqualTypeOf<number>();
    expectTypeOf<Composition>().toHaveProperty("date").toEqualTypeOf<string>();
    expectTypeOf<Composition>().toHaveProperty("status").toEqualTypeOf<BriefingStatus>();
    expectTypeOf<Composition>().toHaveProperty("slots").toEqualTypeOf<readonly Slot[]>();
  });

  it("Composition.subject is optional Subject", () => {
    expectTypeOf<Composition["subject"]>().toEqualTypeOf<Subject | undefined>();
  });

  it("Composition.meta is optional Record", () => {
    expectTypeOf<Composition["meta"]>().toEqualTypeOf<Record<string, unknown> | undefined>();
  });

  it("Block has required type, id, data and optional title", () => {
    expectTypeOf<Block>().toHaveProperty("type").toEqualTypeOf<string>();
    expectTypeOf<Block>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<Block>().toHaveProperty("data").toEqualTypeOf<unknown>();
    expectTypeOf<Block["title"]>().toEqualTypeOf<string | undefined>();
  });

  it("Rendering.failedBlocks is required FailedBlock[]", () => {
    expectTypeOf<Rendering>().toHaveProperty("failedBlocks").toEqualTypeOf<FailedBlock[]>();
  });

  it("Logger has exactly 4 methods", () => {
    expectTypeOf<Logger>().toHaveProperty("debug");
    expectTypeOf<Logger>().toHaveProperty("info");
    expectTypeOf<Logger>().toHaveProperty("warn");
    expectTypeOf<Logger>().toHaveProperty("error");
  });

  it("WidthSpec is a discriminated union", () => {
    expectTypeOf<WidthSpec>().toMatchTypeOf<{ mm: number; dpi?: number } | { px: number }>();
  });

  it("PaperPreset extends WidthSpec with optional informational fields", () => {
    const p: PaperPreset = { px: 576, paperWidthMm: 80, edgeMarginPxPerSide: 32 };
    expectTypeOf(p).toMatchTypeOf<PaperPreset>();
  });

  it("BlockDefinition<TData> generic threads through render", () => {
    type WeatherData = { temperature: number };
    type WeatherDef = BlockDefinition<WeatherData>;
    expectTypeOf<Parameters<WeatherDef["render"]>[0]["data"]>().toEqualTypeOf<WeatherData>();
  });
});
