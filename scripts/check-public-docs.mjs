#!/usr/bin/env node
/**
 * @fileoverview Public documentation consistency gate.
 *
 * This script catches stale adopter-facing docs that TypeDoc/JSDoc presence
 * checks cannot see: obsolete package names, removed diagram assets, and old
 * public API examples.
 */
import { globSync, readFileSync } from "node:fs";

const files = globSync(
  "{README.md,CONTRIBUTING.md,CHANGELOG.md,docs/**/*.md,src/**/*.{ts,tsx},package.json}",
  {
    absolute: false,
  },
).filter(
  (file) =>
    !file.startsWith("docs/specs/") &&
    !file.startsWith("docs/adrs/") &&
    !file.startsWith("docs/api/") &&
    !file.startsWith("docs/superpowers/") &&
    !file.startsWith("node_modules/") &&
    !file.startsWith("dist/") &&
    !file.startsWith("coverage/"),
);

const rules = [
  {
    name: "stale project placeholder",
    pattern: /\bph-project-name\b/,
    message: "Use `pressedslip` in current public docs and source examples.",
  },
  {
    name: "stale package description",
    pattern: /placeholder name/i,
    message: "Package metadata must not describe the project as a placeholder.",
  },
  {
    name: "old loadFontFromUrl object signature",
    pattern: /loadFontFromUrl\(\s*\{/,
    message: "Use positional loadFontFromUrl(name, url, opts).",
  },
  {
    name: "old render png destructuring",
    pattern: /const\s+\{\s*png\s*\}\s*=\s*await\s+render\(/,
    message: "render() returns `bytes`, not `png`.",
  },
  {
    name: "old render paper option",
    pattern: /\bpaper:\s*PAPER\./,
    message: "RenderOptions uses `width`; pass `width: PAPER.*`.",
  },
  {
    name: "old nested slot shape",
    pattern: /\bblock:\s*\{\s*type,/,
    message: "Composition slots use `blockType` + `data`, not nested `block.type`.",
  },
  {
    name: "old slot type key",
    pattern: /"type"\s*:\s*"(textCell|keyValue|kpi|list|qaPair|quotation|wordSearch)"/,
    message: "Composition slot examples use `blockType`, not `type`.",
  },
  {
    name: "old compose slots option",
    pattern: /\bslots:\s*\[\s*\.\.\.\s*\]/,
    message: "compose() options do not accept `slots`; pass providers, blocks, date, and ctx.",
  },
  {
    name: "old docs diagram asset link",
    pattern:
      /architecture\/diagrams\/[^)\s]+\.svg|\.\/diagrams\/[^)\s]+\.svg|\.\.\/architecture\/diagrams\/[^)\s]+\.svg/,
    message: "Architecture diagrams must be inline Mermaid or page links, not SVG files.",
  },
  {
    name: "old D2 current-doc wording",
    pattern: /\bdocs:d2\b|\brender-d2\b|\bd2-config\b|\bD2\b|\bd2 sources\b|\.d2\b/,
    message: "Current docs must not require D2 after the Mermaid migration.",
  },
  {
    name: "stale release version",
    pattern: /\bv0\.0\.0\b/,
    message: "Current release docs must not claim v0.0.0.",
  },
];

const violations = [];

for (const file of files.sort()) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        violations.push({
          file,
          line: i + 1,
          rule: rule.name,
          message: rule.message,
          text: line.trim(),
        });
      }
      rule.pattern.lastIndex = 0;
    }
  }
}

if (violations.length > 0) {
  console.error(
    `❌ public-docs check failed (${violations.length} violation${
      violations.length === 1 ? "" : "s"
    }):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.rule}]`);
    console.error(`    ${v.message}`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

console.log(`✅ public-docs check passed (${files.length} files checked).`);
