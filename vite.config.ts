import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./scripts/vite-plugin-vscroll-theme";

export default defineConfig({
  plugins: [vScrollThemePlugin()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
