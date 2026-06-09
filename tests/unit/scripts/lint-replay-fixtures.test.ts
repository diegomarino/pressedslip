import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const LINTER = join(process.cwd(), "scripts/lint-replay-fixtures.mjs");

describe("lint-replay-fixtures", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ph-lint-fixt-"));
    await mkdir(join(dir, "replay"), { recursive: true });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function runLinter(
    fixtureDir: string,
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      execFile("node", [LINTER, "--dir", fixtureDir], (err, stdout, stderr) => {
        resolve({
          code: err
            ? (((err as NodeJS.ErrnoException & { code?: number | string })
                .code as unknown as number) ?? 1)
            : 0,
          stdout: String(stdout),
          stderr: String(stderr),
        });
      });
    });
  }

  function validFixture(): unknown {
    return {
      name: "ok",
      sourceMeta: {
        sampledFrom: "x",
        sampledOn: "2026-05-21",
        sanitization: "none",
        verifiedAgainst: "reference-code",
      },
      input: {
        version: 1,
        date: "2024-01-01",
        member: { id: "m1", name: "Sample Name 1" },
        blocks: [],
      },
      expected: {
        slotCount: 0,
        slotBlockTypes: [],
        failedBlockTypes: [],
        briefingStatus: "ready",
        contentChecks: [{ slotIndex: 0, path: "title", contains: "x" }],
      },
      notes: "test",
    };
  }

  it("passes for a valid fixture with contentChecks", async () => {
    await writeFile(join(dir, "replay", "00-ok.json"), JSON.stringify(validFixture()));
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).toBe(0);
  });

  it("fails when sourceMeta has an unknown field", async () => {
    const f = validFixture() as { sourceMeta: Record<string, unknown> };
    f.sourceMeta.EXTRA = "bad";
    await writeFile(join(dir, "replay", "00-bad.json"), JSON.stringify(f));
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/EXTRA/);
  });

  it("warns (exit 0 with stderr message) when contentChecks is empty/omitted", async () => {
    const f = validFixture() as { expected: { contentChecks?: unknown } };
    delete f.expected.contentChecks;
    await writeFile(join(dir, "replay", "00-x.json"), JSON.stringify(f));
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).toBe(0);
    expect(r.stderr).toMatch(/contentChecks/i);
  });

  it("fails when contentChecks.path uses invalid syntax", async () => {
    const f = validFixture() as { expected: { contentChecks: { path: string }[] } };
    f.expected.contentChecks = [{ slotIndex: 0, path: "data..foo", contains: "z" }] as never;
    await writeFile(join(dir, "replay", "00-bad.json"), JSON.stringify(f));
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/path/i);
  });

  it("fails when input.sourceMeta contains a field outside the (empty) allowlist", async () => {
    const f = validFixture() as { input: { sourceMeta?: unknown } };
    f.input.sourceMeta = { UNKNOWN_FIELD: 1 };
    await writeFile(join(dir, "replay", "00-bad.json"), JSON.stringify(f));
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/UNKNOWN_FIELD/);
  });

  it("fails when briefingStatus is not a known BriefingStatus value", async () => {
    const f = validFixture() as { expected: { briefingStatus: string } };
    f.expected.briefingStatus = "bogus";
    await writeFile(join(dir, "replay", "00-bad.json"), JSON.stringify(f));
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/briefingStatus|bogus/i);
  });

  it("fails on malformed JSON", async () => {
    await writeFile(join(dir, "replay", "00-bad.json"), "{not json");
    const r = await runLinter(join(dir, "replay"));
    expect(r.code).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/parse|JSON/i);
  });
});
