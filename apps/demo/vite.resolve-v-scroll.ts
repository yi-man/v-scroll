import type { Alias, Plugin } from "vite";

type VScrollThemePlugin = (options?: {
  css_source_path?: string;
  generated_module_path?: string;
}) => Plugin;

type ResolveVScrollSetup = (options: {
  command: "serve" | "build";
}) => Promise<{
  alias: Alias[];
  create_theme_plugin: VScrollThemePlugin;
}>;

const PUBLIC_PLUGIN_ENTRY = "v-scroll/plugin";

const loadPublicThemePlugin = async () =>
  ((await import(PUBLIC_PLUGIN_ENTRY)) as { vScrollThemePlugin: VScrollThemePlugin }).vScrollThemePlugin;

export const getVScrollAlias = (_command: "serve" | "build"): Alias[] => [];

export const resolveVScrollSetup: ResolveVScrollSetup = async ({ command: _command }) => {
  const create_theme_plugin = await loadPublicThemePlugin();
  return {
    alias: getVScrollAlias("build"),
    create_theme_plugin,
  };
};
