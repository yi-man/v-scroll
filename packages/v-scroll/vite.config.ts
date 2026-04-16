import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./scripts/vite-plugin-vscroll-theme";

export default defineConfig({
  plugins: [vScrollThemePlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist",
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
