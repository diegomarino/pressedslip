#!/usr/bin/env node
/**
 * Snapshot README previews from current example outputs.
 *
 * Each example writes ./<name>/output.png on every run, but those are
 * gitignored and change daily (the date header + corpus rotation). To produce
 * a stable set of preview images for examples/README.md, this script:
 *
 *   1. Reads each examples/<name>/output.png
 *   2. Crops the top 75 px (covers pressedslip's standard date-header strip)
 *   3. Writes the result to examples/<name>.png (committed to git)
 *
 * This is a manual "snapshot today's outputs" tool — re-run when you want the
 * previews refreshed. It does NOT generate fresh outputs first; run
 * `pnpm example:all` before this script.
 *
 * Usage:  node examples/snapshot-previews.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, encode } from "fast-png";

const HEADER_CROP_PX = 75;
const EXAMPLES = ["number-fact", "dad-joke", "riddle", "word-of-day", "weather"];

const examplesDir = dirname(fileURLToPath(import.meta.url));

for (const name of EXAMPLES) {
  const src = resolve(examplesDir, name, "output.png");
  const dst = resolve(examplesDir, `${name}.png`);

  let buffer;
  try {
    buffer = readFileSync(src);
  } catch {
    console.warn(`[snapshot] skip ${name}: ${src} not found (run pnpm example:${name} first)`);
    continue;
  }

  const png = decode(buffer);
  const { width, height, depth, channels } = png;
  if (height <= HEADER_CROP_PX) {
    console.warn(
      `[snapshot] skip ${name}: image height ${height}px is <= crop ${HEADER_CROP_PX}px`,
    );
    continue;
  }

  const bytesPerRow = (width * channels * depth) / 8;
  if (!Number.isInteger(bytesPerRow)) {
    console.warn(`[snapshot] skip ${name}: row size ${bytesPerRow} is not byte-aligned`);
    continue;
  }

  const cropped = png.data.subarray(HEADER_CROP_PX * bytesPerRow);
  const out = encode({
    data: cropped,
    width,
    height: height - HEADER_CROP_PX,
    depth,
    channels,
  });

  writeFileSync(dst, out);
  console.log(`[snapshot] ${src} → ${dst} (${width}×${height - HEADER_CROP_PX})`);
}
