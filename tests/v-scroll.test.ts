import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVScroll, registerVScroll } from "../src/virtual-scroll";
import { triggerResizeObservers } from "./setup";

const setLayout = ({
  track,
  track_height = 180,
  viewport,
  viewport_height = 400,
}: {
  track: HTMLElement;
  track_height?: number;
  viewport: HTMLElement;
  viewport_height?: number;
}) => {
  Object.defineProperty(viewport, "clientHeight", {
    configurable: true,
    value: viewport_height,
  });
  Object.defineProperty(track, "clientHeight", {
    configurable: true,
    value: track_height,
  });
};

describe("virtual scroll behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders only visible items", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      data = Array.from({ length: 100 }, (_, index) => ({
        id: index,
        text: `Item ${index}`,
      }));

    setLayout({ track, viewport });
    instance.setData(data);
    instance.sync();

    const items = host.shadowRoot?.querySelectorAll(".v-scroll-item");

    expect(items?.length).toBeLessThan(15);
    expect(items?.length).toBeGreaterThan(5);

    instance.destroy();
  });

  it("updates visible items on scroll", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      data = Array.from({ length: 100 }, (_, index) => ({
        id: index,
        text: `Item ${index}`,
      }));

    setLayout({ track, viewport });
    instance.setData(data);
    viewport.scrollTop = 500;
    viewport.dispatchEvent(new Event("scroll"));

    const items = host.shadowRoot?.querySelectorAll(".v-scroll-item"),
      first_item = items?.item(0);

    expect(first_item?.textContent).toContain("Item 7");

    instance.destroy();
  });

  it("hides scrollbar when content fits viewport", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    setLayout({ track, viewport });
    instance.setData([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    instance.sync();

    expect(host.dataset.scrollable).toBe("no");
    expect(thumb.style.display).toBe("none");

    instance.destroy();
  });

  it("shows the scroll cursor icon while hovering the thumb", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement,
      data = Array.from({ length: 100 }, (_, index) => ({
        id: index,
        text: `Item ${index}`,
      }));

    setLayout({ track, viewport });
    instance.setData(data);
    expect(thumb.style.cursor).toContain("url(");
    expect(thumb.style.cursor).toContain("data:image/svg+xml");
    expect(thumb.style.cursor).toContain("ns-resize");
    expect(document.body.style.cursor).toBe("");

    instance.destroy();
  });

  it("switches to the grab cursor icon during thumb dragging", () => {
    const host = document.createElement("v-scroll");
    document.body.style.userSelect = "text";
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement,
      data = Array.from({ length: 100 }, (_, index) => ({
        id: index,
        text: `Item ${index}`,
      }));

    setLayout({ track, viewport });
    thumb.setPointerCapture = vi.fn();
    thumb.hasPointerCapture = vi.fn(() => true);
    thumb.releasePointerCapture = vi.fn();
    instance.setData(data);

    thumb.dispatchEvent(new PointerEvent("pointerenter", { pointerId: 7, clientY: 20, bubbles: true }));
    thumb.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, clientY: 20, bubbles: true }));

    expect(host.dataset.dragging).toBe("yes");
    expect(thumb.style.cursor).toContain("url(");
    expect(thumb.style.cursor).toContain("data:image/svg+xml");
    expect(thumb.style.cursor).toContain("grabbing");
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("none");

    thumb.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, clientY: 20, bubbles: true }));

    expect(host.dataset.dragging).toBe("no");
    expect(thumb.style.cursor).toContain("url(");
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("text");

    instance.destroy();
  });

  it("cleans up on destroy", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const disconnect_spy = vi.spyOn(ResizeObserver.prototype, "disconnect"),
      instance = createVScroll(host);

    instance.destroy();

    expect(disconnect_spy).toHaveBeenCalled();
  });
});

describe("registerVScroll integration", () => {
  it("renders large dataset efficiently", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.setAttribute("item-height", "50");
    document.body.append(host);

    const viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      data = Array.from({ length: 100000 }, (_, index) => ({
        id: index,
        name: `User ${index}`,
      }));

    setLayout({ track, viewport });
    (host as HTMLElement & { data: unknown[] }).data = data;
    triggerResizeObservers(host, viewport);

    const items = host.shadowRoot?.querySelectorAll(".v-scroll-item"),
      virtual_container = host.shadowRoot?.querySelector('[data_v_scroll_virtual="yes"]') as HTMLElement;

    expect(items?.length).toBeLessThan(20);
    expect(items?.length).toBeGreaterThan(0);
    expect(Number.parseInt(virtual_container.style.height || "0", 10)).toBe(100000 * 50);
  });
});
