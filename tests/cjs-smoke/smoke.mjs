// ESM mirror of smoke.cjs — imports the built dist (not src/) and runs one
// real render. Pairs with smoke.cjs to ensure both consumer module systems
// resolve satori's namespace correctly under Node >= 22.12.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const pkg = await import("../../dist/index.mjs");
  const { builtinBlocks, createRegistry, loadFontFromBuffer, render } = pkg;

  const fontBuf = new Uint8Array(
    await readFile(join(__dirname, "..", "fixtures", "fonts", "jetbrains-mono-regular.ttf")),
  );
  const font = await loadFontFromBuffer("JetBrainsMono", fontBuf);

  const composition = JSON.parse(
    await readFile(join(__dirname, "..", "fixtures", "compositions", "minimal.json"), "utf8"),
  );

  const result = await render(composition, {
    registry: createRegistry([...builtinBlocks]),
    fonts: [font],
  });

  if (result.failedBlocks.length > 0) {
    throw new Error(
      "ESM smoke: render produced failedBlocks: " + JSON.stringify(result.failedBlocks),
    );
  }
  if (!(result.bytes && result.bytes.byteLength > 0)) {
    throw new Error("ESM smoke: render produced no bytes");
  }
  console.log("ESM smoke OK:", result.width, "x", result.height, "bytes:", result.bytes.byteLength);
}

main().catch((err) => {
  console.error("ESM smoke FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});
