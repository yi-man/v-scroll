import { ensureVScrollTheme, registerVScroll } from "v-scroll";
import { createDemoData } from "./demo-data";

const renderApp = () => {
  registerVScroll();
  ensureVScrollTheme();

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

  desc.textContent = "Virtual scrolling demo: 100k rows with visible-window rendering";
  desc.style.cssText =
    "font-size: 14px; color: #666; margin: 0 0 24px 0; line-height: 1.5;";

  vscroll.setAttribute("item-height", "50");
  vscroll.style.cssText =
    "border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: #fff; block-size: 400px;";

  container.append(title, desc, vscroll);
  app_root.append(container);

  (vscroll as HTMLElement & { data: ReturnType<typeof createDemoData> }).data =
    createDemoData();
};

renderApp();
