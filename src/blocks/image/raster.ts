/** @fileoverview Normalize PNG samples, resize luminance, and encode monochrome PNGs. */
import { convertIndexedToRgb, decode, encode } from "fast-png";

/** Prepare a consumer PNG at its final pixel size, compositing transparency on white. */
export function preparePng(
  bytes: Uint8Array,
  width: number,
  height: number,
  dither: "floyd-steinberg" | "none",
): Uint8Array {
  if (
    !Number.isSafeInteger(width) ||
    width < 1 ||
    !Number.isSafeInteger(height) ||
    height < 1 ||
    !Number.isSafeInteger(width * height)
  ) {
    throw new RangeError("PNG output dimensions must be positive safe integers");
  }
  const image = decodePng(bytes);
  const indexed = image.palette !== undefined;
  const data = indexed ? convertIndexedToRgb(image) : image.data;
  const channels = indexed ? (image.palette?.[0]?.length ?? 3) : image.channels;
  const depth = indexed ? 8 : image.depth;
  const max = 2 ** depth - 1;
  const source = new Float64Array(image.width * image.height);
  const sample = (pixel: number, channel: number): number => {
    if (depth >= 8) return data[pixel * channels + channel] ?? 0;
    const y = Math.floor(pixel / image.width);
    const x = pixel % image.width;
    const bit = x * depth;
    return (
      ((data[y * Math.ceil((image.width * depth) / 8) + Math.floor(bit / 8)] ?? 0) >>
        (8 - depth - (bit % 8))) &
      max
    );
  };
  for (let i = 0; i < source.length; i++) {
    const red = sample(i, 0);
    const green = channels >= 3 ? sample(i, 1) : red;
    const blue = channels >= 3 ? sample(i, 2) : red;
    const transparent =
      image.transparency &&
      (channels === 1
        ? red === image.transparency[0]
        : red === image.transparency[0] &&
          green === image.transparency[1] &&
          blue === image.transparency[2]);
    const alpha = transparent
      ? 0
      : channels === 2 || channels === 4
        ? sample(i, channels - 1) / max
        : 1;
    source[i] =
      ((0.299 * red + 0.587 * green + 0.114 * blue) / max) * 255 * alpha + 255 * (1 - alpha);
  }
  const horizontal = new Float64Array(width * image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < width; x++)
      horizontal[y * width + x] = resample(
        image.width,
        width,
        x,
        (i) => source[y * image.width + i] ?? 0,
      );
  }
  const gray = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++)
      gray[y * width + x] = resample(
        image.height,
        height,
        y,
        (i) => horizontal[i * width + x] ?? 0,
      );
  }
  const output = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const value = gray[i] ?? 0;
      const quantized = value <= 128 ? 0 : 255;
      output[i] = quantized;
      if (dither === "none") continue;
      const error = value - quantized;
      if (x + 1 < width) gray[i + 1] = (gray[i + 1] ?? 0) + (error * 7) / 16;
      if (y + 1 < height) {
        if (x > 0) gray[i + width - 1] = (gray[i + width - 1] ?? 0) + (error * 3) / 16;
        gray[i + width] = (gray[i + width] ?? 0) + (error * 5) / 16;
        if (x + 1 < width) gray[i + width + 1] = (gray[i + width + 1] ?? 0) + error / 16;
      }
    }
  }
  return encode({ width, height, channels: 1, depth: 8, data: output });
}

function resample(
  size: number,
  target: number,
  position: number,
  value: (index: number) => number,
): number {
  if (size === target) return value(position);
  const scale = size / target;
  if (target < size) {
    const start = position * scale;
    const end = (position + 1) * scale;
    let sum = 0;
    for (let i = Math.floor(start); i < Math.ceil(end); i++)
      sum += value(Math.min(i, size - 1)) * (Math.min(end, i + 1) - Math.max(start, i));
    return sum / scale;
  }
  const coordinate = Math.max(0, Math.min(size - 1, (position + 0.5) * scale - 0.5));
  const low = Math.floor(coordinate);
  const fraction = coordinate - low;
  return value(low) * (1 - fraction) + value(Math.min(size - 1, low + 1)) * fraction;
}

function decodePng(bytes: Uint8Array) {
  // ponytail: remove this tiny-image workaround when fast-png fixes RGB tRNS validation.
  // fast-png 8 compares RGB tRNS's three samples with the pixel count.
  // Extract that chunk for tiny RGB PNGs until the upstream decoder is fixed.
  if (bytes.length >= 33 && bytes[25] === 2) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(16) * view.getUint32(20) < 3) {
      for (let offset = 8; offset + 12 <= bytes.length; ) {
        const length = view.getUint32(offset);
        const end = offset + length + 12;
        if (end > bytes.length) break;
        if (view.getUint32(offset + 4) === 0x74524e53) {
          if (length !== 6) throw new Error("Invalid RGB PNG transparency key");
          let crc = 0xffffffff;
          for (const byte of bytes.subarray(offset + 4, end - 4)) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
          }
          if ((crc ^ 0xffffffff) >>> 0 !== view.getUint32(end - 4))
            throw new Error("Invalid PNG tRNS CRC");
          const transparency = Uint16Array.of(
            view.getUint16(offset + 8),
            view.getUint16(offset + 10),
            view.getUint16(offset + 12),
          );
          const normalized = new Uint8Array(bytes.length - length - 12);
          normalized.set(bytes.subarray(0, offset));
          normalized.set(bytes.subarray(end), offset);
          return { ...decode(normalized, { checkCrc: true }), transparency };
        }
        offset = end;
      }
    }
  }
  return decode(bytes, { checkCrc: true });
}
