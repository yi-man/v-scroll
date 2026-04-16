import { resolve } from "node:path";
import { defineConfig } from "vite";

const LIB_ENTRY_PATH = resolve(__dirname, "src/index.ts");

export default defineConfig({
  build: {
    lib: {
      entry: LIB_ENTRY_PATH,
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist",
  },
});
