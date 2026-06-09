import { decode } from "fast-png";
import { describe, expect, it } from "vitest";
import { encodeOneBitPng } from "../../../src/pipeline/png-encode.js";

describe("encodeOneBitPng", () => {
  it("produces bytes that decode to a valid PNG of the correct dimensions", async () => {
    const onebit = new Uint8Array([0xff, 0x00]);
    const pngBytes = encodeOneBitPng(onebit, 8, 2);

    expect(pngBytes).toBeInstanceOf(Uint8Array);
    expect(pngBytes.byteLength).toBeGreaterThan(8);

    expect(pngBytes[0]).toBe(0x89);
    expect(pngBytes[1]).toBe(0x50);
    expect(pngBytes[2]).toBe(0x4e);
    expect(pngBytes[3]).toBe(0x47);

    // fast-png returns grayscale (channels=1) for 1-bit PNGs.
    // Data is in grayscale layout, not RGBA.
    const png = decode(new Uint8Array(pngBytes));
    expect(png.width).toBe(8);
    expect(png.height).toBe(2);

    // Row 0: 0xff → all bits set → all black (0). Pixel 0 = data[0].
    expect(png.data[0]).toBe(0);
    // Row 1: 0x00 → all bits clear → all white (255). Pixel at (0,1) = data[1*8 + 0] = data[8].
    // Previously: data[8 * 4] in RGBA layout; now: data[8] in grayscale layout.
    expect(png.data[8]).toBe(255);
  });

  it("supports a 576x1 row (the thermal80 default)", () => {
    const bytes = new Uint8Array(72);
    bytes.fill(0x55);
    const png = encodeOneBitPng(bytes, 576, 1);
    // fast-png decode returns grayscale shape
    const decoded = decode(new Uint8Array(png));
    expect(decoded.width).toBe(576);
    expect(decoded.height).toBe(1);
  });

  it("emits IHDR with color type 0 (grayscale), not 6 (RGBA) — regression for pngjs issue #360", () => {
    // Build a minimal valid 1-bit input: 8px wide, 1px tall → 1 byte
    const onebit = new Uint8Array([0b10101010]);
    const png = encodeOneBitPng(onebit, 8, 1);
    // PNG IHDR byte layout: 8-byte signature, then chunk-len(4) + chunk-type(4) + data.
    // Within IHDR data: width(4 bytes, 16-19) + height(4 bytes, 20-23) + depth(1 byte, 24) + color_type(1 byte, 25).
    expect(png[25]).toBe(0); // 0 = grayscale; 6 = RGBA (the bug we just fixed)
  });
});
