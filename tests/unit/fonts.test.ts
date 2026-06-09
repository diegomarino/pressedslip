import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getGlobalDispatcher, MockAgent, setGlobalDispatcher, fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadFontFromBuffer, loadFontFromUrl } from "../../src/fonts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontPath = join(__dirname, "..", "fixtures/fonts/jetbrains-mono-regular.ttf");
const FIXTURE_FONT = fontPath;

describe("loadFontFromBuffer", () => {
  it("returns a LoadedFont with provided name and data", async () => {
    const data = await readFile(fontPath);
    const font = await loadFontFromBuffer("TestFont", new Uint8Array(data));
    expect(font.name).toBe("TestFont");
    expect(font.data.byteLength).toBe(data.byteLength);
    expect(font.weight).toBe(400); // default
    expect(font.style).toBe("normal"); // default
  });

  it("respects weight and style options", async () => {
    const data = await readFile(fontPath);
    const font = await loadFontFromBuffer("Bold", new Uint8Array(data), {
      weight: 700,
      style: "italic",
    });
    expect(font.weight).toBe(700);
    expect(font.style).toBe("italic");
  });
});

describe("loadFontFromUrl (fetch-only)", () => {
  let originalDispatcher: ReturnType<typeof getGlobalDispatcher>;
  let agent: MockAgent;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    // Swap global fetch to undici's fetch so MockAgent intercepts it. Node's
    // built-in fetch uses Node's internal undici instance and ignores our
    // userland setGlobalDispatcher call.
    originalFetch = globalThis.fetch;
    globalThis.fetch = undiciFetch as unknown as typeof globalThis.fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await agent.close();
    setGlobalDispatcher(originalDispatcher);
  });

  it("loads a font from https:// via fetch", async () => {
    const fontBytes = await readFile(FIXTURE_FONT);
    agent.get("https://fonts.example").intercept({ path: "/jbm.ttf" }).reply(200, fontBytes);

    const font = await loadFontFromUrl("JBM", "https://fonts.example/jbm.ttf");
    expect(font.name).toBe("JBM");
    expect(font.data.byteLength).toBe(fontBytes.byteLength);
    expect(font.weight).toBe(400);
    expect(font.style).toBe("normal");
  });

  it("throws when fetch returns non-OK status", async () => {
    agent.get("https://fonts.example").intercept({ path: "/missing.ttf" }).reply(404, "");
    await expect(loadFontFromUrl("X", "https://fonts.example/missing.ttf")).rejects.toThrow(
      /HTTP 404/,
    );
  });

  it("rejects file:// URLs (fetch does not support them in Node)", async () => {
    await expect(loadFontFromUrl("X", "file:///tmp/font.ttf")).rejects.toThrow(TypeError);
  });
});
