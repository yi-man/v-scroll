import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { transform } from "lightningcss";
import type { Plugin } from "vite";

const CSS_SOURCE_PATH = "themes/default/v-scroll.css",
  GENERATED_MODULE_PATH = "src/theme-imports/v-scroll.js";

const toThemeModule = (css_text: string) => `export default ${JSON.stringify(css_text)};\n`;

export const vScrollThemePlugin = (): Plugin => ({
  name: "v-scroll-theme-plugin",
  async configResolved(config) {
    const source_path = join(config.root, CSS_SOURCE_PATH),
      output_path = join(config.root, GENERATED_MODULE_PATH);

    let source_css: string;
    try {
      source_css = await readFile(source_path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      throw error;
    }

    const result = transform({
        filename: source_path,
        code: Buffer.from(source_css),
        minify: true,
      }),
      module_code = toThemeModule(result.code.toString());

    await mkdir(dirname(output_path), { recursive: true });
    await writeFile(output_path, module_code, "utf8");
  },
});
