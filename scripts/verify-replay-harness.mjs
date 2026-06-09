#!/usr/bin/env node
/**
 * @fileoverview CI wrapper for the blocking replay harness (Decision #9
 * obligation #4). Runs the harness tests via vitest; exits with the test
 * runner's exit code. Failure blocks merge.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["test", "--", "tests/harness/replay.test.ts"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
