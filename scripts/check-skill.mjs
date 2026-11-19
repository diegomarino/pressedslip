#!/usr/bin/env node
/**
 * Check the agent skill in skills/pressedslip/:
 *  1. word-search.mjs builds valid, deterministic grids that really hide every listed word.
 *  2. Every example composition renders through render.mjs with no failed blocks or overflow.
 *  3. Every pattern renders. Patterns that call third-party APIs (live-data, emoji-checklist)
 *     only run with --network.
 *
 * Needs a fresh `pnpm build` (render.mjs loads pressedslip from dist/) and network access
 * to Google Fonts. Usage: node scripts/check-skill.mjs [--network]
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const SKILL = join(import.meta.dirname, "..", "skills", "pressedslip");
const RENDER = join(SKILL, "scripts", "render.mjs");
const PATTERNS = join(SKILL, "references", "patterns");
const NETWORK = process.argv.includes("--network");
const TSX = join(import.meta.dirname, "..", "node_modules", ".bin", "tsx");
const OUT = mkdtempSync(join(tmpdir(), "pressedslip-skill-"));
const DATE = "2026-11-19";

let failures = 0;
let renders = 0;
function check(ok, label, detail = "") {
  if (!ok) failures++;
  process.stderr.write(
    `${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : `\n     ${detail}`}\n`,
  );
}

// 1. Word search
const ws = await import(pathToFileURL(join(SKILL, "scripts", "word-search.mjs")).href);
const WORDS = [
  "gato",
  "perro",
  "búho",
  "araña",
  "tortuga",
  "león",
  "zorro",
  "ciervo",
  "pingüino",
  "x",
];
const DIRS = {
  N: [-1, 0],
  S: [1, 0],
  E: [0, 1],
  W: [0, -1],
  NE: [-1, 1],
  NW: [-1, -1],
  SE: [1, 1],
  SW: [1, -1],
};

/** True when `word` reads along an allowed direction (or its reverse, if allowed) from some cell. */
function hidden(grid, word, profile) {
  const size = grid.length;
  const vectors = profile.directions.flatMap((d) => {
    const [r, c] = DIRS[d];
    return profile.backwards > 0
      ? [
          [r, c],
          [-r, -c],
        ]
      : [[r, c]];
  });
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of vectors) {
        if ([...word].every((ch, i) => grid[r + dr * i]?.[c + dc * i] === ch)) return true;
      }
    }
  }
  return false;
}

for (const difficulty of Object.keys(ws.PROFILES)) {
  const profile = ws.PROFILES[difficulty];
  const a = ws.buildWordSearch(WORDS, { difficulty, seed: DATE });
  const b = ws.buildWordSearch(WORDS, { difficulty, seed: DATE });
  const c = ws.buildWordSearch(WORDS, { difficulty, seed: "2026-11-20" });
  check(JSON.stringify(a) === JSON.stringify(b), `word-search ${difficulty}: deterministic`);
  check(
    JSON.stringify(a.grid) !== JSON.stringify(c.grid),
    `word-search ${difficulty}: seed changes grid`,
  );
  check(
    a.grid.length === profile.size &&
      a.grid.every((row) => row.length === profile.size && row.every((ch) => ch.length === 1)),
    `word-search ${difficulty}: ${profile.size}×${profile.size} single-letter grid`,
  );
  const missing = a.words.filter((w) => !hidden(a.grid, w, profile));
  check(
    missing.length === 0,
    `word-search ${difficulty}: every listed word is in the grid`,
    missing.join(", "),
  );
  check(
    a.words.includes("ARAÑA") && a.words.includes("BUHO"),
    `word-search ${difficulty}: normalises accents, keeps Ñ`,
  );
  check(a.skipped.includes("X"), `word-search ${difficulty}: reports words that can't be used`);
}

{
  const file = join(OUT, "into.json");
  writeFileSync(file, JSON.stringify({ slots: [{ blockType: "textCell", data: { text: "hi" } }] }));
  const run = (words) =>
    spawnSync(process.execPath, [
      join(SKILL, "scripts", "word-search.mjs"),
      "--words",
      words,
      "--into",
      file,
    ]);
  run("cat,dog,owl");
  run("sun,moon,star");
  const { slots } = JSON.parse(readFileSync(file, "utf8"));
  check(
    slots.length === 2 && slots[1].data.words.includes("MOON"),
    "word-search --into replaces the existing slot",
  );

  const jsonc = join(OUT, "into.jsonc");
  writeFileSync(
    jsonc,
    '{\n  // comment\n  "slots": [{ "blockType": "textCell", "data": { "text": "a // b" } },],\n}\n',
  );
  const res = spawnSync(process.execPath, [
    join(SKILL, "scripts", "word-search.mjs"),
    "--words",
    "cat,dog,owl",
    "--into",
    jsonc,
  ]);
  const after = res.status === 0 ? JSON.parse(readFileSync(jsonc, "utf8")) : null;
  check(
    after?.slots.length === 2 && after.slots[0].data.text === "a // b",
    "word-search --into accepts JSONC",
    res.stderr?.toString(),
  );
}

// 2 + 3. Rendering
function render(input, extraArgs = [], runner = "node") {
  const cmd = runner === "tsx" ? TSX : process.execPath;
  const res = spawnSync(
    cmd,
    [RENDER, input, "-o", join(OUT, `${++renders}-${basename(input, ".json")}.png`), ...extraArgs],
    {
      encoding: "utf8",
    },
  );
  try {
    return { status: res.status, report: JSON.parse(res.stdout), stderr: res.stderr };
  } catch {
    return {
      status: res.status,
      report: null,
      stderr: res.stderr || res.stdout || String(res.error),
    };
  }
}

function checkRender(label, result) {
  const { status, report, stderr } = result;
  const ok = status === 0 && report?.failedBlocks.length === 0 && report.canvasOverflow === null;
  check(
    ok,
    `render ${label}`,
    report ? JSON.stringify(report.failedBlocks ?? report.canvasOverflow) : stderr.trim(),
  );
}

function writeComposition(name, slots, meta) {
  const file = join(OUT, `${name}.json`);
  writeFileSync(file, JSON.stringify({ date: DATE, ...(meta && { meta }), slots }));
  return file;
}

for (const file of readdirSync(join(SKILL, "examples")).filter((f) => f.endsWith(".json"))) {
  checkRender(`examples/${file}`, render(join(SKILL, "examples", file)));
}

checkRender(
  "examples/puzzle-time.json with --upside-down-answers",
  render(join(SKILL, "examples", "puzzle-time.json"), ["--upside-down-answers"]),
);

{
  // Nothing listens on this port: the check passes only if render.mjs never connects.
  const broken = writeComposition("broken", [{ blockType: "noSuchBlock", data: {} }]);
  const { status, report, stderr } = render(broken, ["--print", "127.0.0.1:9"]);
  check(
    status === 1 && report?.printed === false && /not printing/.test(stderr),
    "render --print refuses a slip with failed blocks",
    stderr.trim(),
  );
}

if (NETWORK) {
  // Outside any project, render.mjs installs pressedslip into its own cache.
  const empty = mkdtempSync(join(tmpdir(), "pressedslip-noproject-"));
  const res = spawnSync(
    process.execPath,
    [RENDER, join(SKILL, "examples", "shopping-list.json"), "-o", join(empty, "out.png")],
    {
      cwd: empty,
      encoding: "utf8",
      env: { ...process.env, PRESSEDSLIP_SKILL_CACHE: join(empty, "cache") },
    },
  );
  const report = res.status === 0 ? JSON.parse(res.stdout) : null;
  check(
    report?.pressedslip === join(empty, "cache") &&
      readdirSync(empty).sort().join() === "cache,out.png",
    "render outside a project installs into the cache only",
    res.stderr.trim(),
  );
}

checkRender(
  "examples/puzzle-time.json with upside-down-theme.mjs",
  render(join(SKILL, "examples", "puzzle-time.json"), [
    "--theme",
    join(PATTERNS, "upside-down-theme.mjs"),
  ]),
);

for (const name of ["seeded-pick", "dates-and-calendar", ...(NETWORK ? ["live-data"] : [])]) {
  const mod = await import(pathToFileURL(join(PATTERNS, `${name}.mjs`)).href);
  const slots = await mod.slots(DATE);
  check(slots.length > 0, `pattern ${name}: produces slots`);
  checkRender(`pattern ${name}`, render(writeComposition(name, slots)));
}

for (const name of ["riddle-block", "streak-block", ...(NETWORK ? ["emoji-checklist"] : [])]) {
  const file = join(PATTERNS, `${name}.tsx`);
  // Collect the example slots in a tsx child so this script stays plain Node.
  const res = spawnSync(
    TSX,
    [
      "-e",
      `(async () => {
         const m = await import(${JSON.stringify(pathToFileURL(file).href)});
         const s = typeof m.exampleSlots === "function" ? await m.exampleSlots() : m.exampleSlots;
         process.stdout.write(JSON.stringify(s));
       })();`,
    ],
    { encoding: "utf8" },
  );
  if (res.status !== 0) {
    check(false, `pattern ${name}: load`, (res.stderr || String(res.error)).trim());
    continue;
  }
  const input = writeComposition(name, JSON.parse(res.stdout), { language: "es" });
  checkRender(`pattern ${name}`, render(input, ["--blocks", file], "tsx"));
}

process.stderr.write(`\nPNGs in ${OUT}\n`);
if (!NETWORK) process.stderr.write("Skipped live-data and emoji-checklist (pass --network).\n");
process.exit(failures > 0 ? 1 : 0);
