import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/testing/index.ts",
    "src/providers/index.ts",
    "src/browser/index.ts",
    "src/transports/index.ts",
  ],
  format: ["esm", "cjs"],
  dts: { tsconfig: "./tsconfig.build.json" },
  sourcemap: true,
  clean: true,
  treeshake: true,
});
