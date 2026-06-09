import * as Root from "pressedslip";
import * as Browser from "pressedslip/browser";
import * as Providers from "pressedslip/providers";
import * as Testing from "pressedslip/testing";
import * as Transports from "pressedslip/transports";
import { describe, expect, it } from "vitest";

function surfaceOf(mod: Record<string, unknown>): string[] {
  return Object.keys(mod).sort();
}

describe("public API surface", () => {
  it("locks the root entry surface", () => {
    expect(surfaceOf(Root)).toMatchSnapshot();
  });

  it("locks the /testing entry surface", () => {
    expect(surfaceOf(Testing)).toMatchSnapshot();
  });

  it("locks the /providers entry surface", () => {
    expect(surfaceOf(Providers)).toMatchSnapshot();
  });

  it("locks the /browser entry surface", () => {
    expect(surfaceOf(Browser)).toMatchSnapshot();
  });

  it("locks the /transports entry surface", () => {
    expect(surfaceOf(Transports)).toMatchSnapshot();
  });
});
