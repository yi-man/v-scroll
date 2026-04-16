import { ensureThemeCss } from "./runtime/inject-theme-css";

export { createVScroll, registerVScroll } from "./virtual-scroll";
export type { VScrollConfig, VScrollState } from "./virtual-scroll";
export * from "./virtual-scroll/math";

const THEME_MODULE_SPECIFIER = "$/v-scroll.js";
let theme_css_task: Promise<string> | null = null;

const loadThemeCss = async () => {
  if (!theme_css_task) {
    theme_css_task = import(
      /* @vite-ignore */
      THEME_MODULE_SPECIFIER
    ).then((mod) => mod.default as string);
  }

  return await theme_css_task;
};

export const ensureVScrollTheme = async () => ensureThemeCss(await loadThemeCss());
