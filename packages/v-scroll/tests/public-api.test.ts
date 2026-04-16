import { beforeEach, describe, expect, it } from "vitest";
import { ensureVScrollTheme, registerVScroll } from "../src/index";

describe("public api", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("registers the element and injects the built-in default theme without an import map", async () => {
    registerVScroll();
    const style_node = await ensureVScrollTheme();

    expect(customElements.get("v-scroll")).toBeDefined();
    expect(document.head.querySelector('script[type="importmap"]')).toBeNull();
    expect(style_node.dataset.vScrollTheme).toBe("default");
    expect(style_node.textContent).toContain("--v-scroll-frame-bg");
  });
});
