/**
 * @fileoverview ESC/POS bitmap helper (pure) + thin TCP transport.
 * Two-layer design: helper produces ESC/POS init + raster bytes only;
 * transport layer appends ESC d feed + GS V cut. Width must be PRINT_WIDTH_DOTS
 * (576) and height must be ≤ PRINT_MAX_HEIGHT_DOTS (4096). Compressed bytes:
 * max 10 MiB.
 */

import { once } from "node:events";
import { Socket } from "node:net";
import { decode as decodePng } from "fast-png";

import {
  DEFAULT_ESCPOS_TIMEOUT_MS,
  MAX_COMPRESSED_BYTES,
  PRINT_MAX_HEIGHT_DOTS,
  PRINT_WIDTH_DOTS,
} from "./constants.js";
import type { Transport, TransportPayload } from "./types.js";
import { transportError } from "./types.js";

const BYTES_PER_ROW: number = PRINT_WIDTH_DOTS / 8;

const ESC = 0x1b;
const GS = 0x1d;

/**
 * Decode a PNG and produce an ESC/POS byte stream ready for a thermal printer.
 *
 * Output consists of `ESC @` (init), `ESC 2` (default line spacing), the
 * `GS v 0` raster header, and the 1-bit MSB-first row-major packed bitmap.
 * Feed and cut commands are intentionally NOT included — those belong to the
 * transport layer so they can be composed independently.
 *
 * @param png - Raw compressed PNG bytes; must be exactly `PRINT_WIDTH_DOTS` (576) wide.
 * @returns ESC/POS byte stream suitable for direct TCP write to a thermal printer.
 *
 * @throws {Error} `code = "PAYLOAD_TOO_LARGE"` when compressed bytes exceed MAX_COMPRESSED_BYTES.
 * @throws {Error} `code = "INVALID_WIDTH"` when width !== PRINT_WIDTH_DOTS.
 * @throws {Error} `code = "INVALID_HEIGHT"` when height > PRINT_MAX_HEIGHT_DOTS or ≤ 0.
 * @throws {Error} `code = "PNG_DECODE_FAILED"` when fast-png cannot decode the bytes.
 *
 * @example
 * ```ts
 * import { pngToEscPosRaster } from "pressedslip/transports";
 * import { readFile } from "node:fs/promises";
 * const png = await readFile("receipt.png");
 * const raster = await pngToEscPosRaster(new Uint8Array(png));
 * ```
 */
export async function pngToEscPosRaster(png: Uint8Array): Promise<Uint8Array> {
  if (png.byteLength > MAX_COMPRESSED_BYTES) {
    throw transportError(
      "PAYLOAD_TOO_LARGE",
      `Compressed PNG byte size ${png.byteLength} exceeds MAX_COMPRESSED_BYTES (${MAX_COMPRESSED_BYTES})`,
    );
  }

  let decoded: {
    width: number;
    height: number;
    data: Uint8Array | Uint8ClampedArray;
    channels: number;
  };
  try {
    decoded = decodePng(png) as typeof decoded;
  } catch (cause) {
    throw transportError("PNG_DECODE_FAILED", "PNG decode failed", cause);
  }
  const { width, height, data, channels } = decoded;

  if (width !== PRINT_WIDTH_DOTS) {
    throw transportError(
      "INVALID_WIDTH",
      `PNG width ${width} ≠ PRINT_WIDTH_DOTS (${PRINT_WIDTH_DOTS})`,
    );
  }
  if (height <= 0 || height > PRINT_MAX_HEIGHT_DOTS) {
    throw transportError(
      "INVALID_HEIGHT",
      `PNG height ${height} must be in 1..${PRINT_MAX_HEIGHT_DOTS}`,
    );
  }

  // Pack 1-bit MSB-first row-major. Threshold: avg(R,G,B) < 128 → 1 (black). Alpha ignored.
  const packed = new Uint8Array(BYTES_PER_ROW * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = (y * width + x) * channels;
      const r = data[px] ?? 0;
      const g = channels >= 3 ? (data[px + 1] ?? r) : r;
      const b = channels >= 3 ? (data[px + 2] ?? r) : r;
      const lum = (r + g + b) / 3;
      if (lum < 128) {
        const byteIdx = y * BYTES_PER_ROW + (x >> 3);
        const bit = 7 - (x & 7);
        // biome-ignore lint/style/noNonNullAssertion: byteIdx is within bounds of packed (height * BYTES_PER_ROW)
        packed[byteIdx]! |= 1 << bit;
      }
    }
  }

  const xL = BYTES_PER_ROW & 0xff;
  const xH = (BYTES_PER_ROW >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  // ESC @ (1B 40) = printer init; ESC 2 (1B 32) = default line spacing;
  // GS v 0 (1D 76 30) m=0 xL xH yL yH = raster bit image header. Data follows.
  const header = Uint8Array.from([ESC, 0x40, ESC, 0x32, GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

  const out = new Uint8Array(header.length + packed.length);
  out.set(header, 0);
  out.set(packed, header.length);
  return out;
}

/**
 * Configuration for the ESC/POS thermal printer transport (TCP).
 */
export interface EscPosTransportConfig {
  /** Hostname or IP address of the TCP-connected thermal printer. */
  readonly host: string;
  /** TCP port on the printer (typically 9100). */
  readonly port: number;
  /** Lines to feed after raster before the cut (default 3). 0 disables feed. */
  readonly feedLines?: number;
  /** Whether to issue a full cut at the end of the job (default true). */
  readonly cut?: boolean;
  /** TCP timeout in ms (default DEFAULT_ESCPOS_TIMEOUT_MS = 5000). */
  readonly timeoutMs?: number;
}

/**
 * Create a Transport that sends ESC/POS raster data to a TCP thermal printer.
 *
 * ACK-less by protocol — a successful TCP close does NOT confirm the printer
 * received bytes. Callers needing delivery confirmation must use
 * application-level ACK (e.g. printer status polling).
 *
 * @param config - TCP host/port plus optional feed, cut, and timeout settings.
 * @returns A `Transport` whose `send()` converts a PNG to ESC/POS and writes it over TCP.
 *
 * @throws {Error} `code = "INVALID_CONFIG"` (factory-time) when `feedLines` is not an integer in 0..255.
 * @throws {Error} `code = "UNSUPPORTED_MIME"` when `payload.mimeType` is not "image/png" or undefined.
 * @throws {Error} burbles raster-helper codes: `INVALID_WIDTH`, `INVALID_HEIGHT`, `PAYLOAD_TOO_LARGE`, `PNG_DECODE_FAILED`.
 * @throws {Error} preserves Node socket codes: `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`, `EHOSTUNREACH`.
 *
 * @example
 * ```ts
 * import { createEscPosTransport } from "pressedslip/transports";
 * const transport = createEscPosTransport({ host: "192.168.1.10", port: 9100 });
 * await transport.send({ bytes: receiptPng });
 * ```
 */
export function createEscPosTransport(config: EscPosTransportConfig): Transport {
  const { host, port, feedLines = 3, cut = true, timeoutMs = DEFAULT_ESCPOS_TIMEOUT_MS } = config;
  if (feedLines < 0 || feedLines > 0xff || !Number.isInteger(feedLines)) {
    throw transportError(
      "INVALID_CONFIG",
      `feedLines must be an integer in 0..255, got ${feedLines}`,
    );
  }
  return {
    async send(payload: TransportPayload): Promise<void> {
      const mimeType = payload.mimeType ?? "image/png";
      if (mimeType !== "image/png") {
        throw transportError(
          "UNSUPPORTED_MIME",
          `ESC/POS transport only supports image/png (got ${mimeType})`,
        );
      }
      const raster = await pngToEscPosRaster(payload.bytes);

      // Compose trailer: ESC d feedLines (if feedLines > 0), GS V 0 (if cut).
      const trailerParts: number[] = [];
      if (feedLines > 0) trailerParts.push(ESC, 0x64, feedLines);
      if (cut) trailerParts.push(GS, 0x56, 0x00);
      const trailer = Uint8Array.from(trailerParts);
      const out = new Uint8Array(raster.length + trailer.length);
      out.set(raster, 0);
      out.set(trailer, raster.length);

      const socket = new Socket();
      socket.setTimeout(timeoutMs);
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (err: unknown) => reject(err);
          const onTimeout = () => {
            const e = new Error(`ETIMEDOUT connecting to ${host}:${port}`);
            (e as Error & { code: string }).code = "ETIMEDOUT";
            reject(e);
          };
          socket.once("error", onError);
          socket.once("timeout", onTimeout);
          socket.connect(port, host, () => {
            socket.off("error", onError);
            socket.off("timeout", onTimeout);
            resolve();
          });
        });

        const flushed = socket.write(out);
        if (!flushed) await once(socket, "drain");
        await new Promise<void>((resolve, reject) => {
          socket.once("error", reject);
          socket.end(() => resolve());
        });
      } finally {
        socket.destroy();
      }
    },
  };
}
