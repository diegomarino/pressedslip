#!/usr/bin/env node
/**
 * Render a pressedslip composition (JSON or JSONC) to a 1-bit PNG.
 *
 *   node render.mjs slip.json [-o slip.png] [--theme default|compact|mono|./theme.mjs]
 *                   [--paper thermal58|thermal80|thermal110] [--upside-down-answers]
 *                   [--blocks ./my-blocks.mjs] [--print host[:port]]
 *
 * `pressedslip` is resolved from the current working directory. If the cwd
 * has no pressedslip, it is installed once into a private cache
 * (~/.cache/pressedslip-skill, or $PRESSEDSLIP_SKILL_CACHE) and used from
 * there, so a slip can be rendered from any folder. `--blocks` loads a module whose
 * `blocks` (or default) export is an array of BlockDefinition; for .ts/.tsx
 * modules run the script through `npx tsx` instead of `node`. `--theme` also
 * accepts a module path whose `theme` (or default) export is a theme template.
 *
 * Prints a JSON report on stdout and exits 1 when any block failed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const USAGE =
  "usage: render.mjs <slip.json> [-o out.png] [--theme default|compact|mono|module] " +
  "[--paper thermal58|thermal80|thermal110] [--upside-down-answers] [--blocks module] " +
  "[--print host[:port]]";

function fail(message) {
  console.error(`render.mjs: ${message}`);
  process.exit(2);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", short: "o" },
    theme: { type: "string", default: "default" },
    paper: { type: "string", default: "thermal80" },
    blocks: { type: "string", multiple: true, default: [] },
    print: { type: "string" },
    "upside-down-answers": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || positionals.length !== 1) {
  console.error(USAGE);
  process.exit(values.help ? 0 : 2);
}

const CACHE_DIR =
  process.env.PRESSEDSLIP_SKILL_CACHE ??
  join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "pressedslip-skill");

function canResolve(dir, specifier) {
  try {
    createRequire(join(dir, "noop.js")).resolve(specifier);
    return true;
  } catch {
    return false;
  }
}

let installDir;
/** The project's pressedslip if it has one; otherwise the cache, installing into it once. */
function pressedslipDir() {
  if (installDir) return installDir;
  if (canResolve(process.cwd(), "pressedslip")) {
    installDir = process.cwd();
    return installDir;
  }
  if (!canResolve(CACHE_DIR, "pressedslip")) {
    console.error(`render.mjs: pressedslip not found here; installing it once into ${CACHE_DIR}`);
    mkdirSync(CACHE_DIR, { recursive: true });
    if (!existsSync(join(CACHE_DIR, "package.json"))) {
      writeFileSync(join(CACHE_DIR, "package.json"), '{ "private": true }\n');
    }
    const npm = spawnSync(
      "npm",
      ["install", "--no-audit", "--no-fund", "--silent", "pressedslip", "react", "zod"],
      {
        cwd: CACHE_DIR,
        stdio: ["ignore", "ignore", "inherit"],
        shell: process.platform === "win32",
      },
    );
    if (npm.status !== 0 || !canResolve(CACHE_DIR, "pressedslip")) {
      fail(
        "could not install pressedslip. Install it in the project: npm install pressedslip react zod",
      );
    }
  }
  installDir = CACHE_DIR;
  return installDir;
}

/** Import a pressedslip entrypoint ("." or "./transports") from pressedslipDir(). */
async function importPressedslip(subpath = ".") {
  const require = createRequire(join(pressedslipDir(), "noop.js"));
  const entry = require.resolve(
    subpath === "." ? "pressedslip" : `pressedslip/${subpath.slice(2)}`,
  );
  // require.resolve picks the CJS build; walk up to the package root and load the ESM build.
  let root = dirname(entry);
  while (true) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
      if (pkg.name === "pressedslip") {
        const target = pkg.exports?.[subpath]?.import?.default;
        return import(pathToFileURL(join(root, target ?? entry)).href);
      }
    } catch {
      // no package.json at this level
    }
    const parent = dirname(root);
    if (parent === root) return import(pathToFileURL(entry).href);
    root = parent;
  }
}

/** Remove // and /* *\/ comments and trailing commas outside of strings. */
function stripJsonc(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2);
      if (i === -1) break;
      i++;
    } else {
      out += c;
    }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

const inputPath = resolve(positionals[0]);
let input;
try {
  input = JSON.parse(stripJsonc(readFileSync(inputPath, "utf8")));
} catch (error) {
  fail(`cannot read ${positionals[0]}: ${error.message}`);
}
if (!Array.isArray(input.slots) || input.slots.length === 0) {
  fail("the composition needs a non-empty `slots` array");
}

/** Import a --theme/--blocks module; those import pressedslip themselves, from their own folder. */
async function importUserModule(spec) {
  try {
    return await import(pathToFileURL(resolve(spec)).href);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" || error.code === "MODULE_NOT_FOUND") {
      fail(
        `${spec}: ${error.message.split("\n")[0]}\n` +
          "Custom blocks and themes must live in a project with pressedslip, react and zod installed " +
          "(npm install pressedslip react zod).",
      );
    }
    throw error;
  }
}

const ps = await importPressedslip();
const { nodeFontCache } = await importPressedslip("./providers");

let theme = ps.themes[values.theme];
if (!theme && /\.[cm]?[jt]sx?$/.test(values.theme)) {
  const mod = await importUserModule(values.theme);
  theme = mod.theme ?? mod.default;
}
if (!theme) {
  fail(
    `unknown theme "${values.theme}" (use ${Object.keys(ps.themes).join(", ")} or a module path)`,
  );
}
if (values["upside-down-answers"]) {
  // qaPair answers use the `answer` text style; rotate it so riddles make the reader flip the paper.
  const textStyles = theme.shell?.textStyles ?? {};
  theme = {
    ...theme,
    shell: {
      ...theme.shell,
      textStyles: { ...textStyles, answer: { ...textStyles.answer, rotate: 180 } },
    },
  };
}

const width = ps.PAPER[values.paper];
if (!width || !("px" in width)) fail(`unknown paper "${values.paper}"`);

const customBlocks = [];
for (const spec of values.blocks) {
  const mod = await importUserModule(spec);
  const list = mod.blocks ?? mod.default;
  if (!Array.isArray(list)) fail(`${spec} must export \`blocks\` (an array of block definitions)`);
  customBlocks.push(...list);
}
// Custom blocks may replace a builtin of the same type (e.g. a wrapped wordSearch).
const customTypes = new Set(customBlocks.map((b) => b.type));
const registry = ps.createRegistry([
  ...ps.builtinBlocks.filter((b) => !customTypes.has(b.type)),
  ...customBlocks,
]);

const date = input.date ?? new Date().toISOString().slice(0, 10);
const composition = {
  id: input.id ?? `slip-${date}`,
  version: input.version ?? 1,
  ...input,
  status: "ready",
  date,
  slots: input.slots.map((slot, index) => ({ ...slot, index })),
};

const prepared = await ps.loadThemeFonts(theme, { cache: nodeFontCache() });
const rendering = await ps.render(composition, {
  registry,
  theme: prepared,
  width,
  onCanvasOverflow: "ignore",
});

const outPath = resolve(values.out ?? `${inputPath.replace(/\.jsonc?$/i, "")}.png`);
writeFileSync(outPath, rendering.bytes);

const report = {
  out: outPath,
  width: rendering.width,
  height: rendering.height,
  failedBlocks: rendering.failedBlocks.map((f) => ({
    index: f.index,
    blockType: f.blockType,
    reason: f.reason?.message ?? String(f.reason),
  })),
  canvasOverflow: rendering.canvasOverflow,
  pressedslip: installDir === process.cwd() ? "project" : installDir,
  printed: false,
};

if (values.print) {
  const [host, port = "9100"] = values.print.split(":");
  const { createEscPosTransport } = await importPressedslip("./transports");
  await createEscPosTransport({ host, port: Number(port) }).send({ bytes: rendering.bytes });
  report.printed = true;
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.failedBlocks.length > 0 ? 1 : 0);
