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

  it("creates viewport, track, thumb, and grab parts inside shadow dom", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.innerHTML = "<article><p>Demo content</p></article>";
    document.body.append(host);

    const frame = host.shadowRoot?.querySelector('[data_v_scroll_frame="yes"]'),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]'),
      slot = host.shadowRoot?.querySelector("slot"),
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]'),
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]'),
      grab = host.shadowRoot?.querySelector('[data_v_scroll_grab="yes"]') as HTMLImageElement | null;

    expect(frame?.getAttribute("part")).toBe("frame");
    expect(viewport?.getAttribute("part")).toBe("viewport");
    expect(slot).toBeDefined();
    expect(track?.getAttribute("part")).toBe("track");
    expect(track?.getAttribute("aria-hidden")).toBe("true");
    expect(thumb?.getAttribute("part")).toBe("thumb");
    expect(grab?.getAttribute("part")).toBe("grab");
    expect(grab?.tagName).toBe("IMG");
    expect(frame?.children.item(0)).toBe(viewport);
    expect(frame?.children.item(1)).toBe(track);
    expect(viewport?.children.item(0)).toBe(slot);
    expect(track?.children.item(0)).toBe(thumb);
    expect(thumb?.children.item(0)).toBe(grab);
    expect(grab?.alt).toBe("");
    expect(grab?.draggable).toBe(false);
    expect(host.querySelector("p")?.textContent).toBe("Demo content");
  });

  it("does not duplicate the shell when connected twice", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);
    host.remove();
    document.body.append(host);

    expect(host.shadowRoot?.querySelectorAll('[data_v_scroll_frame="yes"]').length).toBe(1);
    expect(host.shadowRoot?.querySelectorAll('[data_v_scroll_viewport="yes"]').length).toBe(1);
    expect(host.shadowRoot?.querySelectorAll("slot").length).toBe(1);
    expect(host.shadowRoot?.querySelectorAll('[data_v_scroll_track="yes"]').length).toBe(1);
    expect(host.shadowRoot?.querySelectorAll('[data_v_scroll_thumb="yes"]').length).toBe(1);
    expect(host.shadowRoot?.querySelectorAll('[data_v_scroll_grab="yes"]').length).toBe(1);
  });
});
