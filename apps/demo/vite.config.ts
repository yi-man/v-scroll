import { defineConfig } from "vite";
import { vScrollThemePlugin } from "../../packages/v-scroll/scripts/vite-plugin-vscroll-theme";
import { getVScrollAlias } from "./vite.resolve-v-scroll";

export default defineConfig(({ command }) => ({
  plugins: [
    vScrollThemePlugin({
      css_source_path: "themes/night/v-scroll.css",
      generated_module_path: "public/themes/night/v-scroll.js",
    }),
  ],
  resolve: {
    alias: getVScrollAlias(command === "serve" ? "serve" : "build"),
  },
}));
