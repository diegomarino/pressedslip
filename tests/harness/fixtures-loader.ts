/**
 * @fileoverview Glob-load + JSON-parse all replay fixtures.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReplayFixture } from "../../src/_internal/adapters/types.js";

const FIXTURES_DIR = fileURLToPath(new URL("../fixtures/replay", import.meta.url));

export async function loadFixtures(): Promise<readonly ReplayFixture[]> {
  const entries = (await readdir(FIXTURES_DIR))
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort();
  const fixtures = await Promise.all(
    entries.map(
      async (f) => JSON.parse(await readFile(join(FIXTURES_DIR, f), "utf8")) as ReplayFixture,
    ),
  );
  return fixtures;
}
