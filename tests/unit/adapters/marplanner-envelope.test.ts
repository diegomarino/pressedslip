import { describe, expect, it } from "vitest";
import { adaptToComposition } from "../../../src/_internal/adapters/marplanner-envelope.js";
import type { BriefingEnvelopeV1 } from "../../../src/_internal/adapters/types.js";

const knownBlockTypes = new Set(["text-cell", "kpi", "list", "key-value", "qa-pair", "quotation"]);

describe("adaptToComposition", () => {
  it("maps empty envelope to an empty Composition with status 'ready'", async () => {
    const env: BriefingEnvelopeV1 = {
      version: 1,
      date: "2024-01-01",
      member: { id: "m1", name: "Sample Name 1" },
      blocks: [],
    };
    const comp = await adaptToComposition(env, { knownBlockTypes });
    expect(comp.date).toBe("2024-01-01");
    expect(comp.slots).toEqual([]);
    expect(comp.failedBlocks).toEqual([]);
    expect(comp.status).toBe("ready");
  });

  it("REPLAY-ONLY invariant: maps envelope.blocks directly to slots (no provider fetch)", async () => {
    const env: BriefingEnvelopeV1 = {
      version: 1,
      date: "2024-01-01",
      member: { id: "m1", name: "Sample Name 1" },
      blocks: [{ type: "list", id: "LST-A1", title: "Today's items", data: { items: ["a", "b"] } }],
    };
    const comp = await adaptToComposition(env, { knownBlockTypes });
    expect(comp.slots).toHaveLength(1);
    expect(comp.slots[0]?.blockType).toBe("list");
    expect(comp.slots[0]?.title).toBe("Today's items");
    expect(comp.slots[0]?.index).toBe(0);
    expect((comp.slots[0]?.data as { items: string[] }).items).toEqual(["a", "b"]);
    expect(comp.status).toBe("ready");
  });

  it("unknown block types route to failedBlocks → status 'partial'", async () => {
    const env: BriefingEnvelopeV1 = {
      version: 1,
      date: "2024-01-01",
      member: { id: "m1", name: "Sample Name 1" },
      blocks: [
        { type: "list", id: "LST-A1", title: "ok", data: { items: ["x"] } },
        { type: "unknown-block-type-v99", id: "UNK-1", title: "?", data: {} },
      ],
    };
    const comp = await adaptToComposition(env, { knownBlockTypes });
    expect(comp.slots).toHaveLength(1);
    expect(comp.slots[0]?.blockType).toBe("list");
    expect(comp.failedBlocks).toHaveLength(1);
    expect(comp.failedBlocks[0]?.blockType).toBe("unknown-block-type-v99");
    expect(comp.status).toBe("partial");
  });

  it("all blocks failing → status 'failed'", async () => {
    const env: BriefingEnvelopeV1 = {
      version: 1,
      date: "2024-01-01",
      member: { id: "m1", name: "Sample Name 1" },
      blocks: [
        { type: "unknown-1", id: "U1", title: "?", data: {} },
        { type: "unknown-2", id: "U2", title: "?", data: {} },
      ],
    };
    const comp = await adaptToComposition(env, { knownBlockTypes });
    expect(comp.slots).toEqual([]);
    expect(comp.failedBlocks).toHaveLength(2);
    expect(comp.status).toBe("failed");
  });

  it("preserves envelope.date + sets composition.subject.id from envelope.member.id", async () => {
    const env: BriefingEnvelopeV1 = {
      version: 1,
      date: "2025-03-14",
      member: { id: "m42", name: "Sample Name 42" },
      blocks: [],
    };
    const comp = await adaptToComposition(env, { knownBlockTypes });
    expect(comp.date).toBe("2025-03-14");
    expect(comp.subject?.id).toBe("m42");
  });
});
