// scripts/regen-baseline.ts
// One-shot: re-renders the baseline composition and writes the new PNG.
// Run after any intentional visual change to the baseline composition.
import { readFile, writeFile } from "node:fs/promises";
import {
  applyHeaderDefaults,
  applyShellDefaults,
  keyValueBlock,
  kpiBlock,
  listBlock,
  loadFontFromBuffer,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
} from "../src/index.js";
import { createRegistry } from "../src/registry.js";
import { render } from "../src/render.js";
import { themes } from "../src/themes/index.js";
import type { PreparedTheme } from "../src/themes/types.js";

const composition = JSON.parse(
  await readFile("src/__tests__/fixtures/baseline/baseline.composition.json", "utf8"),
);
const interRegular = await readFile("src/__tests__/fixtures/baseline/fonts/Inter-Regular.ttf");
const interBold = await readFile("src/__tests__/fixtures/baseline/fonts/Inter-Bold.ttf");
const localFonts = [
  await loadFontFromBuffer("Inter", new Uint8Array(interRegular), { weight: 400 }),
  await loadFontFromBuffer("Inter", new Uint8Array(interBold), { weight: 700 }),
];
const themeWithLocalFonts: PreparedTheme = {
  _kind: "prepared",
  id: "default-local",
  label: "Default (local fonts)",
  fonts: localFonts,
  fontRoles: { body: localFonts, display: localFonts.slice(1) },
  shell: applyShellDefaults(themes.default.shell),
  header: applyHeaderDefaults(themes.default.header),
};
const registry = createRegistry([
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
]);
const result = await render(composition, {
  theme: themeWithLocalFonts,
  registry,
  width: { px: 576 },
});
const png = result.bytes;
await writeFile("src/__tests__/fixtures/baseline/baseline.png", Buffer.from(png));
console.log("baseline.png regenerated at", png.length, "bytes");
