import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { getVScrollAlias } from "./vite.resolve-v-scroll";

type VScrollThemePlugin = (options?: {
  css_source_path?: string;
  generated_module_path?: string;
}) => Plugin;

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url)),
  SOURCE_PLUGIN_ENTRY = pathToFileURL(resolve(CONFIG_DIR, "../../packages/v-scroll/src/plugin.ts")).href,
  INTERNAL_SOURCE_PLUGIN_ENTRY = pathToFileURL(resolve(CONFIG_DIR, "../../packages/v-scroll/src/plugins/vscroll-theme.ts"))
    .href,
  PUBLIC_PLUGIN_ENTRY = "v-scroll/plugin",
  PUBLIC_RUNTIME_ENTRY_PATH = resolve(CONFIG_DIR, "../../packages/v-scroll/dist/index.js");

const isModuleNotFoundError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ERR_MODULE_NOT_FOUND";

const loadSourceVScrollThemePlugin = async () =>
  ((await import(SOURCE_PLUGIN_ENTRY).catch(async (error) => {
    if (!isModuleNotFoundError(error)) {
      throw error;
    }

    return await import(INTERNAL_SOURCE_PLUGIN_ENTRY);
  })) as { vScrollThemePlugin: VScrollThemePlugin }).vScrollThemePlugin;

const loadVScrollThemePlugin = async ({
  command,
  allow_source_fallback,
}: {
  command: "serve" | "build";
  allow_source_fallback: boolean;
}) => {
  if (command === "serve") {
    return await loadSourceVScrollThemePlugin();
  }

  if (!allow_source_fallback) {
    return ((await import(PUBLIC_PLUGIN_ENTRY)) as { vScrollThemePlugin: VScrollThemePlugin }).vScrollThemePlugin;
  }

  try {
    return ((await import(PUBLIC_PLUGIN_ENTRY)) as { vScrollThemePlugin: VScrollThemePlugin }).vScrollThemePlugin;
  } catch (error) {
    if (!isModuleNotFoundError(error)) {
      throw error;
    }
  }

  return await loadSourceVScrollThemePlugin();
};

const hasBuiltRuntimeEntry = async () => {
  try {
    await access(PUBLIC_RUNTIME_ENTRY_PATH);
    return true;
  } catch {
    return false;
  }
};

export default defineConfig(async ({ command }) => {
  const mode = command === "serve" ? "serve" : "build",
    has_built_runtime_entry = await hasBuiltRuntimeEntry(),
    allow_source_fallback = mode === "build" && !has_built_runtime_entry,
    vScrollThemePlugin = await loadVScrollThemePlugin({ command: mode, allow_source_fallback }),
    alias_mode = mode === "build" && allow_source_fallback ? "serve" : mode;

  return {
    root: CONFIG_DIR,
    plugins: [
      vScrollThemePlugin({
        css_source_path: "src/theme/night/v-scroll.css",
        generated_module_path: "public/themes/night/v-scroll.js",
      }),
    ],
    resolve: {
      alias: getVScrollAlias(alias_mode),
    },
  };
});
