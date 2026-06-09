import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "fast-png";
import { describe, expect, it } from "vitest";
import type { Composition } from "../../src/index.js";
import { builtinBlocks, createRegistry, loadFontFromBuffer, render } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadFixture(name: string): Promise<Composition> {
  const buf = await readFile(
    join(__dirname, "..", "fixtures/compositions", `${name}.json`),
    "utf8",
  );
  return JSON.parse(buf);
}

async function getFonts() {
  const data = new Uint8Array(
    await readFile(join(__dirname, "..", "fixtures/fonts/jetbrains-mono-regular.ttf")),
  );
  return [await loadFontFromBuffer("JetBrainsMono", data)];
}

describe("integration — fixture renders", () => {
  it("minimal.json → valid PNG, no failures", async () => {
    const c = await loadFixture("minimal");
    const fonts = await getFonts();
    const r = await render(c, { registry: createRegistry([...builtinBlocks]), fonts });
    expect(r.failedBlocks).toEqual([]);
    expect(r.width % 8).toBe(0);
    expect(r.height).toBeGreaterThan(0);
    decode(new Uint8Array(r.bytes)); // parse-validity check; throws if not a valid PNG
  });

  it("multi-block.json → valid PNG, no failures, all 3 blocks rendered", async () => {
    const c = await loadFixture("multi-block");
    const fonts = await getFonts();
    const r = await render(c, { registry: createRegistry([...builtinBlocks]), fonts });
    expect(r.failedBlocks).toEqual([]);
    expect(r.height).toBeGreaterThan(60);
  });

  it("invalid-schema.json → 1 failedBlock, render still produces a PNG", async () => {
    const c = await loadFixture("invalid-schema");
    const fonts = await getFonts();
    const r = await render(c, { registry: createRegistry([...builtinBlocks]), fonts });
    expect(r.failedBlocks).toHaveLength(1);
    expect(r.failedBlocks[0]?.reason.message).toMatch(/schema validation/i);
    expect(r.failedBlocks[0]?.blockType).toBe("textCell");
    expect(r.bytes.byteLength).toBeGreaterThan(0);
  });

  it("unknown-type.json → 1 failedBlock, render still produces a PNG", async () => {
    const c = await loadFixture("unknown-type");
    const fonts = await getFonts();
    const r = await render(c, { registry: createRegistry([...builtinBlocks]), fonts });
    expect(r.failedBlocks).toHaveLength(1);
    expect(r.failedBlocks[0]?.blockType).toBe("wheather");
    expect(r.failedBlocks[0]?.reason.message).toMatch(/unknown.*type/i);
  });
});
