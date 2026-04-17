import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { vScrollThemePlugin } from "v-scroll/plugin";

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    root: CONFIG_DIR,
    plugins: [
      vScrollThemePlugin({
        css_source_path: "src/theme/night/v-scroll.css",
        generated_module_path: "public/themes/night/v-scroll.js",
      }),
    ],
    resolve: {
      alias: [],
    },
  };
});
