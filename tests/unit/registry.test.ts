import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";
import { createRegistry } from "../../src/registry.js";
import type { AnyBlockDefinition, BlockDefinition } from "../../src/types.js";

const fakeDef = (type: string): BlockDefinition => ({
  type,
  schema: { parse: (x: unknown) => x, safeParse: () => ({ success: true, data: {} }) } as never,
  render: () => null,
});

describe("createRegistry", () => {
  it("returns a Registry object with find/list/has/size", () => {
    const r = createRegistry([fakeDef("a"), fakeDef("b")]);
    expect(r.size).toBe(2);
    expect(r.has("a")).toBe(true);
    expect(r.has("c")).toBe(false);
    expect(r.find("a")?.type).toBe("a");
    expect(r.find("c")).toBeUndefined();
    expect(r.list().map((d) => d.type)).toEqual(["a", "b"]);
  });

  it("throws on duplicate types", () => {
    expect(() => createRegistry([fakeDef("a"), fakeDef("a")])).toThrow(/duplicate.*type.*a/i);
  });

  it("list() returns a frozen view (does not allow caller mutation)", () => {
    const r = createRegistry([fakeDef("a")]);
    const list = r.list();
    expect(() => {
      (list as BlockDefinition[]).push(fakeDef("b"));
    }).toThrow();
  });

  it("empty registry works", () => {
    const r = createRegistry([]);
    expect(r.size).toBe(0);
    expect(r.find("anything")).toBeUndefined();
    expect(r.has("anything")).toBe(false);
  });

  it("type-level: AnyBlockDefinition is required for heterogeneous-TData arrays", () => {
    const a = defineBlock({
      type: "a",
      schema: z.object({ x: z.string() }),
      render: () => null,
    });
    const b = defineBlock({
      type: "b",
      schema: z.object({ y: z.number() }),
      render: () => null,
    });

    // BlockDefinition<TData> is invariant: BlockDefinition<{x:string}> is NOT
    // assignable to BlockDefinition<unknown>, so a mixed-TData array cannot be
    // typed as BlockDefinition<unknown>[].
    // @ts-expect-error — invariance proof: removing this line means AnyBlockDefinition was reverted.
    const fails: readonly BlockDefinition<unknown>[] = [a, b];
    void fails;

    // AnyBlockDefinition is the existential escape that makes the same array
    // assignable, with no `any` leakage into the registry's public surface.
    const ok: readonly AnyBlockDefinition[] = [a, b];
    expect(ok.length).toBe(2);
  });

  it("accepts a readonly array of AnyBlockDefinition", () => {
    const a = defineBlock({
      type: "a",
      schema: z.object({ x: z.string() }),
      render: () => null,
    });
    const b = defineBlock({
      type: "b",
      schema: z.object({ y: z.number() }),
      render: () => null,
    });
    // Mixed TData. Was a TS error before; AnyBlockDefinition makes it valid.
    const defs: readonly AnyBlockDefinition[] = Object.freeze([a, b]);
    const r = createRegistry(defs);
    expect(r.size).toBe(2);
    expect(r.has("a")).toBe(true);
    expect(r.has("b")).toBe(true);
  });
});
