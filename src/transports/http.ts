/**
 * @fileoverview HTTP transport: POSTs payload bytes to a URL with always-on
 * scheme guard (http/https only), userinfo strip, and opt-in allowedHosts
 * origin-match. Once-per-process console.warn when allowedHosts omitted.
 */

import { DEFAULT_HTTP_TIMEOUT_MS } from "./constants.js";
import { type Transport, type TransportPayload, transportError } from "./types.js";

/**
 * Configuration for the HTTP transport (POST request to a print server).
 */
export interface HttpTransportConfig {
  /** Target URL for the POST request; must use http: or https: scheme. */
  readonly url: string;
  /** Additional HTTP headers merged into the POST request. */
  readonly headers?: Record<string, string>;
  /**
   * Opt-in SSRF mitigation. Entries MUST be full-origin strings of the form
   * `"scheme://host:port"`. Empty / omitted = no allow-check + console.warn.
   */
  readonly allowedHosts?: readonly string[];
  /** Fetch timeout in milliseconds; defaults to DEFAULT_HTTP_TIMEOUT_MS. */
  readonly timeoutMs?: number;
}

let warnedOnce = false;

function warnIfNoAllowlist(url: string): void {
  if (warnedOnce) return;
  if (process.env.PH_DISABLE_SSRF_WARNING === "1") return;
  warnedOnce = true;
  let display = url;
  try {
    const u = new URL(url);
    display = `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    /* fall back to raw */
  }
  console.warn(
    `[pressedslip] HTTP transport created without allowedHosts for URL "${display}". ` +
      `If URL comes from user-editable input, pass allowedHosts to mitigate SSRF.`,
  );
}

function originOf(url: URL): string {
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  return `${url.protocol}//${url.hostname}:${port}`;
}

/**
 * Create a Transport that POSTs `payload.bytes` to a URL.
 *
 * Always-on guards: the URL's scheme MUST be `http:` or `https:`; userinfo is
 * stripped before matching and before fetch. Opt-in `allowedHosts`
 * (origin-match) provides SSRF mitigation when URLs come from user-editable
 * input.
 *
 * @param config - Target URL, optional extra headers, optional SSRF allowlist, and timeout.
 * @returns A `Transport` whose `send()` POSTs the payload bytes with `Content-Type` set to `payload.mimeType`.
 *
 * @throws {Error} `code = "HTTP_INVALID_URL"` when the URL fails to parse.
 * @throws {Error} `code = "HTTP_INVALID_SCHEME"` when the URL scheme is not http: or https:.
 * @throws {Error} `code = "URL_NOT_ALLOWED"` when allowedHosts is non-empty and the URL's origin is not listed.
 * @throws {Error} `code = "FETCH_FAILED"` on network errors or timeout.
 * @throws {Error} `code = "HTTP_4XX"` on 4xx response (cause = { status, statusText }).
 * @throws {Error} `code = "HTTP_5XX"` on 5xx response (cause = { status, statusText }).
 *
 * @example
 * ```ts
 * import { createHttpTransport } from "pressedslip/transports";
 * const transport = createHttpTransport({
 *   url: "https://print.example.com/receipt",
 *   allowedHosts: ["https://print.example.com:443"],
 * });
 * await transport.send({ bytes: compositionPng });
 * ```
 */
export function createHttpTransport(config: HttpTransportConfig): Transport {
  const { url, headers, allowedHosts, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = config;

  if (!allowedHosts || allowedHosts.length === 0) {
    warnIfNoAllowlist(url);
  }

  return {
    async send(payload: TransportPayload): Promise<void> {
      const mimeType = payload.mimeType ?? "image/png";

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (cause) {
        throw transportError("HTTP_INVALID_URL", `Invalid URL: ${url}`, cause);
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw transportError(
          "HTTP_INVALID_SCHEME",
          `HTTP transport only supports http:/https: (got ${parsed.protocol})`,
        );
      }
      parsed.username = "";
      parsed.password = "";

      if (allowedHosts && allowedHosts.length > 0) {
        const origin = originOf(parsed);
        if (!allowedHosts.includes(origin)) {
          throw transportError("URL_NOT_ALLOWED", `Origin "${origin}" not in allowedHosts`);
        }
      }

      const finalHeaders: Record<string, string> = { "Content-Type": mimeType, ...(headers ?? {}) };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetch(parsed.toString(), {
          method: "POST",
          headers: finalHeaders,
          body: payload.bytes,
          signal: controller.signal,
        });
      } catch (cause) {
        throw transportError("FETCH_FAILED", `fetch failed for ${url}`, cause);
      } finally {
        clearTimeout(timer);
      }
      if (response.status >= 500) {
        throw transportError("HTTP_5XX", `HTTP ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
        });
      }
      if (response.status >= 400) {
        throw transportError("HTTP_4XX", `HTTP ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
        });
      }
    },
  };
}
