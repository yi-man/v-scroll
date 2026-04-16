const V_SCROLL_TAG_NAME = "v-scroll",
  V_SCROLL_THEME_KEY = "vScrollTheme",
  V_SCROLL_THEME_NAME = "default",
  V_SCROLL_THEME_CSS = ":root{}";

const ensureVScrollTheme = () => {
  const existing_node = document.head.querySelector<HTMLStyleElement>(
    `style[data-v-scroll-theme="${V_SCROLL_THEME_NAME}"]`,
  );

  if (existing_node) {
    return existing_node;
  }

  const style_node = document.createElement("style");
  style_node.dataset[V_SCROLL_THEME_KEY] = V_SCROLL_THEME_NAME;
  style_node.textContent = V_SCROLL_THEME_CSS;
  document.head.append(style_node);
  return style_node;
};

const registerVScroll = () => {
  if (customElements.get(V_SCROLL_TAG_NAME)) {
    return;
  }

  customElements.define(
    V_SCROLL_TAG_NAME,
    class extends HTMLElement {},
  );
};

export { ensureVScrollTheme, registerVScroll };
