/**
 * @fileoverview Vitest configuration with coverage thresholds.
 * Coverage policy defined in ADR-0016.
 */

import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // B1 — self-reference for the public-surface snapshot test.
    // The snapshot test imports from "pressedslip" (root) and "pressedslip/<subpath>"
    // so it exercises the same module specifiers adopters will use. Without this
    // alias, vitest resolves through node_modules and the test cannot see uncommitted
    // source. Aliases mirror package.json#exports.
    alias: {
      "pressedslip/testing": resolve(__dirname, "src/testing/index.ts"),
      "pressedslip/providers": resolve(__dirname, "src/providers/index.ts"),
      "pressedslip/browser": resolve(__dirname, "src/browser/index.ts"),
      "pressedslip/transports": resolve(__dirname, "src/transports/index.ts"),
      pressedslip: resolve(__dirname, "src/index.ts"),
    },
  },
  test: {
    // Exclude the playground's Playwright spec — root vitest would otherwise
    // scan it and fail (Playwright's `test()` API is not vitest's). The
    // playground runs its own vitest via `pnpm --filter ... test` (which
    // narrows discovery to `src/` only) plus Playwright via the verify gate.
    exclude: ["**/node_modules/**", "**/dist/**", "apps/playground/tests/**"],
    typecheck: {
      enabled: true,
      include: ["**/*.test-d.ts"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/types.ts", "src/index.ts"],
      thresholds: {
        lines: 85,
        branches: 75,
        functions: 85,
        statements: 85,
      },
    },
  },
});
