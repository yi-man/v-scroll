import grab_icon from "../assets/grab.svg";
import { getThumbOffset, getThumbSize } from "./v-scroll-math";

const ELEMENT_NAME = "v-scroll",
  FRAME_ATTR = "data_v_scroll_frame",
  VIEWPORT_ATTR = "data_v_scroll_viewport",
  TRACK_ATTR = "data_v_scroll_track",
  THUMB_ATTR = "data_v_scroll_thumb",
  GRAB_ATTR = "data_v_scroll_grab",
  YES = "yes",
  NO = "no";

type VScrollParts = {
  frame: HTMLDivElement;
  viewport: HTMLDivElement;
  slot: HTMLSlotElement;
  track: HTMLDivElement;
  thumb: HTMLDivElement;
  grab: HTMLImageElement;
};

const createParts = () => {
  const frame = document.createElement("div"),
    viewport = document.createElement("div"),
    slot = document.createElement("slot"),
    track = document.createElement("div"),
    thumb = document.createElement("div"),
    grab = document.createElement("img");

  frame.setAttribute("part", "frame");
  frame.setAttribute(FRAME_ATTR, "yes");

  viewport.setAttribute("part", "viewport");
  viewport.setAttribute(VIEWPORT_ATTR, "yes");

  track.setAttribute("part", "track");
  track.setAttribute(TRACK_ATTR, "yes");
  track.setAttribute("aria-hidden", "true");

  thumb.setAttribute("part", "thumb");
  thumb.setAttribute(THUMB_ATTR, "yes");

  grab.setAttribute("part", "grab");
  grab.setAttribute(GRAB_ATTR, "yes");
  grab.alt = "";
  grab.draggable = false;
  grab.src = grab_icon;

  viewport.append(slot);
  thumb.append(grab);
  track.append(thumb);
  frame.append(viewport, track);

  return { frame, viewport, slot, track, thumb, grab };
};

class VScrollElement extends HTMLElement {
  shadow_root: ShadowRoot;
  parts: VScrollParts | null;
  resize_observer: ResizeObserver | null;
  raf_id: number | null;
  observed_nodes: Set<Element>;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
    this.resize_observer = null;
    this.raf_id = null;
    this.observed_nodes = new Set();
  }

  ensureParts = () => {
    if (!this.parts) {
      this.parts = createParts();
      this.shadow_root.append(this.parts.frame);
    }

    return this.parts;
  };

  syncLayout = () => {
    const { viewport, track, thumb } = this.ensureParts(),
      track_size = track.clientHeight,
      client_size = viewport.clientHeight,
      scroll_size = viewport.scrollHeight,
      scroll_top = viewport.scrollTop,
      thumb_size = getThumbSize({ track_size, client_size, scroll_size });

    if (thumb_size === 0) {
      this.dataset.scrollable = NO;
      track.dataset.visible = NO;
      thumb.style.blockSize = "";
      thumb.style.transform = "";
      return;
    }

    const thumb_offset = getThumbOffset({ track_size, thumb_size, client_size, scroll_size, scroll_top });

    this.dataset.scrollable = YES;
    track.dataset.visible = YES;
    thumb.style.blockSize = `${thumb_size}px`;
    thumb.style.transform = `translateY(${thumb_offset}px)`;
  };

  syncObservedContent = () => {
    const { slot } = this.ensureParts();

    this.observed_nodes.forEach((node) => this.resize_observer?.unobserve(node));
    this.observed_nodes.clear();

    slot.assignedElements().forEach((node) => {
      this.resize_observer?.observe(node);
      this.observed_nodes.add(node);
    });

    this.scheduleSync();
  };

  scheduleSync = () => {
    if (this.raf_id !== null) {
      cancelAnimationFrame(this.raf_id);
    }

    this.raf_id = requestAnimationFrame(() => {
      this.raf_id = null;
      this.syncLayout();
    });
  };

  connectedCallback() {
    const { viewport, slot } = this.ensureParts();

    viewport.addEventListener("scroll", this.syncLayout, { passive: true });
    slot.addEventListener("slotchange", this.syncObservedContent);
    this.resize_observer = new ResizeObserver(() => this.scheduleSync());
    this.resize_observer.observe(this);
    this.resize_observer.observe(viewport);
    this.syncObservedContent();
    this.dataset.dragging = NO;
  }

  disconnectedCallback() {
    const { viewport, slot } = this.ensureParts();

    viewport.removeEventListener("scroll", this.syncLayout);
    slot.removeEventListener("slotchange", this.syncObservedContent);
    this.resize_observer?.disconnect();
    this.resize_observer = null;
    this.observed_nodes.clear();
    this.dataset.dragging = NO;

    if (this.raf_id !== null) {
      cancelAnimationFrame(this.raf_id);
      this.raf_id = null;
    }
  }
}

export const registerVScroll = () => {
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, VScrollElement);
  }
};
