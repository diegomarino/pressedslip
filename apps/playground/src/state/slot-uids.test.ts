import { describe, expect, it } from "vitest";
import { newSlotUid, regenerateSlotUids } from "./slot-uids.js";

describe("newSlotUid", () => {
  it("returns a non-empty string", () => {
    const uid = newSlotUid();
    expect(typeof uid).toBe("string");
    expect(uid.length).toBeGreaterThan(0);
  });

  it("returns distinct values on each call", () => {
    const uids = new Set(Array.from({ length: 100 }, () => newSlotUid()));
    expect(uids.size).toBe(100);
  });
});

describe("regenerateSlotUids", () => {
  it("returns N fresh UIDs for an array of length N", () => {
    const uids = regenerateSlotUids(5);
    expect(uids).toHaveLength(5);
    expect(new Set(uids).size).toBe(5);
  });

  it("returns empty array for length 0", () => {
    expect(regenerateSlotUids(0)).toEqual([]);
  });
});
