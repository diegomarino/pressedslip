import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadFontFromBuffer } from "../../../src/fonts.js";
import { renderReactToSvg } from "../../../src/pipeline/satori-to-svg.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontPath = join(__dirname, "..", "..", "fixtures/fonts/jetbrains-mono-regular.ttf");

describe("renderReactToSvg", () => {
  it("returns an SVG string for a simple React tree", async () => {
    const data = new Uint8Array(await readFile(fontPath));
    const font = await loadFontFromBuffer("JetBrainsMono", data);
    const tree = (
      <div style={{ width: "100%", padding: 8, color: "black", background: "white" }}>hello</div>
    );
    const svg = await renderReactToSvg(tree, { width: 576, fonts: [font] });
    expect(svg).toMatch(/^<svg/);
    // Satori converts text to <path> elements; the literal word is not preserved
    expect(svg).toContain("<path");
  });
});
