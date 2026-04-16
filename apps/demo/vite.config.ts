import { resolve } from "node:path";
import { defineConfig } from "vite";

const V_SCROLL_DIST_ENTRY = resolve(
  __dirname,
  "../../packages/v-scroll/dist/index.js",
);

export default defineConfig({
  resolve: {
    alias: [{ find: "v-scroll", replacement: V_SCROLL_DIST_ENTRY }],
  },
  build: {
    outDir: "dist",
  },
});
