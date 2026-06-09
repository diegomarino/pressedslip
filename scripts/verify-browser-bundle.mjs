#!/usr/bin/env node
/**
 * @fileoverview Asserts that the guarded distribution bundles (`dist/index.mjs`
 * and `dist/browser/index.mjs`) do not transitively import any `node:*` builtin
 * module. Run after `pnpm build` as part of `pnpm verify`.
 *
 * Scope note: this gate enforces ABSENCE OF `node:*` BUILTINS, not browser-safety.
 * The top-level (`dist/index.mjs`) intentionally depends on `@resvg/resvg-js`
 * (a native Node addon that uses legacy `require('fs')` without the `node:`
 * prefix — therefore allowed by this gate). Top-level is Node-only by design.
 * Browser consumers MUST import from the `/browser` subpath. See ADR-0018.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const VIOLATIONS = [
  "node:fs",
  "node:fs/promises",
  "node:http",
  "node:https",
  "node:net",
  "node:crypto",
  "node:os",
  "node:path",
  "node:child_process",
  "node:stream",
  "node:url",
];

function resolveImport(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.mjs`,
    `${base}.js`,
    join(base, "index.mjs"),
    join(base, "index.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function* walk(entry) {
  const seen = new Set();
  const stack = [resolve(entry)];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    yield { file, src };
    // Matches both static `from "..."` (incl. `export ... from "..."`) and
    // dynamic `import("...")`. Tolerant of single or double quotes and
    // arbitrary whitespace inside the dynamic-import parens.
    const importRe = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;
    for (const match of src.matchAll(importRe)) {
      const spec = match[1];
      if (spec.startsWith(".") || spec.startsWith("/")) {
        const next = resolveImport(file, spec);
        if (next !== null) stack.push(next);
      }
    }
  }
}

// Both entries are guarded against `node:*` builtin imports. ADR-0017
// established the fetch-only font loader so the top-level passes the gate.
// The gate does NOT certify browser-safety; see header comment.
const entries = ["dist/index.mjs", "dist/browser/index.mjs"];
let failed = false;

for (const entry of entries) {
  if (!existsSync(entry)) {
    console.error(`✗ Missing build output: ${entry}. Run 'pnpm build' first.`);
    failed = true;
    continue;
  }
  for (const { file, src } of walk(entry)) {
    for (const banned of VIOLATIONS) {
      if (src.includes(`'${banned}'`) || src.includes(`"${banned}"`)) {
        console.error(
          `✗ ${file} transitively imports ${banned} (forbidden in browser-safe bundle for entry ${entry})`,
        );
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error(
    "\nNode-builtin absence gate FAILED. No guarded entry may transitively import `node:*` modules. The top-level may still use npm-package native addons (e.g., @resvg/resvg-js).",
  );
  process.exit(1);
}

console.log("✓ node:* builtin absence gate passed for:", entries.join(", "));
