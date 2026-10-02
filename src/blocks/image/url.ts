/** @fileoverview Browser-safe bounded HTTP image loading before composition or rendering. */
import { hasPngSignature } from "fast-png";
import { imageFromBuffer, MAX_IMAGE_BYTES, UNSUPPORTED_IMAGE_SOURCE_MESSAGE } from "./source.js";

/** Optional raw-byte image cache; use a dedicated instance of memoryFontCache or nodeFontCache. */
export type ImageCache = {
  /** Read untrusted raw bytes by the helper's namespaced, normalized URL key. */
  get(key: string): Promise<Uint8Array | undefined>;
  /** Store only bytes that passed the helper's size and format validation. */
  set(key: string, bytes: Uint8Array): Promise<void>;
};

/** Fetch, timeout, size, and cache overrides for imageFromUrl. */
export type ImageFromUrlOptions = {
  /** Fetch implementation; must honor the supplied abort signal. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Positive safe integer request/body deadline in ms, at most 2,147,483,647; defaults to 5000. */
  timeoutMs?: number;
  /** Positive safe integer source cap, clamped to 2 MiB; defaults to 2 MiB. */
  maxBytes?: number;
  /** Optional raw-byte cache; no cache is used by default. Cache failures propagate. */
  cache?: ImageCache;
};

function encodeImage(bytes: Uint8Array, maxBytes: number): string {
  if (bytes.length > maxBytes)
    throw new Error(`Image source exceeds maximum byte limit (${maxBytes})`);
  if (hasPngSignature(bytes)) return imageFromBuffer(bytes, "image/png");
  try {
    return imageFromBuffer(bytes, "image/svg+xml");
  } catch (cause) {
    // The existing XML validator decides acceptance. Recognizable malformed SVGs
    // keep their detailed diagnostics; other formats receive the schema guidance.
    if (
      /^\s*(?:(?:<\?[\s\S]*?\?>|<!--[\s\S]*?-->)\s*)*<svg(?:\s|\/?>)/.test(
        new TextDecoder().decode(bytes),
      ) ||
      bytes.length === 0
    )
      throw new Error(cause instanceof Error ? cause.message : String(cause), { cause });
    throw new Error(UNSUPPORTED_IMAGE_SOURCE_MESSAGE, { cause });
  }
}

/**
 * Load a PNG or supported static SVG from an absolute HTTP(S) URL into a local data URI.
 *
 * Streams at most 2 MiB and validates bytes through imageFromBuffer, independent of
 * URL extension or MIME headers. The deadline covers the request and complete body.
 * PNG headers are checked here; pixel decoding still happens during block rendering.
 * Rendering never resolves URLs. Browser CORS applies; applications fetching untrusted
 * server-side URLs must enforce host/redirect policy in their injected fetch.
 *
 * @param url - Absolute HTTP(S) URL; fragments are removed before cache lookup and fetch.
 * @param opts - Optional fetch, deadline, byte cap, and raw-byte cache.
 * @returns A validated PNG/SVG base64 data URI for an image block.
 */
export async function imageFromUrl(url: string, opts: ImageFromUrlOptions = {}): Promise<string> {
  const normalized = new URL(url);
  if (normalized.protocol !== "http:" && normalized.protocol !== "https:")
    throw new TypeError("Image URL must use HTTP or HTTPS");
  const timeoutMs = opts.timeoutMs ?? 5000;
  const requestedMax = opts.maxBytes ?? MAX_IMAGE_BYTES;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)
    throw new TypeError("timeoutMs must be a positive safe integer at most 2147483647");
  if (!Number.isSafeInteger(requestedMax) || requestedMax <= 0)
    throw new TypeError("maxBytes must be a positive safe integer");
  const maxBytes = Math.min(requestedMax, MAX_IMAGE_BYTES);
  normalized.hash = "";
  const href = normalized.href;
  const key = `pressedslip:image:v1:${href}`;
  const cached = await opts.cache?.get(key);
  if (cached !== undefined) return encodeImage(cached, maxBytes);

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`Image request timed out after ${timeoutMs}ms`)),
    timeoutMs,
  );
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  const cancel = () => {
    void reader?.cancel(controller.signal.reason).catch(() => {
      /* Preserve the timeout error if cancellation fails. */
    });
  };
  controller.signal.addEventListener("abort", cancel, { once: true });
  let bytes: Uint8Array;
  try {
    const response = await (opts.fetch ?? globalThis.fetch)(href, { signal: controller.signal });
    reader = response.body?.getReader();
    controller.signal.throwIfAborted();
    if (!response.ok) throw new Error(`Image request failed: HTTP ${response.status}`);
    const declared = response.headers.get("Content-Length");
    if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > maxBytes)
      throw new Error(`Image source exceeds maximum byte limit (${maxBytes})`);
    if (!reader) throw new Error("Image response has no body");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      controller.signal.throwIfAborted();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes)
        throw new Error(`Image source exceeds maximum byte limit (${maxBytes})`);
      chunks.push(value);
    }
    complete = true;
    bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", cancel);
    if (reader) {
      try {
        if (!complete) await reader.cancel();
      } catch {
        /* Preserve the request/read error. */
      } finally {
        reader.releaseLock();
      }
    }
  }
  const src = encodeImage(bytes, maxBytes);
  await opts.cache?.set(key, bytes);
  return src;
}
