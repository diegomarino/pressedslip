// CJS smoke harness: reproduces and guards against the satori namespace bug
// that affected Node >= 22.12 CJS consumers of pressedslip.
//
// Reads the *built* dist via require() — must NOT import src/ — and runs one
// real render. If satori's namespace is double-wrapped by esbuild's __toESM,
// this throws "satori.default is not a function" at render time.

const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

async function main() {
  const pkg = require("../../dist/index.cjs");
  const { builtinBlocks, createRegistry, loadFontFromBuffer, render } = pkg;

  const fontPath = join(__dirname, "..", "fixtures", "fonts", "jetbrains-mono-regular.ttf");
  const fontBuf = new Uint8Array(await readFile(fontPath));
  const font = await loadFontFromBuffer("JetBrainsMono", fontBuf);

  const compositionPath = join(__dirname, "..", "fixtures", "compositions", "minimal.json");
  const composition = JSON.parse(await readFile(compositionPath, "utf8"));

  const result = await render(composition, {
    registry: createRegistry([...builtinBlocks]),
    fonts: [font],
  });

  if (result.failedBlocks.length > 0) {
    throw new Error(
      "CJS smoke: render produced failedBlocks: " + JSON.stringify(result.failedBlocks),
    );
  }
  if (!(result.bytes && result.bytes.byteLength > 0)) {
    throw new Error("CJS smoke: render produced no bytes");
  }
  console.log("CJS smoke OK:", result.width, "x", result.height, "bytes:", result.bytes.byteLength);
}

main().catch((err) => {
  console.error("CJS smoke FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
