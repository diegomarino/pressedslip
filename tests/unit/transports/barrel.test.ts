import { describe, expect, it } from "vitest";
import * as transports from "../../../src/transports/index.js";

describe("/transports barrel", () => {
  it("exports the public surface", () => {
    expect(transports).toHaveProperty("PRINT_WIDTH_DOTS", 576);
    expect(transports).toHaveProperty("PRINT_MAX_HEIGHT_DOTS", 4096);
    expect(transports).toHaveProperty("MAX_COMPRESSED_BYTES");
    expect(transports).toHaveProperty("transportError");
  });
});
