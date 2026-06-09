import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CHECKER = join(process.cwd(), "scripts/check-public-docs.mjs");

describe("check-public-docs", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pressedslip-public-docs-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function runChecker(cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      execFile("node", [CHECKER], { cwd }, (err, stdout, stderr) => {
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

  it("fails on stale public API snippets and removed diagram links", async () => {
    await mkdir(join(dir, "docs/guide"), { recursive: true });
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(
      join(dir, "README.md"),
      [
        'const font = await loadFontFromUrl({ family: "Inter", url: "https://x" });',
        "const { png } = await render(composition, { paper: PAPER.thermal80 });",
        "![old](docs/architecture/diagrams/render-pipeline.svg)",
        '{ "type": "textCell", "data": { "text": "old" } }',
      ].join("\n"),
    );
    await writeFile(join(dir, "docs/guide/example.md"), "ph-project-name is v0.0.0\n");
    await writeFile(
      join(dir, "src/example.ts"),
      "const slot = { block: { type, data } };\ncompose({ slots: [...] });\n",
    );

    const result = await runChecker(dir);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("old loadFontFromUrl object signature");
    expect(result.stderr).toContain("old render png destructuring");
    expect(result.stderr).toContain("old render paper option");
    expect(result.stderr).toContain("old docs diagram asset link");
    expect(result.stderr).toContain("stale project placeholder");
    expect(result.stderr).toContain("stale release version");
    expect(result.stderr).toContain("old nested slot shape");
    expect(result.stderr).toContain("old slot type key");
    expect(result.stderr).toContain("old compose slots option");
  });

  it("ignores historical ADRs and specs", async () => {
    await mkdir(join(dir, "docs/adrs"), { recursive: true });
    await mkdir(join(dir, "docs/specs"), { recursive: true });
    await writeFile(join(dir, "README.md"), "# pressedslip\n");
    await writeFile(join(dir, "docs/adrs/0001-old.md"), "ph-project-name and docs:d2\n");
    await writeFile(join(dir, "docs/specs/old.md"), 'loadFontFromUrl({ url: "x" })\n');

    const result = await runChecker(dir);

    expect(result.code).toBe(0);
  });
});
