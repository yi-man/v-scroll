import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./scripts/vite-plugin-vscroll-theme";

export default defineConfig({
  resolve: {
    alias: {
      "$/": fileURLToPath(new URL("./src/theme-imports/", import.meta.url)),
    },
  },
  plugins: [vScrollThemePlugin()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
