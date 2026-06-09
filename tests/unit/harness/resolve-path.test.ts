import { describe, expect, it } from "vitest";
import type { Slot } from "../../../src/types.js";
import { resolvePath } from "../../harness/resolve-path.js";

const slot: Slot = {
  index: 0,
  blockType: "list",
  title: "Today's items",
  data: {
    items: [
      { title: "Sample Event 1", done: false },
      { title: "B", done: true },
    ],
  },
};

describe("resolvePath", () => {
  it("reads top-level Slot.title", () => {
    expect(resolvePath(slot, "title")).toBe("Today's items");
  });

  it("reads top-level Slot.blockType", () => {
    expect(resolvePath(slot, "blockType")).toBe("list");
  });

  it("reads top-level Slot.index", () => {
    expect(resolvePath(slot, "index")).toBe(0);
  });

  it("reads nested data subpath via identifiers", () => {
    expect(resolvePath(slot, "data.items.0.title")).toBe("Sample Event 1");
  });

  it("throws INVALID_CONTENT_PATH on empty path", () => {
    expect(() => resolvePath(slot, "")).toThrow(
      expect.objectContaining({ code: "INVALID_CONTENT_PATH" }),
    );
  });

  it("throws INVALID_CONTENT_PATH on double-dot syntax", () => {
    expect(() => resolvePath(slot, "data..foo")).toThrow(
      expect.objectContaining({ code: "INVALID_CONTENT_PATH" }),
    );
  });

  it("throws INVALID_CONTENT_PATH when traversal hits a non-object", () => {
    expect(() => resolvePath(slot, "title.X")).toThrow(
      expect.objectContaining({ code: "INVALID_CONTENT_PATH" }),
    );
  });
});
