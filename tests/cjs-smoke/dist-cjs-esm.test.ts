/**
 * Guards the satori CJS-interop fix.
 *
 * Before: `import satori from "satori"` compiled to `__toESM(require("satori"), 1)`
 * in the CJS bundle. Under Node >= 22.12 (`require(esm)` enabled by default),
 * the wrapper set `satori.default` to satori's whole namespace, and the call
 * site `(0, satori.default)(...)` threw "is not a function". ESM consumers
 * were unaffected because esbuild leaves `import` statements alone in ESM
 * output, so the bug had to be caught via the *built* CJS dist.
 *
 * This test execs node against the built dist via standalone harness scripts.
 * It is skipped when `dist/` is absent (e.g. fresh clone without `pnpm build`).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DIST_INDEX_CJS = join(REPO_ROOT, "dist", "index.cjs");
const DIST_INDEX_MJS = join(REPO_ROOT, "dist", "index.mjs");

const distBuilt = existsSync(DIST_INDEX_CJS) && existsSync(DIST_INDEX_MJS);
const describeIfBuilt = distBuilt ? describe : describe.skip;

describeIfBuilt("built dist smoke (Node CJS + ESM consumers)", () => {
  it("CJS consumer can require dist/index.cjs and render without TypeError", () => {
    const result = spawnSync(process.execPath, [join(__dirname, "smoke.cjs")], {
      encoding: "utf8",
      cwd: REPO_ROOT,
    });
    expect(result.stderr).not.toMatch(/satori\.default.*is not a function/);
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toMatch(/CJS smoke OK/);
  });

  it("ESM consumer can import dist/index.mjs and render", () => {
    const result = spawnSync(process.execPath, [join(__dirname, "smoke.mjs")], {
      encoding: "utf8",
      cwd: REPO_ROOT,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toMatch(/ESM smoke OK/);
  });
});
