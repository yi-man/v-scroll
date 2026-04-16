import { ensureThemeCss } from "./runtime/inject-theme-css";
import default_theme_css from "../themes/default/v-scroll.js";

export { createVScroll, registerVScroll } from "./virtual-scroll";
export type { VScrollConfig, VScrollState } from "./virtual-scroll";
export * from "./virtual-scroll/math";

const THEME_MODULE_SPECIFIER = "$/v-scroll.js";

const importThemeCss = async (specifier: string) =>
  (await import(
    /* @vite-ignore */
    specifier
  ))?.default as string;

const loadThemeCss = async () => await importThemeCss(THEME_MODULE_SPECIFIER).catch(async () => default_theme_css);

export const ensureVScrollTheme = async () => ensureThemeCss(await loadThemeCss());
