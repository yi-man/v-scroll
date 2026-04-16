import css_text from "$/v-scroll.js";
import { createSeedContent } from "./demo/seed-content";
import { registerVScroll } from "./elements/v-scroll";
import { ensureThemeCss } from "./runtime/inject-theme-css";

const renderApp = () => {
  registerVScroll();
  ensureThemeCss(css_text);

  const app_root = document.querySelector<HTMLDivElement>("#app");

  if (!app_root) {
    throw new Error("Expected #app root node");
  }

  app_root.innerHTML = "";

  const page = document.createElement("section"),
    heading = document.createElement("h1"),
    shell = document.createElement("v-scroll");

  heading.textContent = "v-scroll demo";
  shell.append(createSeedContent());
  page.append(heading, shell);
  app_root.append(page);
};

renderApp();
