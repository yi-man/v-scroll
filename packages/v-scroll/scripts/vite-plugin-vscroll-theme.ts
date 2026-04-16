import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { transform } from "lightningcss";
import type { Plugin } from "vite";

const CSS_SOURCE_PATH_DEFAULT = "themes/default/v-scroll.css",
  GENERATED_MODULE_PATH_DEFAULT = "themes/default/v-scroll.js",
  PUBLIC_DIR_PREFIX = "public/",
  THEME_MODULE_FILENAME = "v-scroll.js",
  THEME_MODULE_SPECIFIER = "$/v-scroll.js";

type VScrollThemePluginOptions = {
  css_source_path?: string;
  generated_module_path?: string;
};

const toThemeModule = (css_text: string) => `export default ${JSON.stringify(css_text)};\n`;

const getBuiltModuleRelativePath = (generated_module_path: string) =>
  generated_module_path.startsWith(PUBLIC_DIR_PREFIX)
    ? generated_module_path.slice(PUBLIC_DIR_PREFIX.length)
    : generated_module_path;

const getPublicModulePath = (generated_module_path: string) => {
  if (!generated_module_path.startsWith(PUBLIC_DIR_PREFIX)) {
    return "";
  }

  return `/${generated_module_path.slice(PUBLIC_DIR_PREFIX.length)}`;
};

const validateGeneratedModulePath = (generated_module_path: string) => {
  if (basename(generated_module_path) !== THEME_MODULE_FILENAME) {
    throw new Error(`generated_module_path filename must be ${THEME_MODULE_FILENAME}`);
  }
};

export const vScrollThemePlugin = ({
  css_source_path = CSS_SOURCE_PATH_DEFAULT,
  generated_module_path: generated_module_relative_path = GENERATED_MODULE_PATH_DEFAULT,
}: VScrollThemePluginOptions = {}): Plugin => {
  let root_dir = "",
    out_dir = "",
    source_path = "",
    generated_module_path = "",
    built_module_path = "",
    public_module_path = "";

  const removeGeneratedOutputs = async () => {
    const output_paths = [...new Set([generated_module_path, built_module_path].filter(Boolean))];
    await Promise.all(output_paths.map((path) => rm(path, { force: true })));
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
      out_dir = resolve(root_dir, config.build?.outDir ?? "dist");
      validateGeneratedModulePath(generated_module_relative_path);
      source_path = join(root_dir, css_source_path);
      generated_module_path = join(root_dir, generated_module_relative_path);
      built_module_path = join(out_dir, getBuiltModuleRelativePath(generated_module_relative_path));
      public_module_path = getPublicModulePath(generated_module_relative_path);

      await generateThemeModule();
    },
    async writeBundle() {
      const module_code = await generateThemeModule();
      await writeGeneratedModule(built_module_path, module_code);
    },
    transformIndexHtml(html) {
      if (!public_module_path) {
        return;
      }

      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              type: "importmap",
            },
            children: JSON.stringify({
              imports: {
                [THEME_MODULE_SPECIFIER]: public_module_path,
              },
            }),
            injectTo: "head-prepend",
          },
        ],
      };
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
