import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "/pressedslip/",
  plugins: [react()],
  resolve: {
    // satori's `harfbuzzjs` loads hb.wasm from a page-relative path Vite never
    // emits; swap in a shim that points it at a bundled asset. Skipped under
    // vitest (mode "test"), where Node loads hb.wasm from disk on its own.
    alias:
      mode === "test"
        ? []
        : [
            {
              find: /^harfbuzzjs$/,
              replacement: fileURLToPath(new URL("./src/harfbuzzjs-browser.ts", import.meta.url)),
            },
          ],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env": "{}",
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
}));
