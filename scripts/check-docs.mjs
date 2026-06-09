#!/usr/bin/env node
import { execSync } from "node:child_process";
/**
 * @fileoverview CLI entry point for the docs policy check. Walks `src/**`
 * (or the staged subset under that path when `--staged` is passed), feeds
 * each file through checkSource(), and exits non-zero if any violation
 * is reported.
 */
import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkSource } from "./check-docs/checker.mjs";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");

const SRC_PATTERN = "src/**/*.{ts,tsx}";

/**
 * Return the absolute paths of files to check, given the CLI mode.
 * @returns {string[]}
 */
function selectFiles() {
  if (stagedOnly) {
    const stdout = execSync("git diff --staged --name-only --diff-filter=ACMR", {
      encoding: "utf8",
    });
    return stdout
      .split("\n")
      .map((s) => s.trim())
      .filter((p) => p.length > 0)
      .filter((p) => /^src\/.*\.(ts|tsx)$/.test(p))
      .map((p) => resolve(p));
  }
  return globSync(SRC_PATTERN, { absolute: true });
}

const files = selectFiles();
let totalViolations = 0;
const lines = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const rel = file.replace(`${process.cwd()}/`, "");
  const violations = checkSource(text, rel);
  for (const v of violations) {
    lines.push(`  ${v.file}:${v.line}:${v.column}\n    ${v.message}`);
    totalViolations++;
  }
}

if (totalViolations > 0) {
  console.error(
    `❌ docs/check failed (${totalViolations} violation${totalViolations === 1 ? "" : "s"}):\n`,
  );
  console.error(lines.join("\n\n"));
  console.error("\nRun `pnpm check-docs` locally. See CONTRIBUTING.md → Documentation policy.");
  process.exit(1);
}

if (!stagedOnly) {
  console.log(
    `✅ docs/check passed (${files.length} file${files.length === 1 ? "" : "s"} checked).`,
  );
}
process.exit(0);
