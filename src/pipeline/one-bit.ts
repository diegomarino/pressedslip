/**
 * @fileoverview RGBA to 1-bit bitmap conversion. Threshold-based grayscale, MSB-first row-major packing for ESC/POS raster.
 */
/**
 * Convert an 8-bit RGBA buffer to a 1-bit packed bitmap.
 * Width MUST be divisible by 8 (caller's responsibility — `resolveWidth` enforces this).
 * Grayscale extraction: takes R channel only (Satori/resvg output for black-on-white is grayscale, R===G===B).
 * Threshold: gray <= threshold → black (bit 1), gray > threshold → white (bit 0).
 * Packing: MSB-first within each byte (pixel 0 → bit 7), row-major.
 * Matches ESC/POS GS v 0 raster format used by transport layer.
 */
export function rgbaToOneBit(
  rgba: Uint8Array,
  width: number,
  height: number,
  threshold: number,
): Uint8Array {
  if (width % 8 !== 0) {
    throw new RangeError(`width must be divisible by 8 (got ${width})`);
  }
  const bytesPerRow = width / 8;
  const out = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gray = rgba[(y * width + x) * 4];
      if (gray !== undefined && gray <= threshold) {
        const bytePos = y * bytesPerRow + (x >> 3);
        const bitPos = 7 - (x & 7);
        out[bytePos] = (out[bytePos] ?? 0) | (1 << bitPos);
      }
    }
  }
  return out;
}
