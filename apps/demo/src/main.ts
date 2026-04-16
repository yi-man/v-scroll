import { ensureVScrollTheme, registerVScroll } from "v-scroll";

const mountDemo = () => {
  registerVScroll();
  ensureVScrollTheme();

  const app_node = document.querySelector<HTMLDivElement>("#app");
  if (!app_node) {
    throw new Error("Expected #app element.");
  }

  app_node.innerHTML = "<v-scroll></v-scroll>";
};

mountDemo();
