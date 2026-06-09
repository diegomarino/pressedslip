import { describe, expect, it } from "vitest";
import {
  MAX_COMPRESSED_BYTES,
  PRINT_MAX_HEIGHT_DOTS,
  PRINT_WIDTH_DOTS,
} from "../../../src/transports/constants.js";

describe("transport constants", () => {
  it("PRINT_WIDTH_DOTS is 576 (80mm thermal @ 203dpi)", () => {
    expect(PRINT_WIDTH_DOTS).toBe(576);
  });

  it("PRINT_MAX_HEIGHT_DOTS bounds receipt length", () => {
    expect(PRINT_MAX_HEIGHT_DOTS).toBe(4096);
  });

  it("MAX_COMPRESSED_BYTES is 10 MiB", () => {
    expect(MAX_COMPRESSED_BYTES).toBe(10 * 1024 * 1024);
  });
});
