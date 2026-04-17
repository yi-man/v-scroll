import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^\$\/(.*)$/, replacement: `${resolve(__dirname, "src/theme/default")}/$1` }],
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
