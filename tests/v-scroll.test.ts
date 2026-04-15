import { beforeEach, describe, expect, it } from "vitest";
import { registerVScroll } from "../src/elements/v-scroll";

describe("registerVScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("registers the custom element once", () => {
    registerVScroll();
    registerVScroll();

    expect(customElements.get("v-scroll")).toBeDefined();
  });

  it("wraps host content inside a frame part", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.innerHTML = "<p>Demo content</p>";
    document.body.append(host);

    const frame = host.shadowRoot?.querySelector('[data_v_scroll_frame="yes"]'),
      slot = host.shadowRoot?.querySelector("slot"),
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]'),
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]');

    expect(frame?.getAttribute("part")).toBe("frame");
    expect(slot).toBeDefined();
    expect(track?.getAttribute("part")).toBe("track");
    expect(track?.tagName).toBe("DIV");
    expect(thumb?.getAttribute("part")).toBe("thumb");
    expect(thumb?.tagName).toBe("DIV");
    expect(host.querySelector("p")?.textContent).toBe("Demo content");
  });
});
