import grab_icon from "../assets/grab.svg";
import { getScrollTopFromThumbOffset, getThumbOffset, getThumbSize } from "./v-scroll-math";

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

type DragState = {
  pointer_id: number;
  start_client_y: number;
  start_thumb_offset: number;
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
  drag_state: DragState | null;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
    this.resize_observer = null;
    this.raf_id = null;
    this.observed_nodes = new Set();
    this.drag_state = null;
  }

  ensureParts = () => {
    if (!this.parts) {
      this.parts = createParts();
      this.shadow_root.append(this.parts.frame);
    }

    return this.parts;
  };

  syncLayout = () => {
    const { thumb } = this.ensureParts(),
      { track_size, client_size, scroll_size, scroll_top, thumb_size } = this.getLayoutMetrics();

    if (thumb_size === 0) {
      this.dataset.scrollable = NO;
      this.ensureParts().track.dataset.visible = NO;
      thumb.style.blockSize = "";
      thumb.style.transform = "";
      return;
    }

    const thumb_offset = getThumbOffset({ track_size, thumb_size, client_size, scroll_size, scroll_top });

    this.dataset.scrollable = YES;
    this.ensureParts().track.dataset.visible = YES;
    thumb.style.blockSize = `${thumb_size}px`;
    thumb.style.transform = `translateY(${thumb_offset}px)`;
  };

  getLayoutMetrics = () => {
    const { viewport, track } = this.ensureParts(),
      track_size = track.clientHeight,
      client_size = viewport.clientHeight,
      scroll_size = viewport.scrollHeight,
      scroll_top = viewport.scrollTop,
      thumb_size = getThumbSize({ track_size, client_size, scroll_size }),
      thumb_offset = getThumbOffset({ track_size, thumb_size, client_size, scroll_size, scroll_top });

    return { viewport, track, track_size, client_size, scroll_size, scroll_top, thumb_size, thumb_offset };
  };

  clearDragState = (pointer_id?: number) => {
    const { thumb } = this.ensureParts();

    if (pointer_id !== undefined) {
      thumb.releasePointerCapture(pointer_id);
    }

    this.drag_state = null;
    this.dataset.dragging = NO;
    document.body.style.userSelect = "";
  };

  handleThumbPointerDown = (event: PointerEvent) => {
    if (this.drag_state) {
      return;
    }

    const { thumb } = this.ensureParts(),
      { thumb_offset } = this.getLayoutMetrics();

    thumb.setPointerCapture(event.pointerId);
    this.drag_state = {
      pointer_id: event.pointerId,
      start_client_y: event.clientY,
      start_thumb_offset: thumb_offset,
    };
    this.dataset.dragging = YES;
    document.body.style.userSelect = "none";
  };

  handleThumbPointerMove = (event: PointerEvent) => {
    if (!this.drag_state || event.pointerId !== this.drag_state.pointer_id) {
      return;
    }

    const { viewport, track_size, client_size, scroll_size, thumb_size } = this.getLayoutMetrics(),
      next_offset = this.drag_state.start_thumb_offset + (event.clientY - this.drag_state.start_client_y);

    viewport.scrollTop = getScrollTopFromThumbOffset({
      track_size,
      thumb_size,
      client_size,
      scroll_size,
      thumb_offset: next_offset,
    });
    this.syncLayout();
  };

  handleThumbPointerUp = (event: PointerEvent) => {
    if (!this.drag_state || event.pointerId !== this.drag_state.pointer_id) {
      return;
    }

    this.clearDragState(event.pointerId);
  };

  handleThumbPointerCancel = (event: PointerEvent) => {
    if (!this.drag_state || event.pointerId !== this.drag_state.pointer_id) {
      return;
    }

    this.clearDragState(event.pointerId);
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
    const { viewport, slot, thumb } = this.ensureParts();

    viewport.addEventListener("scroll", this.syncLayout, { passive: true });
    slot.addEventListener("slotchange", this.syncObservedContent);
    thumb.addEventListener("pointerdown", this.handleThumbPointerDown);
    thumb.addEventListener("pointermove", this.handleThumbPointerMove);
    thumb.addEventListener("pointerup", this.handleThumbPointerUp);
    thumb.addEventListener("pointercancel", this.handleThumbPointerCancel);
    this.resize_observer = new ResizeObserver(() => this.scheduleSync());
    this.resize_observer.observe(this);
    this.resize_observer.observe(viewport);
    this.syncObservedContent();
    this.dataset.dragging = NO;
  }

  disconnectedCallback() {
    const { viewport, slot, thumb } = this.ensureParts();

    viewport.removeEventListener("scroll", this.syncLayout);
    slot.removeEventListener("slotchange", this.syncObservedContent);
    thumb.removeEventListener("pointerdown", this.handleThumbPointerDown);
    thumb.removeEventListener("pointermove", this.handleThumbPointerMove);
    thumb.removeEventListener("pointerup", this.handleThumbPointerUp);
    thumb.removeEventListener("pointercancel", this.handleThumbPointerCancel);
    this.resize_observer?.disconnect();
    this.resize_observer = null;
    this.observed_nodes.clear();

    if (this.drag_state) {
      this.clearDragState();
    } else {
      this.dataset.dragging = NO;
    }

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
