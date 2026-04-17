import { ensureThemeCss } from "./runtime/inject-theme-css";
import default_theme_css from "./theme/default/v-scroll.js";
import {
  createVScroll,
  registerVScroll as registerVScrollElement,
  type VScrollConfig,
  type VScrollState,
} from "./virtual-scroll";

export { createVScroll };
export type { VScrollConfig, VScrollState };

const THEME_MODULE_SPECIFIER = "$/v-scroll.js";

const importThemeCss = async (specifier: string) =>
  (await import(
    /* @vite-ignore */
    specifier
  ))?.default as string;

const loadThemeCss = async () => await importThemeCss(THEME_MODULE_SPECIFIER).catch(async () => default_theme_css);

export const ensureVScrollTheme = async () => ensureThemeCss(await loadThemeCss());
export const registerVScroll = async () => {
  registerVScrollElement();
  await ensureVScrollTheme();
};
