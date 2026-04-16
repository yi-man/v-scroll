import { beforeEach, describe, expect, it } from "vitest";
import { createVScroll, registerVScroll } from "../src/virtual-scroll";

describe("createVScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates shadow DOM structure", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const { destroy } = createVScroll(host),
      shadow_root = host.shadowRoot,
      frame = shadow_root?.querySelector('[data_v_scroll_frame="yes"]'),
      viewport = shadow_root?.querySelector('[data_v_scroll_viewport="yes"]'),
      slot = shadow_root?.querySelector("slot"),
      track = shadow_root?.querySelector('[data_v_scroll_track="yes"]'),
      thumb = shadow_root?.querySelector('[data_v_scroll_thumb="yes"]');

    expect(frame).toBeDefined();
    expect(viewport).toBeDefined();
    expect(slot).toBeDefined();
    expect(track).toBeDefined();
    expect(thumb).toBeDefined();
    expect(viewport?.contains(slot ?? null)).toBe(true);
    expect(track?.contains(thumb ?? null)).toBe(true);
    expect(frame?.contains(viewport ?? null)).toBe(true);
    expect(frame?.contains(track ?? null)).toBe(true);

    destroy();
  });
});

describe("registerVScroll", () => {
  it("registers custom element once", () => {
    registerVScroll();
    registerVScroll();

    expect(customElements.get("v-scroll")).toBeDefined();
  });
});
