import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { resolveVScrollSetup } from "./vite.resolve-v-scroll";

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command }) => {
  const mode = command === "serve" ? "serve" : "build",
    { alias, create_theme_plugin } = await resolveVScrollSetup({
      command: mode,
    });

  return {
    root: CONFIG_DIR,
    plugins: [
      create_theme_plugin({
        css_source_path: "src/theme/night/v-scroll.css",
        generated_module_path: "public/themes/night/v-scroll.js",
      }),
    ],
    resolve: {
      alias,
    },
  };
});
