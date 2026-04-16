import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVScroll, registerVScroll } from "../src/virtual-scroll";
import { TestResizeObserver, triggerResizeObservers } from "./setup";
import { calcScrollTopFromThumbOffset, calcThumbHeight, calcThumbOffset } from "../src/virtual-scroll/math";

const setLayout = ({
  track,
  track_height = 180,
  viewport,
  viewport_height = 400,
  virtual_height = 2000,
  scroll_top = 0,
}: {
  track: HTMLElement;
  track_height?: number;
  viewport: HTMLElement;
  viewport_height?: number;
  virtual_height?: number;
  scroll_top?: number;
}) => {
  Object.defineProperty(viewport, "clientHeight", {
    configurable: true,
    value: viewport_height,
  });
  Object.defineProperty(viewport, "scrollHeight", {
    configurable: true,
    value: virtual_height,
  });
  Object.defineProperty(track, "clientHeight", {
    configurable: true,
    value: track_height,
  });
  viewport.scrollTop = scroll_top;
};

describe("virtual scroll behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("proxies light DOM nodes through slot", () => {
    const host = document.createElement("v-scroll");
    const child = document.createElement("div");
    child.textContent = "hello";
    host.append(child);
    document.body.append(host);

    const instance = createVScroll(host);

    const slot = host.shadowRoot?.querySelector("slot") as HTMLSlotElement | null;
    const assigned = slot ? Array.from(slot.assignedNodes()) : [];

    expect(assigned).toContain(child);

    instance.destroy();
  });

  it("syncs thumb position on scroll", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const instance = createVScroll(host),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    const viewport_height = 400,
      track_height = 200,
      virtual_height = 5000;

    setLayout({ track, viewport, track_height, viewport_height, virtual_height, scroll_top: 0 });
    instance.sync();

    const thumb_height = calcThumbHeight({
      track_height,
      viewport_height,
      virtual_height,
    });

    expect(thumb.style.transform).toBe(
      `translateY(${calcThumbOffset({
        scroll_top: 0,
        thumb_height,
        track_height,
        viewport_height,
        virtual_height,
      })}px)`,
    );

    viewport.scrollTop = 2500;
    viewport.dispatchEvent(new Event("scroll"));

    expect(thumb.style.transform).toBe(
      `translateY(${calcThumbOffset({
        scroll_top: 2500,
        thumb_height,
        track_height,
        viewport_height,
        virtual_height,
      })}px)`,
    );

    instance.destroy();
  });

  it("hides scrollbar when content fits viewport", () => {
    const host = document.createElement("v-scroll");
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    setLayout({ track, viewport, virtual_height: 400, viewport_height: 400 });
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
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    setLayout({ track, viewport, virtual_height: 5000, viewport_height: 400 });
    instance.sync();
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
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    setLayout({ track, viewport, virtual_height: 5000, viewport_height: 400 });
    instance.sync();
    thumb.setPointerCapture = vi.fn();
    thumb.hasPointerCapture = vi.fn(() => true);
    thumb.releasePointerCapture = vi.fn();

    thumb.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 7, clientY: 20, bubbles: true, button: 0 }),
    );

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

  it("reads track top and bottom gaps from css variables for drag mapping", () => {
    const host = document.createElement("v-scroll");
    host.style.setProperty("--v-scroll-track-top-gap", "10px");
    host.style.setProperty("--v-scroll-track-bottom-gap", "12px");
    document.body.append(host);

    const instance = createVScroll(host, { item_height: 50 }),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    const viewport_height = 400,
      track_height = 200,
      virtual_height = 5000,
      top_gap = 10,
      bottom_gap = 12,
      start_client_y = 20,
      move_client_y = 70;

    setLayout({ track, viewport, track_height, viewport_height, virtual_height, scroll_top: 0 });
    instance.sync();
    thumb.setPointerCapture = vi.fn();
    thumb.hasPointerCapture = vi.fn(() => true);
    thumb.releasePointerCapture = vi.fn();

    const thumb_height = calcThumbHeight({
      track_height,
      viewport_height,
      virtual_height,
      top_gap,
      bottom_gap,
    });
    expect(thumb.style.transform).toBe(
      `translateY(${calcThumbOffset({
        scroll_top: 0,
        thumb_height,
        track_height,
        viewport_height,
        virtual_height,
        top_gap,
        bottom_gap,
      })}px)`,
    );

    thumb.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 7,
        clientY: start_client_y,
        bubbles: true,
        button: 0,
      }),
    );
    thumb.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 7,
        clientY: move_client_y,
        bubbles: true,
      }),
    );

    const start_thumb_offset = calcThumbOffset({
      scroll_top: 0,
      thumb_height,
      track_height,
      viewport_height,
      virtual_height,
      top_gap,
      bottom_gap,
    });
    expect(viewport.scrollTop).toBe(
      calcScrollTopFromThumbOffset({
        thumb_height,
        thumb_offset: start_thumb_offset + (move_client_y - start_client_y),
        track_height,
        viewport_height,
        virtual_height,
        top_gap,
        bottom_gap,
      }),
    );

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

  it("observes assigned content nodes and reacts to their resize", () => {
    const host = document.createElement("v-scroll"),
      content = document.createElement("div");
    content.textContent = "content";
    host.append(content);
    document.body.append(host);

    const instance = createVScroll(host),
      viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    setLayout({ track, viewport, virtual_height: 300, viewport_height: 400 });
    instance.sync();
    expect(host.dataset.scrollable).toBe("no");

    setLayout({ track, viewport, virtual_height: 2000, viewport_height: 400 });
    triggerResizeObservers(content);

    expect(host.dataset.scrollable).toBe("yes");
    expect(thumb.style.display).toBe("");

    instance.destroy();
  });
});

describe("registerVScroll integration", () => {
  it("creates shadow structure and updates scrollable state", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.append(document.createElement("div"));
    document.body.append(host);

    const viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement,
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]') as HTMLElement;

    setLayout({ track, viewport, virtual_height: 5000, viewport_height: 400 });
    triggerResizeObservers(host, viewport);

    expect(thumb).toBeTruthy();
    expect(host.dataset.scrollable).toBe("yes");
  });

  it("disconnects observers on detach and creates a new instance on reattach", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);
    const instance_before = (host as HTMLElement & { instance?: unknown }).instance;
    expect(instance_before).toBeTruthy();

    host.remove();
    const active_observers = [...TestResizeObserver.instances].filter(
      (observer) => observer.observed_targets.size > 0,
    );
    expect(active_observers).toHaveLength(0);
    expect((host as HTMLElement & { instance?: unknown }).instance).toBeNull();

    document.body.append(host);
    const instance_after = (host as HTMLElement & { instance?: unknown }).instance;
    expect(instance_after).toBeTruthy();
    expect(instance_after).not.toBe(instance_before);
  });

  it("updates observed content nodes after slot reassignment", () => {
    registerVScroll();

    const host = document.createElement("v-scroll"),
      content_a = document.createElement("div"),
      content_b = document.createElement("div");
    content_a.textContent = "a";
    content_b.textContent = "b";
    host.append(content_a);
    document.body.append(host);

    const viewport = host.shadowRoot?.querySelector('[data_v_scroll_viewport="yes"]') as HTMLElement,
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]') as HTMLElement;

    setLayout({ track, viewport, virtual_height: 2000, viewport_height: 400 });
    triggerResizeObservers(content_a);
    expect(host.dataset.scrollable).toBe("yes");

    host.replaceChildren(content_b);
    setLayout({ track, viewport, virtual_height: 300, viewport_height: 400 });
    triggerResizeObservers(content_a);
    expect(host.dataset.scrollable).toBe("yes");

    triggerResizeObservers(content_b);
    expect(host.dataset.scrollable).toBe("no");
  });
});
