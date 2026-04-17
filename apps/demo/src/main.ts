import { registerVScroll } from "v-scroll";
import { createDemoData } from "./demo-data";

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

  container.style.cssText =
    "max-width: 600px; margin: 0 auto; padding: 40px 20px;";

  title.textContent = "Virtual Scroll Demo";
  title.style.cssText =
    "font-size: 28px; font-weight: 600; margin: 0 0 24px 0; color: #1a1a1a;";

  desc.textContent = "Custom scrollbar demo: native overflow + slotted content";
  desc.style.cssText =
    "font-size: 14px; color: #666; margin: 0 0 24px 0; line-height: 1.5;";

  vscroll.style.cssText = "block-size: 400px;";

  container.append(title, desc, vscroll);
  app_root.append(container);

  const data = createDemoData();
  for (const item of data) {
    const el = document.createElement("div");
    el.setAttribute("part", "item");
    el.textContent = item.title;
    vscroll.append(el);
  }
};

const bootstrap = async () => {
  await registerVScroll();
  renderApp();
};

void bootstrap();
