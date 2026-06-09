/**
 * @fileoverview Encode a 1-bit packed bitmap as a grayscale PNG via fast-png, with shape validation.
 *
 * Uses fast-png for true grayscale output: respects `channels: 1` and emits
 * proper grayscale PNGs instead of oversized RGBA. See architecture docs for
 * library selection rationale.
 */
import { encode } from "fast-png";

/**
 * Encode a 1-bit packed bitmap (MSB-first, row-major) as a PNG.
 * Output is grayscale PNG (8-bit pixels: 0=black, 255=white) for portability.
 */
export function encodeOneBitPng(onebit: Uint8Array, width: number, height: number): Uint8Array {
  if (width % 8 !== 0) {
    throw new RangeError(`width must be divisible by 8 (got ${width})`);
  }
  const bytesPerRow = width / 8;
  if (onebit.length !== bytesPerRow * height) {
    throw new RangeError(
      `onebit length mismatch: expected ${bytesPerRow * height} bytes, got ${onebit.length}`,
    );
  }

  // Build flat grayscale array: 1 byte per pixel (0=black, 255=white).
  // Fixes the pngjs colorType-ignore bug (pngjs issue #360) — RGBA was emitted regardless.
  const grayscale = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byte = onebit[y * bytesPerRow + (x >> 3)] ?? 0;
      const bit = (byte >> (7 - (x & 7))) & 1;
      grayscale[y * width + x] = bit === 1 ? 0 : 255;
    }
  }

  return encode({ width, height, channels: 1, depth: 8, data: grayscale });
}
