import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileTransport } from "../../../src/transports/file.js";

describe("createFileTransport", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ph-file-transport-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes payload bytes to path", async () => {
    const path = join(dir, "out.png");
    const transport = createFileTransport({ path });
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await transport.send({ bytes });
    const written = await readFile(path);
    expect(Array.from(written)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("overwrites existing files by default", async () => {
    const path = join(dir, "out.png");
    await writeFile(path, "old");
    const transport = createFileTransport({ path });
    await transport.send({ bytes: new Uint8Array([1, 2, 3]) });
    const written = await readFile(path);
    expect(Array.from(written)).toEqual([1, 2, 3]);
  });

  it("respects the mode option", async () => {
    const path = join(dir, "out.png");
    const transport = createFileTransport({ path, mode: 0o600 });
    await transport.send({ bytes: new Uint8Array([0]) });
    const s = await stat(path);
    expect(s.mode & 0o777).toBe(0o600);
  });

  it("throws Node fs codes on EACCES (read-only parent dir)", async () => {
    if (process.platform === "win32") return;
    const lockedDir = join(dir, "locked");
    await writeFile(join(dir, "marker"), "");
    const { chmod, mkdir } = await import("node:fs/promises");
    await mkdir(lockedDir);
    await chmod(lockedDir, 0o555);
    try {
      const transport = createFileTransport({ path: join(lockedDir, "out.png") });
      await expect(transport.send({ bytes: new Uint8Array([0]) })).rejects.toMatchObject({
        code: "EACCES",
      });
    } finally {
      await chmod(lockedDir, 0o755);
    }
  });

  it("ignores mimeType (any image format writes as-is)", async () => {
    const path = join(dir, "out.bin");
    const transport = createFileTransport({ path });
    await transport.send({ bytes: new Uint8Array([0xff]), mimeType: "application/octet-stream" });
    const written = await readFile(path);
    expect(written.byteLength).toBe(1);
  });
});
