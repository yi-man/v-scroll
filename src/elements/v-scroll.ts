import grab_icon from "../assets/grab.svg";
import scroll_icon from "../assets/scroll.svg";
import {
  TRACK_BOTTOM_GAP,
  TRACK_TOP_GAP,
  getScrollTopFromThumbOffset,
  getThumbOffset,
  getThumbSize,
} from "./v-scroll-math";

const ELEMENT_NAME = "v-scroll",
  FRAME_ATTR = "data_v_scroll_frame",
  VIEWPORT_ATTR = "data_v_scroll_viewport",
  TRACK_ATTR = "data_v_scroll_track",
  THUMB_ATTR = "data_v_scroll_thumb",
  YES = "yes",
  NO = "no";

// Dynamic cursor styles
const SCROLL_CURSOR_STYLE_ID = "v-scroll-cursor-style";

const getScrollCursorCss = (scroll_url: string, grab_url: string) => `
  .v-scroll-cursor-hover * {
    cursor: url("${scroll_url}") 10 10, ns-resize !important;
  }
  .v-scroll-cursor-grab * {
    cursor: url("${grab_url}") 7 7, grabbing !important;
  }
`;

type VScrollParts = {
  frame: HTMLDivElement;
  viewport: HTMLDivElement;
  slot: HTMLSlotElement;
  track: HTMLDivElement;
  thumb: HTMLDivElement;
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
    thumb = document.createElement("div");

  frame.setAttribute("part", "frame");
  frame.setAttribute(FRAME_ATTR, "yes");

  viewport.setAttribute("part", "viewport");
  viewport.setAttribute(VIEWPORT_ATTR, "yes");

  track.setAttribute("part", "track");
  track.setAttribute(TRACK_ATTR, "yes");
  track.setAttribute("aria-hidden", "true");

  thumb.setAttribute("part", "thumb");
  thumb.setAttribute(THUMB_ATTR, "yes");

  viewport.append(slot);
  track.append(thumb);
  frame.append(viewport, track);

  return { frame, viewport, slot, track, thumb };
};

class VScrollElement extends HTMLElement {
  shadow_root: ShadowRoot;
  parts: VScrollParts | null;
  resize_observer: ResizeObserver | null;
  raf_id: number | null;
  observed_nodes: Set<Element>;
  drag_state: DragState | null;
  body_user_select: string | null;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
    this.resize_observer = null;
    this.raf_id = null;
    this.observed_nodes = new Set();
    this.drag_state = null;
    this.body_user_select = null;
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
      { track_size, client_size, scroll_size, scroll_top, thumb_size } =
        this.getLayoutMetrics();

    if (thumb_size === 0) {
      this.dataset.scrollable = NO;
      this.ensureParts().track.dataset.visible = NO;
      thumb.style.blockSize = "";
      thumb.style.transform = "";
      return;
    }

    const thumb_offset = getThumbOffset({
      track_size,
      thumb_size,
      client_size,
      scroll_size,
      scroll_top,
    });

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
      thumb_offset = getThumbOffset({
        track_size,
        thumb_size,
        client_size,
        scroll_size,
        scroll_top,
      }),
      max_scroll_top = Math.max(0, scroll_size - client_size),
      drag_range = Math.max(
        0,
        track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP - thumb_size,
      );

    return {
      viewport,
      track,
      track_size,
      client_size,
      scroll_size,
      scroll_top,
      thumb_size,
      thumb_offset,
      max_scroll_top,
      drag_range,
    };
  };

  ensureCursorStyle = () => {
    if (!document.getElementById(SCROLL_CURSOR_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = SCROLL_CURSOR_STYLE_ID;
      style.textContent = getScrollCursorCss(scroll_icon, grab_icon);
      document.head.append(style);
    }
  };

  setHoverCursor = () => {
    this.ensureCursorStyle();
    document.body.classList.add("v-scroll-cursor-hover");
  };

  clearHoverCursor = () => {
    document.body.classList.remove("v-scroll-cursor-hover");
  };

  setGrabCursor = () => {
    this.ensureCursorStyle();
    document.body.classList.remove("v-scroll-cursor-hover");
    document.body.classList.add("v-scroll-cursor-grab");
  };

  clearGrabCursor = () => {
    document.body.classList.remove("v-scroll-cursor-grab");
  };

  clearDragState = (pointer_id?: number) => {
    const { thumb } = this.ensureParts();

    if (pointer_id !== undefined && thumb.hasPointerCapture?.(pointer_id)) {
      thumb.releasePointerCapture(pointer_id);
    }

    this.drag_state = null;
    this.dataset.dragging = NO;
    this.clearGrabCursor();
    document.body.style.userSelect = this.body_user_select ?? "";
    this.body_user_select = null;
  };

  handleThumbPointerEnter = () => {
    if (!this.drag_state) {
      this.setHoverCursor();
    }
  };

  handleThumbPointerLeave = () => {
    if (!this.drag_state) {
      this.clearHoverCursor();
    }
  };

  handleThumbPointerDown = (event: PointerEvent) => {
    if (this.drag_state || event.button !== 0) {
      return;
    }

    const { thumb } = this.ensureParts(),
      { thumb_offset, max_scroll_top, drag_range } = this.getLayoutMetrics();

    if (max_scroll_top === 0 || drag_range === 0) {
      return;
    }

    thumb.setPointerCapture(event.pointerId);
    this.drag_state = {
      pointer_id: event.pointerId,
      start_client_y: event.clientY,
      start_thumb_offset: thumb_offset,
    };
    this.body_user_select = document.body.style.userSelect;
    this.dataset.dragging = YES;
    this.clearHoverCursor();
    this.setGrabCursor();
    document.body.style.userSelect = "none";
  };

  handleThumbPointerMove = (event: PointerEvent) => {
    if (!this.drag_state || event.pointerId !== this.drag_state.pointer_id) {
      return;
    }

    const { viewport, track_size, client_size, scroll_size, thumb_size } =
        this.getLayoutMetrics(),
      next_offset =
        this.drag_state.start_thumb_offset +
        (event.clientY - this.drag_state.start_client_y);

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

  handleThumbLostPointerCapture = (event: PointerEvent) => {
    if (!this.drag_state || event.pointerId !== this.drag_state.pointer_id) {
      return;
    }

    this.clearDragState();
  };

  syncObservedContent = () => {
    const { slot } = this.ensureParts();

    this.observed_nodes.forEach((node) =>
      this.resize_observer?.unobserve(node),
    );
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
    const { viewport, slot, thumb, track } = this.ensureParts();

    viewport.addEventListener("scroll", this.syncLayout, { passive: true });
    slot.addEventListener("slotchange", this.syncObservedContent);
    thumb.addEventListener("pointerenter", this.handleThumbPointerEnter);
    thumb.addEventListener("pointerleave", this.handleThumbPointerLeave);
    thumb.addEventListener("pointerdown", this.handleThumbPointerDown);
    thumb.addEventListener("pointermove", this.handleThumbPointerMove);
    thumb.addEventListener("pointerup", this.handleThumbPointerUp);
    thumb.addEventListener("pointercancel", this.handleThumbPointerCancel);
    thumb.addEventListener(
      "lostpointercapture",
      this.handleThumbLostPointerCapture,
    );
    this.resize_observer = new ResizeObserver(() => this.scheduleSync());
    this.resize_observer.observe(this);
    this.resize_observer.observe(viewport);
    this.dataset.scrollable = NO;
    track.dataset.visible = NO;
    this.syncObservedContent();
    this.dataset.dragging = NO;
  }

  disconnectedCallback() {
    const { viewport, slot, thumb } = this.ensureParts();

    viewport.removeEventListener("scroll", this.syncLayout);
    slot.removeEventListener("slotchange", this.syncObservedContent);
    thumb.removeEventListener("pointerenter", this.handleThumbPointerEnter);
    thumb.removeEventListener("pointerleave", this.handleThumbPointerLeave);
    thumb.removeEventListener("pointerdown", this.handleThumbPointerDown);
    thumb.removeEventListener("pointermove", this.handleThumbPointerMove);
    thumb.removeEventListener("pointerup", this.handleThumbPointerUp);
    thumb.removeEventListener("pointercancel", this.handleThumbPointerCancel);
    thumb.removeEventListener(
      "lostpointercapture",
      this.handleThumbLostPointerCapture,
    );
    this.resize_observer?.disconnect();
    this.resize_observer = null;
    this.observed_nodes.clear();

    this.clearHoverCursor();

    if (this.drag_state) {
      this.clearDragState(this.drag_state.pointer_id);
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
