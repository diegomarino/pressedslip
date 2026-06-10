#!/usr/bin/env node
/**
 * @fileoverview Typecheck gate for TypeScript code fences in documentation.
 *
 * ## Strategy: per-fence modules
 *
 * Each TypeScript fence in a doc file becomes its own isolated module file,
 * written to a temp dir and compiled together in a single tsc invocation.
 * An ambient declarations file (scripts/doc-snippets-context.d.ts) is
 * included in every compilation — it declares the "prose-established" variables
 * that honest fragments reference without re-importing them (composition,
 * registry, theme, prepared, bytes, etc.).
 *
 * Why per-fence instead of per-file concatenation?
 *   Concatenation causes TS2300/TS2451 floods because every fence re-imports
 *   the same names and redeclares variables. Per-fence modules avoid all
 *   duplicate-identifier false positives by giving each snippet its own scope.
 *   The ambient file fills in the cross-fence "prose context" variables.
 *
 * ## Ambient context
 *
 * scripts/doc-snippets-context.d.ts declares `composition`, `registry`,
 * `theme`, `prepared`, `bytes`, `providers`, `myCustomBlock`, etc. with their
 * real types imported from dist/ declarations. This provides real type coverage
 * (not `any`) for fragment fences that reference pre-established variables.
 *
 * ## Opt-out marker
 *
 * To skip a fence that is intentionally partial, pseudo-code, or shows
 * deliberately invalid code (❌ wrong examples), add ONE of:
 *
 *   a) A comment on the opening fence line:
 *      ```ts check-doc-snippets: skip
 *
 *   b) An HTML comment on the line immediately before the fence:
 *      <!-- check-doc-snippets: skip -->
 *      ```ts
 *
 * Both forms are honoured. Skipped fences are counted in the summary but are
 * not typechecked.
 *
 * ## Schema notation fences
 *
 * Fences in docs/blocks/ that show bare object-type literals (the data schema
 * shape) are wrapped in `type _DocSchema = { ... }` so tsc can parse them as
 * type declarations rather than value expressions.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  globSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TSCONFIG_SNIPPETS = join(ROOT, "tsconfig.doc-snippets.json");
// Ambient declarations file included in every per-fence compilation.
const CONTEXT_DTS = join(ROOT, "scripts", "doc-snippets-context.d.ts");
// External-package shims (non-module d.ts — must not have top-level imports).
const SHIMS_DTS = join(ROOT, "scripts", "doc-snippets-shims.d.ts");

// ---------------------------------------------------------------------------
// Glob doc files
// ---------------------------------------------------------------------------

const DOC_GLOBS = ["README.md", "docs/guide/*.md", "docs/themes/*.md", "docs/blocks/*.md"];

const docFiles = DOC_GLOBS.flatMap((pattern) =>
  globSync(pattern, { cwd: ROOT, absolute: true }),
).sort();

// ---------------------------------------------------------------------------
// Fence extraction
// ---------------------------------------------------------------------------

const SKIP_MARKER = /check-doc-snippets:\s*skip/i;

/**
 * @typedef {{ content: string; startLine: number; lang: string; skipped: boolean; docFile: string; fenceIndex: number }} Fence
 */

/**
 * Extract all TS/TSX fenced code blocks from a markdown file.
 * @param {string} text
 * @param {string} docFile  absolute path to the source markdown file
 * @returns {Fence[]}
 */
function extractFences(text, docFile) {
  const lines = text.split(/\r?\n/);
  const fences = [];
  let inFence = false;
  /** @type {number} */
  let fenceStart = 0;
  /** @type {string} */
  let lang = "ts";
  /** @type {string[]} */
  let body = [];
  let skipped = false;
  let fenceIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (!inFence) {
      // Opening fence: match ``` followed by ts, tsx, or typescript (optional
      // inline text after the lang tag is also accepted, e.g. for skip marker).
      const openMatch = line.match(/^(\s*)```(tsx?|typescript)(\s.*)?$/);
      if (openMatch) {
        const inlineComment = openMatch[3] ?? "";
        // Check for skip marker on the fence line itself
        const skipOnFence = SKIP_MARKER.test(inlineComment);
        // Check for HTML comment on the immediately preceding line
        const prevLine = i > 0 ? (lines[i - 1] ?? "") : "";
        const skipOnPrev = SKIP_MARKER.test(prevLine);

        inFence = true;
        fenceStart = i + 1; // 1-based line of first content line
        lang = (openMatch[2] ?? "ts").replace("typescript", "ts");
        body = [];
        skipped = skipOnFence || skipOnPrev;
      }
    } else {
      // Closing fence
      if (/^(\s*)```\s*$/.test(line)) {
        fences.push({
          content: body.join("\n"),
          startLine: fenceStart,
          lang,
          skipped,
          docFile,
          fenceIndex,
        });
        fenceIndex++;
        inFence = false;
      } else {
        body.push(line);
      }
    }
  }

  return fences;
}

// ---------------------------------------------------------------------------
// Build temp dir
// ---------------------------------------------------------------------------

// Use realpathSync to resolve macOS /var → /private/var symlink so that the
// path we store matches the path tsc outputs in diagnostics (tsc resolves
// symlinks when printing file paths).
const _TEMP_DIR_RAW = join(tmpdir(), `check-doc-snippets-${process.pid}`);
mkdirSync(_TEMP_DIR_RAW, { recursive: true });
const TEMP_DIR = realpathSync(_TEMP_DIR_RAW);

// Clean up on exit (best-effort)
function cleanup() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

// ---------------------------------------------------------------------------
// Schema notation wrapper
// ---------------------------------------------------------------------------

/**
 * Detect a "schema notation" fence: a bare object literal used in docs to
 * show a block's data shape. These start with `{` and contain TypeScript
 * property-declaration-style lines (`name?: type;`), but are not valid
 * standalone TS. Wrap them in `type _DocSchema = { ... }` so tsc can parse
 * and typecheck the type structure.
 *
 * Heuristic: trimmed content starts with `{`, ends with `}`, and contains
 * at least one line matching a property declaration pattern (identifier
 * followed by optional `?`, `:`, a type expression, and `;`).
 *
 * With per-fence files, the duplicate _DocSchema problem from the concatenation
 * strategy is gone — each fence is its own file.
 *
 * @param {string} content
 * @returns {string}
 */
function maybeWrapSchemaNotation(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return content;
  // Must look like type declarations, not a regular object (values would be
  // JS expressions, not bare type names). Check for `identifier?: TypeName;`
  // or `identifier: TypeName;` where TypeName is a bare word or union.
  const SCHEMA_LINE = /^\s+\w[\w.]*\??:\s+\S/;
  const lines = trimmed.split("\n");
  const looksLikeSchema = lines.some((l) => SCHEMA_LINE.test(l));
  if (!looksLikeSchema) return content;
  return `type _DocSchema = ${trimmed}`;
}

// ---------------------------------------------------------------------------
// Write per-fence snippet files
// ---------------------------------------------------------------------------

/**
 * @type {{ docFile: string; tempFile: string; fenceStartLine: number }[]}
 */
const snippetFiles = [];
let totalFences = 0;
let totalSkipped = 0;

// Detect JSX in a fence (some docs use `ts` fences containing JSX).
const JSX_PATTERN = /<[A-Za-z][A-Za-z0-9.]*[\s/>]|<\/[A-Za-z]/;

for (const docFile of docFiles) {
  const text = readFileSync(docFile, "utf8");
  const fences = extractFences(text, docFile);

  const tsFences = fences.filter((f) => f.lang === "ts" || f.lang === "tsx");

  if (tsFences.length === 0) continue;

  const relDoc = docFile.replace(`${ROOT}/`, "");
  const safeName = relDoc.replace(/[/\\]/g, "--").replace(/\.md$/, "");

  totalFences += tsFences.length;
  totalSkipped += tsFences.filter((f) => f.skipped).length;

  for (const fence of tsFences) {
    if (fence.skipped) continue;

    const hasJsx = fence.lang === "tsx" || JSX_PATTERN.test(fence.content);
    const ext = hasJsx ? "tsx" : "ts";
    const tempFile = join(TEMP_DIR, `${safeName}--fence${fence.fenceIndex}.${ext}`);

    const banner = [
      `// SOURCE: ${relDoc}:~${fence.startLine}`,
      `// Auto-generated by scripts/check-doc-snippets.mjs — do not edit`,
      // Ensure the file is treated as a module (not a global script) so that
      // type aliases, variables, and other declarations are module-scoped.
      // Without this, fences that have no imports/exports are global scripts,
      // and `type _DocSchema` (schema notation wrapper) would duplicate across
      // all schema fences since global type aliases cannot be re-declared.
      `export {};`,
      "",
    ].join("\n");

    const wrappedContent = maybeWrapSchemaNotation(fence.content);
    const content = banner + wrappedContent;
    writeFileSync(tempFile, content, "utf8");

    snippetFiles.push({
      docFile: relDoc,
      tempFile,
      fenceStartLine: fence.startLine,
    });
  }
}

// ---------------------------------------------------------------------------
// Ensure tsconfig and ambient context exist
// ---------------------------------------------------------------------------

if (!existsSync(TSCONFIG_SNIPPETS)) {
  console.error(
    `❌ Missing ${TSCONFIG_SNIPPETS}. Create it first (see scripts/check-doc-snippets.mjs header).`,
  );
  process.exit(1);
}

if (!existsSync(CONTEXT_DTS)) {
  console.error(
    `❌ Missing ${CONTEXT_DTS}. Create it first (see scripts/check-doc-snippets.mjs header).`,
  );
  process.exit(1);
}

if (!existsSync(SHIMS_DTS)) {
  console.error(
    `❌ Missing ${SHIMS_DTS}. Create it first (see scripts/check-doc-snippets.mjs header).`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run tsc
// ---------------------------------------------------------------------------

if (snippetFiles.length === 0) {
  console.log("✅ check-doc-snippets passed (no TS fences found).");
  process.exit(0);
}

// tsc does not allow --project mixed with explicit file paths.
// Instead, write a dynamic tsconfig into the temp dir that:
//   - extends our base snippets tsconfig (for compilerOptions + paths)
//   - includes only the generated snippet files + the ambient context file
const filePaths = snippetFiles.map((s) => s.tempFile);

const dynamicTsconfig = {
  extends: TSCONFIG_SNIPPETS,
  compilerOptions: {
    noEmit: true,
  },
  files: [
    // Ambient context declarations — included in every per-fence compilation
    CONTEXT_DTS,
    // External-package shims (non-module .d.ts for declare module blocks)
    SHIMS_DTS,
    ...filePaths,
  ],
};

const dynamicTsconfigPath = join(TEMP_DIR, "tsconfig.json");
writeFileSync(dynamicTsconfigPath, JSON.stringify(dynamicTsconfig, null, 2), "utf8");

const tscCmd = `npx tsc --noEmit --project ${JSON.stringify(dynamicTsconfigPath)}`;

let tscOutput = "";
let tscFailed = false;

try {
  tscOutput = execSync(tscCmd, { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
} catch (err) {
  tscFailed = true;
  tscOutput = /** @type {any} */ (err).stdout ?? "";
  const stderr = /** @type {any} */ (err).stderr ?? "";
  if (stderr) tscOutput += stderr;
}

// ---------------------------------------------------------------------------
// Parse tsc output and map temp paths back to source docs
// ---------------------------------------------------------------------------

/**
 * Replace temp file paths in tsc output with source doc references.
 * tsc emits paths relative to cwd (ROOT). We resolve them to absolute paths
 * so they match the absolute tempFile paths we recorded, then replace.
 * @param {string} output
 * @returns {string}
 */
function remapOutput(output) {
  // Build lookup: absolute temp path → doc file label with fence start line
  /** @type {Map<string, string>} */
  const lookup = new Map(
    snippetFiles.map(({ tempFile, docFile, fenceStartLine }) => [
      tempFile,
      `${docFile} (fence ~line ${fenceStartLine})`,
    ]),
  );

  // tsc diagnostic lines start with a path (relative or absolute), followed by
  // `(line,col): error TSxxx: ...`. Resolve any relative path against ROOT.
  return output
    .split("\n")
    .map((line) => {
      // Match a path at the start of the line (before the `(line,col)` part).
      const pathMatch = line.match(/^([^\s(]+)\((\d+,\d+)\)/);
      if (!pathMatch) return line;
      const rawPath = pathMatch[1] ?? "";
      const absPath = resolve(ROOT, rawPath);
      if (lookup.has(absPath)) {
        return line.replace(rawPath, lookup.get(absPath) ?? rawPath);
      }
      return line;
    })
    .join("\n");
}

const remapped = remapOutput(tscOutput).trim();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const totalDocs = new Set(snippetFiles.map((s) => s.docFile)).size;
const totalActive = totalFences - totalSkipped;

if (tscFailed) {
  // Count error lines (lines matching "error TS")
  const errorLines = remapped.split("\n").filter((l) => /error TS/.test(l));
  const errorCount = errorLines.length;

  console.error(
    `❌ check-doc-snippets failed (${errorCount} error${errorCount === 1 ? "" : "s"} across ${totalDocs} doc file${totalDocs === 1 ? "" : "s"}, ${totalActive} active fence${totalActive === 1 ? "" : "s"}, ${totalSkipped} skipped):\n`,
  );
  console.error(remapped);
  process.exit(1);
}

console.log(
  `✅ check-doc-snippets passed (${totalDocs} doc file${totalDocs === 1 ? "" : "s"}, ${totalActive} active fence${totalActive === 1 ? "" : "s"}, ${totalSkipped} skipped).`,
);
process.exit(0);
