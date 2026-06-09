import { describe, expectTypeOf, it } from "vitest";
import type { Transport, TransportPayload } from "../../../src/transports/types.js";

describe("Transport types", () => {
  it("TransportPayload requires bytes, mimeType optional", () => {
    expectTypeOf<TransportPayload>().toEqualTypeOf<{
      readonly bytes: Uint8Array;
      readonly mimeType?: string;
    }>();
  });

  it("Transport.send returns Promise<void>", () => {
    expectTypeOf<Transport["send"]>().returns.toEqualTypeOf<Promise<void>>();
  });
});
