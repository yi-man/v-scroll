import { beforeEach, describe, expect, it } from "vitest";
import { registerVScroll } from "../src/index";

describe("public api", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("registers the element and injects the built-in default theme without an import map", async () => {
    await registerVScroll();
    const style_node = document.head.querySelector<HTMLStyleElement>('style[data-v-scroll-theme="default"]');

    expect(customElements.get("v-scroll")).toBeDefined();
    expect(document.head.querySelector('script[type="importmap"]')).toBeNull();
    expect(style_node?.dataset.vScrollTheme).toBe("default");
    expect(style_node?.textContent).toContain("--v-scroll-frame-bg");
  });
});
