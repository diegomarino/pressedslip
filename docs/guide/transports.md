# Transports

Send rendered output to a thermal printer, file system, HTTP endpoint, or custom destination.

After `render()` produces PNG bytes, a **transport** moves those bytes to their final destination. The package ships three reference transports (ESC/POS thermal printer, filesystem, HTTP) and supports custom implementations.

## Overview

```
render() → bytes + metadata → transport.send() → device
```

See [Transport architecture](../architecture/transport.md) for the Mermaid
pipeline diagram and delivery invariants.

Every transport is a simple object with one method:

```ts
interface Transport {
  send(payload: TransportPayload): Promise<void>;
}
```

The payload is a lightweight container:

```ts
interface TransportPayload {
  readonly bytes: Uint8Array;
  readonly mimeType?: string; // defaults to "image/png"
}
```

Transports are **fire-and-forget**. When `send()` rejects, the error includes a stable `code` field for retry logic.

## Import Path

```ts
import {
  createEscPosTransport,
  createFileTransport,
  createHttpTransport,
  PRINT_WIDTH_DOTS,
  PRINT_MAX_HEIGHT_DOTS,
} from "pressedslip/transports";
```

All reference transports are Node-only. The `/transports` subpath does not bundle into the browser.

## ESC/POS Thermal Printer

Send rendered PNG bytes to a TCP thermal printer (80 mm standard).

### Basic Usage

```ts
import { render, compose, createRegistry, builtinBlocks, themes, loadThemeFonts } from "pressedslip";
import { createProviderRegistry } from "pressedslip/providers";
import { createEscPosTransport } from "pressedslip/transports";

const registry = createRegistry(builtinBlocks);
const providers = createProviderRegistry({});
const composition = await compose({ providers, blocks: registry, date: "2026-06-08" });
const prepared = await loadThemeFonts(themes.default);
const rendering = await render(composition, { registry, theme: prepared });

const transport = createEscPosTransport({
  host: "192.168.1.10",
  port: 9100, // standard ESC/POS port
});

await transport.send({ bytes: rendering.bytes });
```

### Configuration

```ts
export interface EscPosTransportConfig {
  readonly host: string;
  readonly port: number;
  readonly feedLines?: number; // default 3; lines to feed after print
  readonly cut?: boolean; // default true; issue full cut at end
  readonly timeoutMs?: number; // default 5000
}
```

- **`feedLines`** (0–255) — Number of blank lines to advance before cutting. Set to `0` to skip the feed command entirely.
- **`cut`** — If `true`, sends the full-cut command after the receipt. Disable if your printer doesn't support cutting.
- **`timeoutMs`** — TCP connection timeout. Failures include node-native socket codes (`ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`, `EHOSTUNREACH`).

### Printer Constraints

The ESC/POS transport enforces strict width and height constraints:

- **Width** must be exactly `PRINT_WIDTH_DOTS` (576 pixels) — the printable area of a standard 80 mm thermal printer at 203 dpi.
- **Height** must be ≤ `PRINT_MAX_HEIGHT_DOTS` (4096 pixels) — roughly 80 cm of paper.
- **Compressed PNG size** must be ≤ 10 MiB.

If the rendered composition violates these bounds, `send()` rejects with a specific error code:

```ts
import { PRINT_WIDTH_DOTS, PRINT_MAX_HEIGHT_DOTS } from "pressedslip/transports";

// Check before rendering
console.log(PRINT_WIDTH_DOTS); // 576
console.log(PRINT_MAX_HEIGHT_DOTS); // 4096
```

### Error Codes

```ts
try {
  await transport.send({ bytes: rendering.bytes });
} catch (err: any) {
  if (err.code === "INVALID_WIDTH") {
    console.error("PNG width does not match PRINT_WIDTH_DOTS (576)");
  } else if (err.code === "INVALID_HEIGHT") {
    console.error("PNG height exceeds PRINT_MAX_HEIGHT_DOTS (4096) or is 0");
  } else if (err.code === "PAYLOAD_TOO_LARGE") {
    console.error("Compressed PNG exceeds 10 MiB");
  } else if (err.code === "PNG_DECODE_FAILED") {
    console.error("Cannot decode PNG bytes");
  } else if (err.code === "ECONNREFUSED") {
    console.error("Printer not reachable at host:port");
  } else if (err.code === "ETIMEDOUT") {
    console.error("Connection timed out");
  } else if (err.code === "UNSUPPORTED_MIME") {
    console.error("Non-PNG payload rejected (ESC/POS is PNG-only)");
  }
}
```

### Protocol Details

The ESC/POS transport:

1. Decodes the PNG to an RGBA bitmap.
2. Converts RGBA → 1-bit MSB-first row-major packing (luminance < 128 = black).
3. Builds the ESC/POS command stream: init + raster header + packed bitmap + feed (optional) + cut (optional).
4. Writes to TCP and waits for flush.

**Delivery confirmation** is not part of the protocol. A successful TCP close means the printer *accepted* the bytes; it does not confirm the printer *printed* them. For guaranteed print confirmation, implement application-level polling (e.g., printer status endpoint) above this transport.

## File System

Write rendered bytes directly to disk.

### Basic Usage

```ts
import { createFileTransport } from "pressedslip/transports";

const transport = createFileTransport({ path: "/tmp/receipt.png" });
await transport.send({ bytes: rendering.bytes });
```

### Configuration

```ts
export interface FileTransportConfig {
  readonly path: string;
  readonly mode?: number; // default 0o644 (Unix permissions)
}
```

The transport writes atomically via `fs.writeFile`. The `mode` parameter sets file permissions on POSIX systems (ignored on Windows).

### Error Codes

```ts
try {
  await transport.send({ bytes: rendering.bytes });
} catch (err: any) {
  if (err.code === "EACCES") {
    console.error("Permission denied writing to path");
  } else if (err.code === "ENOSPC") {
    console.error("Disk full");
  } else if (err.code === "ENOENT") {
    console.error("Parent directory does not exist");
  } else if (err.code === "EISDIR") {
    console.error("Path is a directory, not a file");
  }
}
```

All errors are Node native `fs.writeFile` error codes. The transport does not wrap them.

## HTTP

POST rendered bytes to a URL.

### Basic Usage

```ts
import { createHttpTransport } from "pressedslip/transports";

const transport = createHttpTransport({
  url: "https://print.example.com/receipt",
  allowedHosts: ["https://print.example.com:443"],
});

await transport.send({ bytes: rendering.bytes });
```

### Configuration

```ts
export interface HttpTransportConfig {
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly allowedHosts?: readonly string[];
  readonly timeoutMs?: number; // default 10000
}
```

- **`url`** — Must be `http://` or `https://`. Userinfo (username/password) is stripped before the request.
- **`headers`** — Extra HTTP headers (e.g., authorization). `Content-Type` is set to the payload's `mimeType` and cannot be overridden.
- **`allowedHosts`** — SSRF mitigation list. Each entry must be a full origin: `"https://print.example.com:443"`. If the URL's origin is not in the list, the transport rejects with `"URL_NOT_ALLOWED"`. If `allowedHosts` is empty or omitted, a warning is logged once per process (disable with `PH_DISABLE_SSRF_WARNING=1`).
- **`timeoutMs`** — HTTP request timeout.

### Example: Custom Headers

```ts
const transport = createHttpTransport({
  url: "https://print.example.com/receipt",
  headers: {
    "Authorization": "Bearer token123",
    "X-Store-ID": "store-42",
  },
  allowedHosts: ["https://print.example.com:443"],
});

await transport.send({ bytes: rendering.bytes });
// POST https://print.example.com/receipt
// Content-Type: image/png
// Authorization: Bearer token123
// X-Store-ID: store-42
// [body: PNG bytes]
```

### SSRF Protection

The `allowedHosts` list is origin-based (scheme + hostname + port). Entries must be exact:

```ts
// Valid
allowedHosts: ["https://print.example.com:443"]

// Invalid—will be rejected if URL uses https://print.example.com:443
allowedHosts: ["https://print.example.com"]

// Valid
allowedHosts: [
  "https://print.example.com:443",
  "http://localhost:3000",
  "https://backup-printer.internal:9100",
]
```

If `allowedHosts` is omitted, the transport logs a warning *once per process*:

```
[pressedslip] HTTP transport created without allowedHosts for URL "https://print.example.com:443".
If URL comes from user-editable input, pass allowedHosts to mitigate SSRF.
```

To suppress the warning in tests or trusted environments:

```ts
process.env.PH_DISABLE_SSRF_WARNING = "1";
```

### Error Codes

```ts
try {
  await transport.send({ bytes: rendering.bytes });
} catch (err: any) {
  if (err.code === "HTTP_INVALID_URL") {
    console.error("URL failed to parse");
  } else if (err.code === "HTTP_INVALID_SCHEME") {
    console.error("URL is not http: or https:");
  } else if (err.code === "URL_NOT_ALLOWED") {
    console.error("Origin not in allowedHosts");
  } else if (err.code === "FETCH_FAILED") {
    console.error("Network error or timeout");
  } else if (err.code === "HTTP_4XX") {
    console.error(`HTTP ${err.cause?.status} ${err.cause?.statusText}`);
  } else if (err.code === "HTTP_5XX") {
    console.error(`HTTP ${err.cause?.status} ${err.cause?.statusText}`);
  }
}
```

The `cause` field on 4xx/5xx errors contains `{ status, statusText }`.

## Custom Transports

Implement the `Transport` interface for any destination.

```ts
import type { Transport, TransportPayload } from "pressedslip/transports";

const myTransport: Transport = {
  async send(payload: TransportPayload): Promise<void> {
    const mimeType = payload.mimeType ?? "image/png";
    
    if (mimeType !== "image/png") {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
    
    // Write bytes to your destination
    console.log(`Sending ${payload.bytes.length} bytes...`);
    // ... your logic ...
  },
};

await myTransport.send({ bytes: rendering.bytes });
```

### Error Contract

Throw an `Error` with a `code` field for retriable errors; let programmer errors (`TypeError`, `ReferenceError`) propagate uncaught:

```ts
import { transportError } from "pressedslip/transports";

const customTransport: Transport = {
  async send(payload: TransportPayload): Promise<void> {
    if (!payload.bytes) {
      // Programmer error—do not catch
      throw new TypeError("payload.bytes is required");
    }
    
    try {
      // Your logic
    } catch (cause) {
      // Retriable error—attach a code
      throw transportError("CUSTOM_UPLOAD_FAILED", "Upload failed", cause);
    }
  },
};
```

### Example: S3

```ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Transport, TransportPayload } from "pressedslip/transports";
import { transportError } from "pressedslip/transports";

const s3 = new S3Client({ region: "us-east-1" });

export const s3Transport: Transport = {
  async send(payload: TransportPayload): Promise<void> {
    const mimeType = payload.mimeType ?? "image/png";
    
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: "my-receipts",
          Key: `receipt-${Date.now()}.png`,
          Body: payload.bytes,
          ContentType: mimeType,
        })
      );
    } catch (cause) {
      throw transportError("S3_UPLOAD_FAILED", "S3 upload failed", cause);
    }
  },
};
```

Then:

```ts
await s3Transport.send({ bytes: rendering.bytes });
```

## Integration Example: Full Pipeline

```ts
import {
  render,
  compose,
  createRegistry,
  builtinBlocks,
  themes,
  loadThemeFonts,
} from "pressedslip";
import { createProviderRegistry } from "pressedslip/providers";
import {
  createEscPosTransport,
  createFileTransport,
  createHttpTransport,
} from "pressedslip/transports";

async function printReceipt() {
  // 1. Compose the briefing
  const registry = createRegistry(builtinBlocks);
  const providers = createProviderRegistry({});
  const composition = await compose({
    providers,
    blocks: registry,
    date: "2026-06-08",
  });

  // 2. Render to PNG
  const prepared = await loadThemeFonts(themes.default);
  const rendering = await render(composition, {
    registry,
    theme: prepared,
  });

  // 3. Send to multiple destinations
  const escpos = createEscPosTransport({
    host: "192.168.1.10",
    port: 9100,
  });
  const fileOut = createFileTransport({
    path: "/var/log/receipts/latest.png",
  });
  const httpServer = createHttpTransport({
    url: "https://archive.example.com/receipt",
    allowedHosts: ["https://archive.example.com:443"],
  });

  try {
    // Print to hardware
    await escpos.send({ bytes: rendering.bytes });
  } catch (err: any) {
    console.error("Printer failed:", err.code, err.message);
  }

  try {
    // Save to disk
    await fileOut.send({ bytes: rendering.bytes });
  } catch (err: any) {
    console.error("File write failed:", err.code, err.message);
  }

  try {
    // Archive remotely
    await httpServer.send({ bytes: rendering.bytes });
  } catch (err: any) {
    console.error("Archive failed:", err.code, err.message);
  }
}

await printReceipt();
```

## Constants

```ts
import {
  PRINT_WIDTH_DOTS,
  PRINT_MAX_HEIGHT_DOTS,
  MAX_COMPRESSED_BYTES,
  DEFAULT_ESCPOS_TIMEOUT_MS,
  DEFAULT_HTTP_TIMEOUT_MS,
} from "pressedslip/transports";

console.log(PRINT_WIDTH_DOTS); // 576
console.log(PRINT_MAX_HEIGHT_DOTS); // 4096
console.log(MAX_COMPRESSED_BYTES); // 10485760 (10 MiB)
console.log(DEFAULT_ESCPOS_TIMEOUT_MS); // 5000
console.log(DEFAULT_HTTP_TIMEOUT_MS); // 10000
```
