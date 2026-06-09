import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/pressedslip/",
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env": "{}",
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
