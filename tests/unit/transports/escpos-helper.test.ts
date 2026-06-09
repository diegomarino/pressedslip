import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pngToEscPosRaster } from "../../../src/transports/escpos.js";

const FIXTURE_PATH = new URL("../../fixtures/escpos/black-576x8.png", import.meta.url);

describe("pngToEscPosRaster", () => {
  it("emits ESC @ + ESC 2 + GS v 0 header + packed raster for a valid 576x8 all-black PNG", async () => {
    const png = new Uint8Array(await readFile(FIXTURE_PATH));
    const out = await pngToEscPosRaster(png);
    // ESC @, ESC 2 init.
    expect(out.slice(0, 4)).toEqual(new Uint8Array([0x1b, 0x40, 0x1b, 0x32]));
    // GS v 0, m=0, xL=72, xH=0, yL=8, yH=0  (576/8 = 72 bytes per row)
    expect(out.slice(4, 12)).toEqual(new Uint8Array([0x1d, 0x76, 0x30, 0x00, 72, 0, 8, 0]));
    // Raster bytes: 72 bytes/row × 8 rows = 576 bytes of 0xFF (all-black after threshold).
    expect(out.slice(12).byteLength).toBe(576);
    expect(Array.from(out.slice(12)).every((b) => b === 0xff)).toBe(true);
  });

  it("throws INVALID_WIDTH for a PNG that is not 576px wide", async () => {
    const bad = new Uint8Array(
      await readFile(new URL("../../fixtures/escpos/odd-580x4.png", import.meta.url)),
    );
    await expect(pngToEscPosRaster(bad)).rejects.toMatchObject({ code: "INVALID_WIDTH" });
  });

  it("throws INVALID_HEIGHT for a PNG taller than PRINT_MAX_HEIGHT_DOTS", async () => {
    const tall = new Uint8Array(
      await readFile(new URL("../../fixtures/escpos/tall-576x4097.png", import.meta.url)),
    );
    await expect(pngToEscPosRaster(tall)).rejects.toMatchObject({ code: "INVALID_HEIGHT" });
  });

  it("throws PAYLOAD_TOO_LARGE when compressed bytes exceed MAX_COMPRESSED_BYTES", async () => {
    const huge = new Uint8Array(11 * 1024 * 1024);
    await expect(pngToEscPosRaster(huge)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });

  it("does NOT emit ESC d (feed) or GS V (cut) — those are transport-layer", async () => {
    const png = new Uint8Array(await readFile(FIXTURE_PATH));
    const out = await pngToEscPosRaster(png);
    // Scan for ESC d (0x1b 0x64) and GS V (0x1d 0x56). Must NOT appear anywhere.
    for (let i = 0; i < out.length - 1; i++) {
      // biome-ignore lint/style/noNonNullAssertion: array indices are within bounds
      const pair = (out[i]! << 8) | out[i + 1]!;
      expect(pair).not.toBe(0x1b64);
      expect(pair).not.toBe(0x1d56);
    }
  });
});
