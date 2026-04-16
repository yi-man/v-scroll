import { createWelcomeList } from "./welcome-list";

export const createDemo = () => {
  const container = document.createElement("div");
  container.style.cssText = `
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  `;

  // Title
  const title = document.createElement("h1");
  title.textContent = "v-scroll Demo";
  title.style.cssText = `
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 24px 0;
    color: #1a1a1a;
  `;
  container.append(title);

  // Description
  const desc = document.createElement("p");
  desc.textContent = "A custom scrollbar component with smooth scrolling and drag support. Scroll down to see more items.";
  desc.style.cssText = `
    font-size: 14px;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.5;
  `;
  container.append(desc);

  // v-scroll container
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
  `;

  const header = document.createElement("div");
  header.textContent = "Welcome List (100 items)";
  header.style.cssText = `
    padding: 16px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    font-size: 14px;
    font-weight: 500;
    color: #555;
  `;

  const vscroll = document.createElement("v-scroll");
  vscroll.style.cssText = `
    --v-scroll-frame-border: transparent;
    --v-scroll-frame-min-block-size: 400px;
  `;
  vscroll.append(createWelcomeList(100));

  wrapper.append(header, vscroll);
  container.append(wrapper);

  return container;
};
