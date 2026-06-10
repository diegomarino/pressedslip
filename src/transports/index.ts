/**
 * @module pressedslip/transports
 * @fileoverview Transport entrypoint for `pressedslip/transports`.
 *
 * Transport entrypoint. Re-exports the `Transport` interface, the
 * `TransportPayload` type, reference transport factories, the pure ESC/POS
 * helper, and public print constants.
 *
 * Node-only: this entry is excluded from the /browser bundle.
 * `scripts/verify-browser-bundle.mjs` ensures /browser does not transitively
 * import `node:*` — /transports does, by design.
 */

export {
  DEFAULT_ESCPOS_TIMEOUT_MS,
  DEFAULT_HTTP_TIMEOUT_MS,
  MAX_COMPRESSED_BYTES,
  PRINT_MAX_HEIGHT_DOTS,
  PRINT_WIDTH_DOTS,
} from "./constants.js";
export { createEscPosTransport, type EscPosTransportConfig, pngToEscPosRaster } from "./escpos.js";
export { createFileTransport, type FileTransportConfig } from "./file.js";
export { createHttpTransport, type HttpTransportConfig } from "./http.js";
export type { Transport, TransportPayload } from "./types.js";
export { transportError } from "./types.js";
// All reference transports + ESC/POS helper exported above.
