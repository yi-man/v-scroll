const THEME_SELECTOR = 'style[data-v-scroll-theme="default"]';

export const ensureThemeCss = (css_text: string) => {
  const existing_node = document.head.querySelector<HTMLStyleElement>(THEME_SELECTOR);

  if (existing_node) {
    if (existing_node.textContent !== css_text) {
      existing_node.textContent = css_text;
    }

    return existing_node;
  }

  const style_node = document.createElement("style");

  style_node.dataset.vScrollTheme = "default";
  style_node.textContent = css_text;
  document.head.append(style_node);

  return style_node;
};
