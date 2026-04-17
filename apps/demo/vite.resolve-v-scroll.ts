import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Alias, Plugin } from "vite";

type VScrollThemePlugin = (options?: {
  css_source_path?: string;
  generated_module_path?: string;
}) => Plugin;

type ResolveVScrollSetup = (options: {
  config_dir: string;
  command: "serve" | "build";
}) => Promise<{
  alias: Alias[];
  create_theme_plugin: VScrollThemePlugin;
}>;

const LIB_SOURCE_ENTRY = resolve(__dirname, "../../packages/v-scroll/src/index.ts"),
  PUBLIC_PLUGIN_ENTRY = "v-scroll/plugin";

const isModuleNotFoundError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ERR_MODULE_NOT_FOUND";

const getSourcePluginEntry = (config_dir: string) =>
  pathToFileURL(resolve(config_dir, "../../packages/v-scroll/src/plugin.ts")).href;

const getInternalSourcePluginEntry = (config_dir: string) =>
  pathToFileURL(resolve(config_dir, "../../packages/v-scroll/src/plugins/vscroll-theme.ts")).href;

const getPublicRuntimeEntryPath = (config_dir: string) =>
  resolve(config_dir, "../../packages/v-scroll/dist/index.js");

const loadSourceVScrollThemePlugin = async (config_dir: string) =>
  ((await import(getSourcePluginEntry(config_dir)).catch(async (error) => {
    if (!isModuleNotFoundError(error)) {
      throw error;
    }

    return await import(getInternalSourcePluginEntry(config_dir));
  })) as { vScrollThemePlugin: VScrollThemePlugin }).vScrollThemePlugin;

const loadPublicVScrollThemePlugin = async () =>
  ((await import(PUBLIC_PLUGIN_ENTRY)) as { vScrollThemePlugin: VScrollThemePlugin }).vScrollThemePlugin;

const loadVScrollThemePlugin = async ({
  command,
  allow_source_fallback,
  config_dir,
}: {
  command: "serve" | "build";
  allow_source_fallback: boolean;
  config_dir: string;
}) => {
  if (command === "serve") {
    return await loadSourceVScrollThemePlugin(config_dir);
  }

  if (!allow_source_fallback) {
    return await loadPublicVScrollThemePlugin();
  }

  try {
    return await loadPublicVScrollThemePlugin();
  } catch (error) {
    if (!isModuleNotFoundError(error)) {
      throw error;
    }
  }

  return await loadSourceVScrollThemePlugin(config_dir);
};

const hasBuiltRuntimeEntry = async (config_dir: string) => {
  try {
    await access(getPublicRuntimeEntryPath(config_dir));
    return true;
  } catch {
    return false;
  }
};

export const getVScrollAlias = (command: "serve" | "build"): Alias[] =>
  command === "serve" ? [{ find: "v-scroll", replacement: LIB_SOURCE_ENTRY }] : [];

export const resolveVScrollSetup: ResolveVScrollSetup = async ({ config_dir, command }) => {
  const has_built_runtime_entry = await hasBuiltRuntimeEntry(config_dir),
    allow_source_fallback = command === "build" && !has_built_runtime_entry,
    create_theme_plugin = await loadVScrollThemePlugin({
      command,
      allow_source_fallback,
      config_dir,
    }),
    alias_mode = command === "build" && allow_source_fallback ? "serve" : command;

  return {
    alias: getVScrollAlias(alias_mode),
    create_theme_plugin,
  };
};
