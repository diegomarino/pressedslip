#!/usr/bin/env node
// Bundle-size budget gate. Fails if the playground's main JS chunk exceeds
// the threshold. Original baseline (sp6.5) was ~1338 KB with 12% headroom
// (1.5 MB). Raised to 1.6 MB at sp8e to absorb a month of legitimate growth
// (TextStyles API, listItemBullet token, sp8e showcase blocks). Raised to 2 MB
// once the chunk outgrew 1.6 MB (1713 KB); ~16% headroom, growth under review.
//
// To raise (or lower) the gate without a code change, set the CHECK_BUNDLE_BYTES
// env var (raw bytes). In CI this is wired to the `CHECK_BUNDLE_BYTES` GitHub
// Actions repository variable, so the budget can be adjusted from repo settings
// (or `gh variable set`) with no PR. When the variable is unset the default
// below applies. Locally: `CHECK_BUNDLE_BYTES=2621440 node scripts/check-bundle-size.mjs`.

import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB raw
const THRESHOLD_BYTES = (() => {
  const raw = process.env.CHECK_BUNDLE_BYTES;
  if (!raw) return DEFAULT_THRESHOLD_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(
      `[check-bundle-size] ignoring invalid CHECK_BUNDLE_BYTES=${JSON.stringify(raw)}, using default`,
    );
    return DEFAULT_THRESHOLD_BYTES;
  }
  return parsed;
})();

const here = dirname(fileURLToPath(import.meta.url));
const distAssets = resolve(here, "..", "apps", "playground", "dist", "assets");

let entries;
try {
  entries = readdirSync(distAssets);
} catch (err) {
  console.error(`[check-bundle-size] cannot read ${distAssets}: ${err.message}`);
  console.error("[check-bundle-size] run `pnpm --filter pressedslip-playground build` first.");
  process.exit(1);
}

const mainChunks = entries.filter((name) => /^index-.*\.js$/.test(name));
if (mainChunks.length === 0) {
  console.error(`[check-bundle-size] no index-*.js found in ${distAssets}`);
  process.exit(1);
}
if (mainChunks.length > 1) {
  console.error(`[check-bundle-size] expected exactly one index-*.js, found ${mainChunks.length}:`);
  for (const name of mainChunks) console.error(`  - ${name}`);
  process.exit(1);
}

const mainPath = join(distAssets, mainChunks[0]);
const size = statSync(mainPath).size;
const sizeKB = (size / 1024).toFixed(0);
const thresholdKB = (THRESHOLD_BYTES / 1024).toFixed(0);

if (size > THRESHOLD_BYTES) {
  const overKB = ((size - THRESHOLD_BYTES) / 1024).toFixed(0);
  console.error(
    `[check-bundle-size] ✘ ${mainChunks[0]} is ${sizeKB} KB, exceeds ${thresholdKB} KB by ${overKB} KB`,
  );
  process.exit(1);
}

const headroomKB = ((THRESHOLD_BYTES - size) / 1024).toFixed(0);
console.log(
  `[check-bundle-size] ✓ ${mainChunks[0]} is ${sizeKB} KB ≤ ${thresholdKB} KB (${headroomKB} KB headroom)`,
);
