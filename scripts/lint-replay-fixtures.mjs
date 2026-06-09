#!/usr/bin/env node
/**
 * @fileoverview Lint replay-harness fixtures (spec §3 Decision 5). Enforces:
 *   1. Top-level fixture schema (name, sourceMeta, input, expected, notes).
 *   2. Fixture-level sourceMeta fields are exactly the bounded set:
 *      { sampledFrom, sampledOn, sanitization, verifiedAgainst }.
 *   3. sourceMeta.verifiedAgainst is "reference-code" | "marplanner-production".
 *   4. input.sourceMeta fields are inside INPUT_SOURCE_META_ALLOWED_FIELDS
 *      (currently EMPTY → fail-closed default per Codex finding can_11).
 *   5. expected.briefingStatus is one of the BriefingStatus values.
 *   6. expected.contentChecks[].path matches the dotted-path regex.
 *   7. WARNING (not error) when contentChecks is omitted or empty (soft policy).
 *
 * Exit code 0 = clean (warnings OK). Exit code 1 = at least one error.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Locked schema constants (kept in sync with src/_internal/adapters/types.ts).
// Accepts: top-level Slot fields (title|blockType|index) OR data-rooted dotted
// paths with at least one segment, where each segment is either a JS-identifier
// (e.g. "data.items") or a numeric array index (e.g. "data.items.0.title").
const PATH_RE = /^(title|blockType|index|data(?:\.[a-zA-Z_$][\w$]*|\.\d+)+)$/;
const BRIEFING_STATUSES = new Set(["pending", "ready", "partial", "failed", "render-failed"]);
const SOURCE_META_FIELDS = new Set(["sampledFrom", "sampledOn", "sanitization", "verifiedAgainst"]);
const VERIFIED_AGAINST = new Set(["reference-code", "marplanner-production"]);
const INPUT_SOURCE_META_ALLOWED_FIELDS = new Set(); // empty → fail-closed

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const dir = dirIdx >= 0 ? args[dirIdx + 1] : "tests/fixtures/replay";

const errors = [];
const warnings = [];

function pushErr(file, msg) {
  errors.push(`[${file}] ${msg}`);
}
function pushWarn(file, msg) {
  warnings.push(`[${file}] WARNING: ${msg}`);
}

let entries;
try {
  entries = (await readdir(dir)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
} catch (e) {
  console.error(`Could not read directory "${dir}": ${e.message}`);
  process.exit(1);
}

for (const f of entries) {
  const path = join(dir, f);
  let fix;
  try {
    fix = JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    pushErr(f, `JSON parse failed: ${e.message}`);
    continue;
  }

  // Top-level shape
  for (const k of ["name", "sourceMeta", "input", "expected", "notes"]) {
    if (!(k in fix)) pushErr(f, `missing top-level field "${k}"`);
  }

  // Fixture-level sourceMeta
  if (fix.sourceMeta && typeof fix.sourceMeta === "object") {
    for (const k of Object.keys(fix.sourceMeta)) {
      if (!SOURCE_META_FIELDS.has(k)) pushErr(f, `unknown sourceMeta field "${k}"`);
    }
    if (
      fix.sourceMeta.verifiedAgainst !== undefined &&
      !VERIFIED_AGAINST.has(fix.sourceMeta.verifiedAgainst)
    ) {
      pushErr(
        f,
        `sourceMeta.verifiedAgainst "${fix.sourceMeta.verifiedAgainst}" must be "reference-code" or "marplanner-production"`,
      );
    }
  }

  // Envelope-side sourceMeta (must be inside the allowlist; currently empty)
  if (
    fix.input &&
    typeof fix.input === "object" &&
    fix.input.sourceMeta &&
    typeof fix.input.sourceMeta === "object"
  ) {
    for (const k of Object.keys(fix.input.sourceMeta)) {
      if (!INPUT_SOURCE_META_ALLOWED_FIELDS.has(k)) {
        pushErr(
          f,
          `input.sourceMeta.${k} is outside the allowlist (currently empty — fail-closed default)`,
        );
      }
    }
  }

  // Expected shape
  if (fix.expected && typeof fix.expected === "object") {
    if (!BRIEFING_STATUSES.has(fix.expected.briefingStatus)) {
      pushErr(
        f,
        `expected.briefingStatus "${fix.expected.briefingStatus}" is not a valid BriefingStatus`,
      );
    }
    const checks = fix.expected.contentChecks;
    if (!Array.isArray(checks) || checks.length === 0) {
      pushWarn(f, `contentChecks omitted or empty (soft policy recommends ≥1)`);
    } else {
      for (const c of checks) {
        if (typeof c.slotIndex !== "number") pushErr(f, `contentCheck.slotIndex must be a number`);
        if (typeof c.path !== "string" || !PATH_RE.test(c.path)) {
          pushErr(f, `invalid contentCheck.path "${c.path}"`);
        }
        if (typeof c.contains !== "string") pushErr(f, `contentCheck.contains must be a string`);
      }
    }
  }
}

for (const w of warnings) console.error(w);
for (const e of errors) console.error(e);

if (errors.length > 0) {
  console.error(`lint-replay-fixtures: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`lint-replay-fixtures: OK (${entries.length} fixtures, ${warnings.length} warnings)`);
