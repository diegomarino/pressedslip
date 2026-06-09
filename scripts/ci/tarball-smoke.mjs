#!/usr/bin/env node
/**
 * Tarball install + render smoke test.
 *
 * Steps:
 *   1. `pnpm pack` at repo root, capture tarball path.
 *   2. Create a temp project, install the tarball + peer deps.
 *   3. Smoke-script imports from all 5 entry points + calls render() with
 *      a pre-loaded font + minimal composition.
 *   4. Assert: returned `Rendering` contains non-empty bytes buffer AND
 *      width/height > 0.
 *
 * Exit 0 = pass; any non-zero = fail.
 */
import { execSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const PKG_JSON = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
const NAME = PKG_JSON.name;
const FONT_FIXTURE = join(REPO_ROOT, "scripts/ci/fixtures/test-font.ttf");

console.log(`[tarball-smoke] packing ${NAME}…`);
const packOutput = execSync("pnpm pack --pack-destination /tmp", {
  cwd: REPO_ROOT,
  encoding: "utf8",
});
// Last non-empty line is the tarball path.
const tarballPath = packOutput.trim().split("\n").filter(Boolean).pop();
console.log(`[tarball-smoke] tarball at: ${tarballPath}`);

const tmpDir = mkdtempSync(join(tmpdir(), "tarball-smoke-"));
console.log(`[tarball-smoke] temp project: ${tmpDir}`);
copyFileSync(FONT_FIXTURE, join(tmpDir, "test-font.ttf"));

// Write package.json BEFORE adding deps; do NOT run `pnpm init` (it would
// overwrite this file with defaults, stripping `"type": "module"` and
// causing the ESM smoke script below to fail with `SyntaxError: Cannot
// use import statement` when executed via `node`).
writeFileSync(
  join(tmpDir, "package.json"),
  JSON.stringify({ name: "tarball-smoke", version: "0.0.0", type: "module" }, null, 2),
);

// `--prefer-offline` per spec §Risks ("Smoke job uses --offline … no
// network calls for the install step"). The runner's pnpm cache is
// populated by the prior `verify` job (same workflow run), so react +
// react-dom + zod resolve from cache without registry hits. If the
// cache is cold (first run in a runner), pnpm will fall back to the
// registry — acceptable degradation.
//
// react/react-dom/zod are peerDependencies of pressedslip: an adopter
// installing the tarball MUST also install them, so the smoke
// faithfully mirrors adopter behavior.
execSync(`pnpm add --prefer-offline ${tarballPath} react react-dom zod`, {
  cwd: tmpDir,
  stdio: "inherit",
});

// Smoke script — exercises all 5 entry points.
// NOTE: API shape verified against src/types.ts + src/render.tsx at HEAD:
//   - loadFontFromBuffer(name: string, data: Uint8Array, opts?) — NOT {family, buffer, ...}
//   - render() returns { bytes, format, width, height, failedBlocks } — NOT { png, blocks }
//   - Composition requires { id, version, date, status, slots, failedBlocks, providerOutcomes, timing }
//   - textCell data shape: { text: string } (not { title, body })
//   - RenderOptions.width accepts WidthSpec (PAPER constant or number); no `paper` key
const smokeJs = `
import { render, createRegistry, builtinBlocks, loadFontFromBuffer, PAPER } from "${NAME}";
import * as Testing from "${NAME}/testing";
import * as Providers from "${NAME}/providers";
import * as Browser from "${NAME}/browser";
import * as Transports from "${NAME}/transports";
import { readFileSync } from "node:fs";

if (!Testing.builtinFixtures) throw new Error("Testing subpath broken");
if (!Providers.defineProvider) throw new Error("Providers subpath broken");
if (!Browser.builtinBlocks) throw new Error("Browser subpath broken");
if (!Transports.createFileTransport) throw new Error("Transports subpath broken");

const fontBytes = readFileSync("./test-font.ttf");
const font = await loadFontFromBuffer("JetBrains Mono", new Uint8Array(fontBytes), { weight: 400, style: "normal" });

const registry = createRegistry(builtinBlocks);

// Minimal valid Composition — render-only flow (no orchestrator).
const composition = {
  id: "tarball-smoke",
  version: 1,
  date: "2026-01-01",
  status: "ready",
  slots: [
    { index: 0, blockType: "textCell", data: { text: "tarball install ok" } },
  ],
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

const rendering = await render(composition, {
  registry,
  fonts: [font],
  width: PAPER.thermal80,
});

if (!rendering.bytes || rendering.bytes.length === 0) throw new Error("Empty bytes buffer");
if (!rendering.width || rendering.width === 0) throw new Error("Zero width in rendering");

console.log(\`[tarball-smoke] PNG bytes: \${rendering.bytes.length}; size: \${rendering.width}x\${rendering.height}\`);
console.log("[tarball-smoke] PASS");
`;

writeFileSync(join(tmpDir, "smoke.mjs"), smokeJs);

try {
  execSync(`node smoke.mjs`, { cwd: tmpDir, stdio: "inherit" });
} catch (_err) {
  console.error("[tarball-smoke] FAIL");
  process.exit(1);
}
