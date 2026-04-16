import css_text from "./theme-imports/v-scroll.js";
import { ensureThemeCss } from "./runtime/inject-theme-css";

export { createVScroll, registerVScroll } from "./virtual-scroll";
export type { VScrollConfig, VScrollState } from "./virtual-scroll";
export * from "./virtual-scroll/math";

export const ensureVScrollTheme = () => ensureThemeCss(css_text);
