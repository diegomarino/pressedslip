/**
 * @fileoverview Public constants for the /transports subpath. Imported by
 * transports themselves and by the render-width contract test.
 */

/**
 * Printable area of a standard 80 mm thermal printer at 203 dpi.
 *
 * @example
 * ```ts
 * import { PRINT_WIDTH_DOTS } from "pressedslip/transports";
 * console.log(PRINT_WIDTH_DOTS); // 576
 * ```
 */
export const PRINT_WIDTH_DOTS: number = 576;

/**
 * Maximum receipt height accepted by `pngToEscPosRaster` (~80 cm of paper).
 *
 * @example
 * ```ts
 * import { PRINT_MAX_HEIGHT_DOTS } from "pressedslip/transports";
 * console.log(PRINT_MAX_HEIGHT_DOTS); // 4096
 * ```
 */
export const PRINT_MAX_HEIGHT_DOTS: number = 4096;

/**
 * Maximum compressed PNG byte size accepted by `pngToEscPosRaster`.
 *
 * @example
 * ```ts
 * import { MAX_COMPRESSED_BYTES } from "pressedslip/transports";
 * console.log(MAX_COMPRESSED_BYTES); // 10485760
 * ```
 */
export const MAX_COMPRESSED_BYTES: number = 10 * 1024 * 1024;

/**
 * Default TCP connection timeout in milliseconds for the ESC/POS transport.
 *
 * @example
 * ```ts
 * import { DEFAULT_ESCPOS_TIMEOUT_MS, createEscPosTransport } from "pressedslip/transports";
 * const t = createEscPosTransport({ host: "192.168.1.10", port: 9100, timeoutMs: DEFAULT_ESCPOS_TIMEOUT_MS });
 * ```
 */
export const DEFAULT_ESCPOS_TIMEOUT_MS: number = 5000;

/**
 * Default HTTP request timeout in milliseconds for the HTTP transport.
 *
 * @example
 * ```ts
 * import { DEFAULT_HTTP_TIMEOUT_MS, createHttpTransport } from "pressedslip/transports";
 * const t = createHttpTransport({ url: "https://print.example.com", timeoutMs: DEFAULT_HTTP_TIMEOUT_MS });
 * ```
 */
export const DEFAULT_HTTP_TIMEOUT_MS: number = 10000;
