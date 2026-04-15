import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { transform } from "lightningcss";
import type { Plugin } from "vite";

const CSS_SOURCE_PATH = "themes/default/v-scroll.css",
  GENERATED_MODULE_PATH = "src/theme-imports/v-scroll.js",
  IMPORTMAP_SPECIFIER = "$/v-scroll.js",
  VIRTUAL_MODULE_ID = "\0v-scroll-theme";

const toThemeModule = (css_text: string) => `export default ${JSON.stringify(css_text)};\n`;

export const vScrollThemePlugin = (): Plugin => {
  let root_dir = "",
    out_dir = "",
    source_path = "",
    generated_module_path = "",
    built_module_path = "",
    command = "build";

  const removeGeneratedOutputs = async () => {
    await Promise.all([generated_module_path, built_module_path].filter(Boolean).map((path) => rm(path, { force: true })));
  };

  const writeGeneratedModule = async (output_path: string, module_code: string) => {
    await mkdir(dirname(output_path), { recursive: true });
    await writeFile(output_path, module_code, "utf8");
  };

  const generateThemeModule = async () => {
    let source_css: string;
    try {
      source_css = await readFile(source_path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await removeGeneratedOutputs();
      }

      throw error;
    }

    try {
      const result = transform({
          filename: source_path,
          code: Buffer.from(source_css),
          minify: true,
        }),
        module_code = toThemeModule(result.code.toString());

      await writeGeneratedModule(generated_module_path, module_code);
      return module_code;
    } catch (error) {
      await removeGeneratedOutputs();
      throw error;
    }
  };

  return {
    name: "v-scroll-theme-plugin",
    async configResolved(config) {
      root_dir = config.root;
      out_dir = resolve(config.root, config.build?.outDir ?? "dist");
      source_path = join(root_dir, CSS_SOURCE_PATH);
      generated_module_path = join(root_dir, GENERATED_MODULE_PATH);
      built_module_path = join(out_dir, GENERATED_MODULE_PATH);
      command = config.command;

      await generateThemeModule();
    },
    resolveId(source) {
      if (source === IMPORTMAP_SPECIFIER) {
        if (command === "serve") {
          return VIRTUAL_MODULE_ID;
        }

        return {
          id: source,
          external: true,
        };
      }
    },
    async load(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return `export { default } from "/${GENERATED_MODULE_PATH}";\n`;
      }
    },
    async writeBundle() {
      const module_code = await generateThemeModule();
      await writeGeneratedModule(built_module_path, module_code);
    },
    configureServer(server) {
      server.watcher.add(source_path);
      const regenerateAndReload = async (changed_path: string) => {
        if (changed_path !== source_path) {
          return;
        }

        try {
          await generateThemeModule();
        } finally {
          server.ws.send({ type: "full-reload" });
        }
      };

      server.watcher.on("change", regenerateAndReload);
      server.watcher.on("add", regenerateAndReload);
      server.watcher.on("unlink", async (changed_path) => {
        if (changed_path !== source_path) {
          return;
        }

        await removeGeneratedOutputs();
        server.ws.send({ type: "full-reload" });
      });
    },
  };
};
