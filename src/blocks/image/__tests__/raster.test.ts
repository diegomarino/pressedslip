/** @fileoverview PNG normalization, resampling, and monochrome processing regression tests. */
import { decode, encode } from "fast-png";
import { describe, expect, it } from "vitest";
import { preparePng } from "../raster.js";

function pixels(
  data: number[],
  width: number,
  height = 1,
  targetWidth = width,
  targetHeight = height,
  dither: "none" | "floyd-steinberg" = "none",
) {
  return Array.from(
    decode(
      preparePng(
        encode({ width, height, channels: 1, data: Uint8Array.from(data) }),
        targetWidth,
        targetHeight,
        dither,
      ),
    ).data,
  );
}

describe("PNG preparation", () => {
  it("uses the production threshold and preserves monochrome pixels", () => {
    expect(pixels([0, 128, 129, 255], 4)).toEqual([0, 0, 255, 255]);
    expect(pixels([0, 255, 255, 0], 2, 2, 2, 2, "floyd-steinberg")).toEqual([0, 255, 255, 0]);
  });
  it("averages the complete area when shrinking, including fractional cells", () => {
    expect(pixels([0, 255, 255], 3, 1, 2)).toEqual([0, 255]);
    expect(pixels([0, 255, 255, 255], 2, 2, 1, 1)).toEqual([255]);
  });
  it("enlarges with bilinear interpolation and handles single-pixel axes", () => {
    expect(pixels([0, 255], 2, 1, 4, 2)).toEqual([0, 0, 255, 255, 0, 0, 255, 255]);
    expect(pixels([255], 1, 1, 2, 2)).toEqual([255, 255, 255, 255]);
  });
  it("uses RGB luminance and composites alpha over white", () => {
    const bytes = encode({
      width: 4,
      height: 1,
      channels: 4,
      data: Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 0, 0, 0, 0, 128]),
    });
    expect(Array.from(decode(preparePng(bytes, 4, 1, "none")).data)).toEqual([0, 255, 255, 0]);
  });
  it("normalizes packed grayscale, indexed alpha and sixteen-bit samples", () => {
    const cases = [
      encode({ width: 3, height: 1, channels: 1, depth: 1, data: Uint8Array.of(0b01000000) }),
      encode({
        width: 3,
        height: 1,
        channels: 1,
        depth: 2,
        palette: [
          [0, 0, 0, 255],
          [255, 255, 255, 255],
        ],
        data: Uint8Array.of(0b00010000),
      }),
      encode({
        width: 3,
        height: 1,
        channels: 2,
        depth: 16,
        data: Uint16Array.of(0, 65535, 0, 0, 65535, 65535),
      }),
    ];
    const expected = [
      [0, 255, 0],
      [0, 255, 0],
      [0, 255, 255],
    ];
    cases.forEach((bytes, i) => {
      expect(Array.from(decode(preparePng(bytes, 3, 1, "none")).data)).toEqual(expected[i]);
    });
  });
  it("locks left-to-right Floyd–Steinberg diffusion on a four-by-four ramp", () => {
    expect(
      pixels(
        Array.from({ length: 16 }, (_, i) => i * 17),
        4,
        4,
        4,
        4,
        "floyd-steinberg",
      ),
    ).toEqual([0, 0, 0, 0, 0, 255, 0, 255, 255, 0, 255, 255, 255, 255, 255, 255]);
  });
  it("honors grayscale and RGB transparency keys, including sixteen-bit samples", () => {
    function withTransparency(bytes: Uint8Array, key: number[]) {
      const chunk = new Uint8Array(12 + key.length * 2);
      const view = new DataView(chunk.buffer);
      view.setUint32(0, key.length * 2);
      chunk.set([116, 82, 78, 83], 4);
      key.forEach((value, i) => {
        view.setUint16(8 + i * 2, value);
      });
      let crc = 0xffffffff;
      for (const byte of chunk.subarray(4, -4)) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0);
      const result = new Uint8Array(bytes.length + chunk.length);
      result.set(bytes.subarray(0, 33));
      result.set(chunk, 33);
      result.set(bytes.subarray(33), 33 + chunk.length);
      return result;
    }
    for (const channels of [1, 3]) {
      const data = new Uint16Array(2 * channels);
      data.fill(1000, 0, channels);
      const input = withTransparency(
        encode({ width: 2, height: 1, channels, depth: 16, data }),
        Array(channels).fill(1000),
      );
      const original = input.slice();
      expect(Array.from(decode(preparePng(input, 2, 1, "none")).data)).toEqual([255, 0]);
      expect(input).toEqual(original);
      if (channels === 3) {
        input[47] = (input[47] ?? 0) ^ 1;
        expect(() => preparePng(input, 2, 1, "none")).toThrow(/CRC/);
      }
    }
  });
  it("handles transparent indexed colors", () => {
    const input = encode({
      width: 2,
      height: 1,
      channels: 1,
      depth: 1,
      palette: [
        [0, 0, 0, 0],
        [0, 0, 0, 255],
      ],
      data: Uint8Array.of(0b01000000),
    });
    expect(Array.from(decode(preparePng(input, 2, 1, "none")).data)).toEqual([255, 0]);
  });
  it("rejects invalid target dimensions and corrupt PNG", () => {
    for (const width of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER])
      expect(() => preparePng(new Uint8Array(), width, 2, "none")).toThrow();
    expect(() => preparePng(new Uint8Array(), 1, 1, "none")).toThrow();
    const input = encode({ width: 1, height: 1, channels: 1, data: Uint8Array.of(0) });
    input[29] = (input[29] ?? 0) ^ 1;
    expect(() => preparePng(input, 1, 1, "none")).toThrow(/CRC/i);
  });
});
