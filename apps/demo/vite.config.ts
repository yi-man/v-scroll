import { defineConfig } from "vite";
import { getVScrollAlias } from "./vite.resolve-v-scroll";

export default defineConfig(({ command }) => ({
  resolve: {
    alias: getVScrollAlias(command === "serve" ? "serve" : "build"),
  },
}));
