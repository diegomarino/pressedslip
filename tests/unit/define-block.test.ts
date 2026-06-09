import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineBlock } from "../../src/define-block.js";

describe("defineBlock", () => {
  it("returns a BlockDefinition with the same shape as the spec", () => {
    const schema = z.object({ body: z.string() });
    const def = defineBlock({
      type: "textCell",
      schema,
      render: ({ data: _data }) => null,
    });
    expect(def.type).toBe("textCell");
    expect(def.schema).toBe(schema);
    expect(typeof def.render).toBe("function");
  });

  it("preserves the TData generic through render's data param", () => {
    const schema = z.object({ count: z.number() });
    const def = defineBlock({
      type: "counter",
      schema,
      render: ({ data }) => {
        // If this line type-checks, the generic threaded correctly.
        const n: number = data.count;
        void n;
        return null;
      },
    });
    // Sanity check at runtime too:
    const result = def.schema.safeParse({ count: 42 });
    expect(result.success).toBe(true);
  });

  it("preserves the optional shell field", () => {
    const def = defineBlock({
      type: "x",
      schema: z.object({}),
      render: () => null,
      shell: { showTitle: true, separator: "thin", padding: "compact" },
    });
    expect(def.shell?.showTitle).toBe(true);
  });
});
