import css_text from "$/v-scroll.js";
import { createDemo } from "./demo/create-demo";
import { registerVScroll } from "./elements/v-scroll";
import { ensureThemeCss } from "./runtime/inject-theme-css";

const renderApp = () => {
  registerVScroll();
  ensureThemeCss(css_text);

  const app_root = document.querySelector<HTMLDivElement>("#app");
  if (!app_root) throw new Error("Expected #app root node");

  app_root.innerHTML = "";
  app_root.append(createDemo());
};

renderApp();
