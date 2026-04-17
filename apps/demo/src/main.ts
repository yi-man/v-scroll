import { registerVScroll } from "v-scroll";
import { createDemoData } from "./demo-data";
import "./demo.css";

const renderApp = () => {
  const app_root = document.querySelector<HTMLDivElement>("#app");
  if (!app_root) {
    throw new Error("Expected #app root node");
  }

  app_root.innerHTML = "";

  const container = document.createElement("div"),
    title = document.createElement("h1"),
    desc = document.createElement("p"),
    vscroll = document.createElement("v-scroll");

  container.className = "demo_container";

  title.textContent = "Virtual Scroll Demo";
  title.className = "demo_title";

  desc.textContent = "Custom scrollbar demo: native overflow + slotted content";
  desc.className = "demo_desc";

  vscroll.className = "demo_vscroll";

  container.append(title, desc, vscroll);
  app_root.append(container);

  const data = createDemoData();
  for (const item of data) {
    const el = document.createElement("div");
    el.setAttribute("part", "v-scroll-item");
    el.textContent = item.title;
    vscroll.append(el);
  }
};

const bootstrap = async () => {
  await registerVScroll();
  renderApp();
};

void bootstrap();
