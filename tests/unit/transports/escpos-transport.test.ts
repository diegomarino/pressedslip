import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createEscPosTransport } from "../../../src/transports/escpos.js";

const FIXTURE_PATH = new URL("../../fixtures/escpos/black-576x8.png", import.meta.url);

function listenAndCapture(): Promise<{
  server: Server;
  port: number;
  received: Promise<Uint8Array>;
}> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let resolveReceived!: (b: Uint8Array) => void;
    const received = new Promise<Uint8Array>((r) => {
      resolveReceived = r;
    });
    const server = createServer((socket) => {
      socket.on("data", (c) => chunks.push(c));
      socket.on("end", () => resolveReceived(new Uint8Array(Buffer.concat(chunks))));
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("bad address");
      resolve({ server, port: addr.port, received });
    });
  });
}

describe("createEscPosTransport", () => {
  let server: Server | undefined;
  afterEach(async () => {
    if (server) await new Promise<void>((r) => server?.close(() => r()));
    server = undefined;
  });

  it("writes raster + feed + cut to TCP socket by default", async () => {
    const png = new Uint8Array(await readFile(FIXTURE_PATH));
    const lp = await listenAndCapture();
    server = lp.server;
    const t = createEscPosTransport({ host: "127.0.0.1", port: lp.port });
    await t.send({ bytes: png });
    const got = await lp.received;
    // Trailer: ESC d 3 (0x1b 0x64 0x03), GS V 0 (0x1d 0x56 0x00).
    expect(Array.from(got.slice(-6))).toEqual([0x1b, 0x64, 0x03, 0x1d, 0x56, 0x00]);
  });

  it("omits feed when feedLines = 0 and omits cut when cut = false", async () => {
    const png = new Uint8Array(await readFile(FIXTURE_PATH));
    const lp = await listenAndCapture();
    server = lp.server;
    const t = createEscPosTransport({
      host: "127.0.0.1",
      port: lp.port,
      feedLines: 0,
      cut: false,
    });
    await t.send({ bytes: png });
    const got = await lp.received;
    // Easier check: no ESC d, no GS V anywhere after the raster.
    for (let i = 0; i < got.length - 1; i++) {
      // biome-ignore lint/style/noNonNullAssertion: array indices are within bounds
      const pair = (got[i]! << 8) | got[i + 1]!;
      expect(pair).not.toBe(0x1b64);
      expect(pair).not.toBe(0x1d56);
    }
  });

  it("throws UNSUPPORTED_MIME for non-image/png payloads", async () => {
    const lp = await listenAndCapture();
    server = lp.server;
    const t = createEscPosTransport({ host: "127.0.0.1", port: lp.port });
    await expect(
      t.send({ bytes: new Uint8Array([0]), mimeType: "image/svg+xml" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MIME" });
  });

  it("preserves ECONNREFUSED when host is closed", async () => {
    const lp = await listenAndCapture();
    await new Promise<void>((r) => lp.server.close(() => r()));
    const png = new Uint8Array(await readFile(FIXTURE_PATH));
    const t = createEscPosTransport({ host: "127.0.0.1", port: lp.port, timeoutMs: 1000 });
    await expect(t.send({ bytes: png })).rejects.toMatchObject({ code: "ECONNREFUSED" });
  });

  it("throws INVALID_CONFIG synchronously when feedLines is out of range", () => {
    expect(() => createEscPosTransport({ host: "x", port: 1, feedLines: 300 })).toThrow(
      expect.objectContaining({ code: "INVALID_CONFIG" }),
    );
  });

  it("throws INVALID_CONFIG synchronously when feedLines is not an integer", () => {
    expect(() => createEscPosTransport({ host: "x", port: 1, feedLines: 1.5 })).toThrow(
      expect.objectContaining({ code: "INVALID_CONFIG" }),
    );
  });

  it("throws INVALID_CONFIG synchronously when feedLines is NaN", () => {
    expect(() => createEscPosTransport({ host: "x", port: 1, feedLines: Number.NaN })).toThrow(
      expect.objectContaining({ code: "INVALID_CONFIG" }),
    );
  });
});
