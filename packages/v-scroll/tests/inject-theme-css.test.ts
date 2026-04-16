import { beforeEach, describe, expect, it } from "vitest";
import { ensureThemeCss } from "../src/runtime/inject-theme-css";

describe("ensureThemeCss", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects one style tag and deduplicates repeat calls", () => {
    ensureThemeCss(":root{--demo:1}");
    ensureThemeCss(":root{--demo:1}");

    const style_nodes = document.head.querySelectorAll('style[data-v-scroll-theme="default"]');

    expect(style_nodes).toHaveLength(1);
    expect(style_nodes[0]?.textContent).toBe(":root{--demo:1}");
  });
});
