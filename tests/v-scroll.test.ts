import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerVScroll } from "../src/elements/v-scroll";
import { triggerResizeObservers } from "./setup";

const waitForAnimationFrame = async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

describe("registerVScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.userSelect = "";
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

  it("hides the track when content does not overflow", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);

    const viewport = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_viewport="yes"]'),
      track = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_track="yes"]');

    Object.defineProperties(viewport!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 300 },
    });

    viewport!.dispatchEvent(new Event("scroll"));

    expect(host.dataset.scrollable).toBe("no");
    expect(track?.dataset.visible).toBe("no");
  });

  it("sizes and positions the thumb from viewport geometry", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);

    const viewport = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_viewport="yes"]'),
      track = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_track="yes"]'),
      thumb = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_thumb="yes"]');

    Object.defineProperties(viewport!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 900 },
      scrollTop: { configurable: true, value: 300, writable: true },
    });

    Object.defineProperty(track!, "clientHeight", { configurable: true, value: 180 });

    viewport!.dispatchEvent(new Event("scroll"));

    expect(host.dataset.scrollable).toBe("yes");
    expect(track?.dataset.visible).toBe("yes");
    expect(thumb?.style.blockSize).toBe("58px");
    expect(thumb?.style.transform).toBe("translateY(58px)");
  });

  it("captures the pointer and maps drag distance into scrollTop", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);

    const viewport = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_viewport="yes"]'),
      track = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_track="yes"]'),
      thumb = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_thumb="yes"]');

    Object.defineProperties(viewport!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 900 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });

    Object.defineProperty(track!, "clientHeight", { configurable: true, value: 180 });
    thumb!.setPointerCapture = vi.fn();

    viewport!.dispatchEvent(new Event("scroll"));
    thumb!.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, clientY: 20, bubbles: true }));
    thumb!.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, clientY: 97, bubbles: true }));

    expect(thumb!.setPointerCapture).toHaveBeenCalledWith(7);
    expect(host.dataset.dragging).toBe("yes");
    expect(viewport!.scrollTop).toBe(398);
  });

  it("clears dragging state on pointerup", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);

    const thumb = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_thumb="yes"]');

    thumb!.setPointerCapture = vi.fn();
    thumb!.releasePointerCapture = vi.fn();

    thumb!.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, clientY: 10, bubbles: true }));
    thumb!.dispatchEvent(new PointerEvent("pointerup", { pointerId: 5, clientY: 10, bubbles: true }));

    expect(host.dataset.dragging).toBe("no");
    expect(thumb!.releasePointerCapture).toHaveBeenCalledWith(5);
  });

  it("syncs layout from observed slotted content resizes", async () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.innerHTML = "<article><p>Demo content</p></article>";
    document.body.append(host);

    const article = host.querySelector("article"),
      viewport = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_viewport="yes"]'),
      track = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_track="yes"]'),
      thumb = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_thumb="yes"]');

    await waitForAnimationFrame();

    Object.defineProperties(viewport!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 900 },
      scrollTop: { configurable: true, value: 300, writable: true },
    });

    Object.defineProperty(track!, "clientHeight", { configurable: true, value: 180 });

    triggerResizeObservers(article!);
    await waitForAnimationFrame();

    expect(host.dataset.scrollable).toBe("yes");
    expect(track?.dataset.visible).toBe("yes");
    expect(thumb?.style.blockSize).toBe("58px");
    expect(thumb?.style.transform).toBe("translateY(58px)");
  });

  it("preserves external body user-select state on disconnect", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.style.userSelect = "none";

    document.body.append(host);
    host.remove();

    expect(document.body.style.userSelect).toBe("none");
  });

  it("disconnects resize observers when the element leaves the document", () => {
    registerVScroll();

    const disconnect_spy = vi.spyOn(globalThis.ResizeObserver.prototype, "disconnect");
    const host = document.createElement("v-scroll");

    document.body.append(host);
    host.remove();

    expect(disconnect_spy).toHaveBeenCalled();
  });

  it("stays quiescent for resize-driven sync after disconnect", async () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.innerHTML = "<article><p>Demo content</p></article>";
    document.body.append(host);

    const article = host.querySelector("article"),
      viewport = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_viewport="yes"]'),
      track = host.shadowRoot?.querySelector<HTMLDivElement>('[data_v_scroll_track="yes"]');

    await waitForAnimationFrame();

    Object.defineProperties(viewport!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 900 },
    });

    Object.defineProperty(track!, "clientHeight", { configurable: true, value: 180 });

    triggerResizeObservers(article!);
    await waitForAnimationFrame();

    expect(host.dataset.scrollable).toBe("yes");

    Object.defineProperties(viewport!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 300 },
    });

    host.remove();
    triggerResizeObservers(article!);
    await waitForAnimationFrame();

    expect(host.dataset.scrollable).toBe("yes");
    expect(track?.dataset.visible).toBe("yes");
  });
});
