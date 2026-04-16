import { beforeEach, describe, expect, it } from "vitest";
import { ensureVScrollTheme, registerVScroll } from "../src/index";

describe("public api", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("registers the element and injects the generated default theme", async () => {
    registerVScroll();
    const style_node = await ensureVScrollTheme();

    expect(customElements.get("v-scroll")).toBeDefined();
    expect(style_node.dataset.vScrollTheme).toBe("default");
    expect(style_node.textContent?.length).toBeGreaterThan(0);
  });
});
