import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./src/plugin";

const EXTERNAL_DEPENDENCIES = [/^node:/, "vite", "lightningcss"];

export default defineConfig({
  plugins: [vScrollThemePlugin()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        plugin: resolve(__dirname, "src/plugin.ts"),
      },
      formats: ["es"],
      fileName: (_format, entry_name) => `${entry_name}.js`,
    },
    outDir: "dist",
    rollupOptions: {
      external: EXTERNAL_DEPENDENCIES,
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
