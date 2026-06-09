/**
 * @fileoverview Pure check logic for the documentation policy.
 * No file system or git access. Given a source string and filename, returns
 * an array of policy violations.
 */
import ts from "typescript";

const MIN_PROSE_CHARS = 20;

/**
 * @typedef {{ file: string, line: number, column: number, message: string }} Violation
 */

/**
 * Count non-whitespace characters in a string.
 * @param {string} s
 * @returns {number}
 */
function nonWhitespaceLength(s) {
  return s.replace(/\s+/g, "").length;
}

/**
 * Extract the prose text from a JSDoc comment block, stripping the leading
 * `*` markers and the `@fileoverview` tag if present.
 * @param {string} blockText - the full text including /** ... *\/
 * @returns {{ proseChars: number, hasFileOverview: boolean, fileOverviewProseChars: number }}
 */
function analyseJsdocBlock(blockText) {
  const inner = blockText
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .replace(/^\s*\*\s?/gm, "");
  const hasFileOverview = /@fileoverview\b/.test(inner);
  let fileOverviewProseChars = 0;
  if (hasFileOverview) {
    const match = inner.match(/@fileoverview\s+([\s\S]*?)(?=@\w+|$)/);
    if (match) fileOverviewProseChars = nonWhitespaceLength(match[1]);
  }
  const proseChars = nonWhitespaceLength(inner.replace(/@\w+/g, ""));
  return { proseChars, hasFileOverview, fileOverviewProseChars };
}

/**
 * Find the JSDoc comment ending immediately before `pos` in the source text,
 * if any. Returns the raw block string or null.
 * Blocks that end at or before `fileLevelBlockEnd` are the file-level block
 * and must not be reused as a symbol-level JSDoc.
 * @param {string} text
 * @param {number} pos
 * @param {number} [fileLevelBlockEnd]
 * @returns {string | null}
 */
function precedingJsdoc(text, pos, fileLevelBlockEnd = 0) {
  const before = text.slice(0, pos);
  // Strip trailing whitespace + at most one newline.
  const trimmed = before.replace(/\s*$/, "");
  if (!trimmed.endsWith("*/")) return null;
  const start = trimmed.lastIndexOf("/**");
  if (start === -1) return null;
  // The block ends at trimmed.length (which maps to the end of "*/").
  // If that end position is within the file-level block, don't reuse it.
  if (trimmed.length <= fileLevelBlockEnd) return null;
  return trimmed.slice(start);
}

/**
 * Walk the source file's top-level statements and collect violations.
 * @param {string} sourceText
 * @param {string} filename
 * @returns {Violation[]}
 */
export function checkSource(sourceText, filename) {
  /** @type {Violation[]} */
  const violations = [];
  const sf = ts.createSourceFile(
    filename,
    sourceText,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // File-level rule.
  const firstJsdocMatch = sourceText.match(/^\s*(\/\*\*[\s\S]*?\*\/)/);
  // Track the end position of the file-level block so symbol checks don't reuse it.
  const fileLevelBlockEnd = firstJsdocMatch
    ? (firstJsdocMatch.index ?? 0) + firstJsdocMatch[0].length
    : 0;

  if (!firstJsdocMatch) {
    violations.push({
      file: filename,
      line: 1,
      column: 1,
      message: "Missing @fileoverview at top of file.",
    });
  } else {
    const { hasFileOverview, fileOverviewProseChars } = analyseJsdocBlock(firstJsdocMatch[1]);
    if (!hasFileOverview) {
      violations.push({
        file: filename,
        line: 1,
        column: 1,
        message: "Top-level JSDoc block missing @fileoverview tag.",
      });
    } else if (fileOverviewProseChars < MIN_PROSE_CHARS) {
      violations.push({
        file: filename,
        line: 1,
        column: 1,
        message: `@fileoverview text too short (${fileOverviewProseChars} chars, need ${MIN_PROSE_CHARS}).`,
      });
    }
  }

  // Symbol-level rule.
  for (const stmt of sf.statements) {
    if (!isDirectExport(stmt)) continue;
    if (isReExport(stmt)) continue;

    const name = exportedName(stmt) ?? "<anonymous>";
    const kind = exportedKindLabel(stmt);
    const declStart = stmt.getStart(sf);
    const block = precedingJsdoc(sourceText, declStart, fileLevelBlockEnd);
    const { line, character } = sf.getLineAndCharacterOfPosition(declStart);

    if (!block) {
      violations.push({
        file: filename,
        line: line + 1,
        column: character + 1,
        message: `Exported ${kind} \`${name}\` missing JSDoc block.`,
      });
      continue;
    }
    const { proseChars } = analyseJsdocBlock(block);
    if (proseChars < MIN_PROSE_CHARS) {
      violations.push({
        file: filename,
        line: line + 1,
        column: character + 1,
        message: `Exported ${kind} \`${name}\` JSDoc too short (${proseChars} chars, need ${MIN_PROSE_CHARS}).`,
      });
    }
  }

  return violations;
}

/** @param {ts.Statement} node */
function isDirectExport(node) {
  if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return true;
  return ts.isExportAssignment(node);
}

/** @param {ts.Statement} node */
function isReExport(node) {
  return ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined;
}

/** @param {ts.Statement} node */
function exportedName(node) {
  if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
    return node.name?.text;
  }
  if (ts.isVariableStatement(node)) {
    const first = node.declarationList.declarations[0];
    return first && ts.isIdentifier(first.name) ? first.name.text : undefined;
  }
  if (
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name.text;
  }
  return undefined;
}

/** @param {ts.Statement} node */
function exportedKindLabel(node) {
  if (ts.isFunctionDeclaration(node)) return "function";
  if (ts.isClassDeclaration(node)) return "class";
  if (ts.isVariableStatement(node)) return "const";
  if (ts.isTypeAliasDeclaration(node)) return "type";
  if (ts.isInterfaceDeclaration(node)) return "interface";
  if (ts.isEnumDeclaration(node)) return "enum";
  return "declaration";
}
