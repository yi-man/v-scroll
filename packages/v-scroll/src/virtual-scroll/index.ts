import grab_icon from "../assets/grab.svg";
import scroll_icon from "../assets/scroll.svg";
import { createParts } from "./dom";
import {
  TRACK_BOTTOM_GAP,
  TRACK_TOP_GAP,
  calcScrollTopFromThumbOffset,
  calcThumbHeight,
  calcThumbOffset,
} from "./math";

const ELEMENT_NAME = "v-scroll",
  NO = "no",
  YES = "yes";

const SCROLL_CURSOR = `url("${scroll_icon}") 10 10, ns-resize`,
  GRAB_CURSOR = `url("${grab_icon}") 7 7, grabbing`,
  TRACK_TOP_GAP_VAR = "--v-scroll-track-top-gap",
  TRACK_BOTTOM_GAP_VAR = "--v-scroll-track-bottom-gap";

export type VScrollConfig = {
  item_height?: number;
  buffer?: number;
  render_item?: (item: unknown, index: number) => string;
};

export type VScrollState = {
  scroll_top: number;
  thumb_height: number;
  track_height: number;
  viewport_height: number;
};

export const createVScroll = (host: HTMLElement, config: VScrollConfig = {}) => {
  const shadow_root = host.shadowRoot ?? host.attachShadow({ mode: "open" }),
    { frame, viewport, slot, thumb, track } = createParts();

  void config;

  shadow_root.innerHTML = "";
  shadow_root.append(frame);

  const state: VScrollState = {
      scroll_top: 0,
      thumb_height: 0,
      track_height: 0,
      viewport_height: 0,
    };

  let drag_state: {
      pointer_id: number;
      start_client_y: number;
      start_thumb_offset: number;
    } | null = null,
    body_user_select = "",
    is_destroyed = false;

  const getVirtualHeight = () => viewport.scrollHeight;
  const toGap = (value: string, fallback: number) => {
    const parsed_value = Number.parseFloat(value);
    return Number.isFinite(parsed_value) && parsed_value >= 0 ? parsed_value : fallback;
  };
  const getTrackGaps = () => {
    const styles = getComputedStyle(host),
      top_gap = toGap(styles.getPropertyValue(TRACK_TOP_GAP_VAR), TRACK_TOP_GAP),
      bottom_gap = toGap(styles.getPropertyValue(TRACK_BOTTOM_GAP_VAR), TRACK_BOTTOM_GAP);
    return { top_gap, bottom_gap };
  };

  const syncScrollbar = () => {
    const virtual_height = getVirtualHeight(),
      { top_gap, bottom_gap } = getTrackGaps();

    state.track_height = track.clientHeight;
    state.thumb_height = calcThumbHeight({
      track_height: state.track_height,
      viewport_height: state.viewport_height,
      virtual_height,
      top_gap,
      bottom_gap,
    });

    if (state.thumb_height === 0) {
      host.dataset.scrollable = NO;
      thumb.style.display = "none";
      thumb.style.blockSize = "";
      thumb.style.cursor = "";
      thumb.style.transform = "";
      return;
    }

    host.dataset.scrollable = YES;
    thumb.style.display = "";
    thumb.style.blockSize = `${state.thumb_height}px`;
    thumb.style.cursor = drag_state ? GRAB_CURSOR : SCROLL_CURSOR;
    thumb.style.transform = `translateY(${calcThumbOffset({
      scroll_top: state.scroll_top,
      thumb_height: state.thumb_height,
      track_height: state.track_height,
      viewport_height: state.viewport_height,
      virtual_height,
      top_gap,
      bottom_gap,
    })}px)`;
  };

  const sync = () => {
    if (is_destroyed) {
      return state;
    }

    state.viewport_height = viewport.clientHeight;
    state.scroll_top = viewport.scrollTop;
    syncScrollbar();

    return state;
  };

  const handleScroll = () => {
    state.scroll_top = viewport.scrollTop;
    syncScrollbar();
  };

  const clearThumbCursor = () => {
    thumb.style.cursor = "";
  };

  const handleThumbPointerEnter = () => {};

  const handleThumbPointerLeave = () => {};

  const handleThumbPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || state.thumb_height === 0) {
      return;
    }

    const { top_gap, bottom_gap } = getTrackGaps();
    drag_state = {
      pointer_id: event.pointerId,
      start_client_y: event.clientY,
      start_thumb_offset: calcThumbOffset({
        scroll_top: state.scroll_top,
        thumb_height: state.thumb_height,
        track_height: state.track_height,
        viewport_height: state.viewport_height,
        virtual_height: getVirtualHeight(),
        top_gap,
        bottom_gap,
      }),
    };

    thumb.setPointerCapture(event.pointerId);
    body_user_select = document.body.style.userSelect;
    host.dataset.dragging = YES;
    thumb.style.cursor = GRAB_CURSOR;
    document.body.style.userSelect = "none";
  };

  const clearDrag = (pointer_id?: number) => {
    if (pointer_id !== undefined && thumb.hasPointerCapture?.(pointer_id)) {
      thumb.releasePointerCapture(pointer_id);
    }

    drag_state = null;
    host.dataset.dragging = NO;
    thumb.style.cursor = state.thumb_height > 0 ? SCROLL_CURSOR : "";
    document.body.style.userSelect = body_user_select;
    body_user_select = "";
  };

  const handleThumbPointerMove = (event: PointerEvent) => {
    if (!drag_state || drag_state.pointer_id !== event.pointerId) {
      return;
    }

    const { top_gap, bottom_gap } = getTrackGaps();
    viewport.scrollTop = calcScrollTopFromThumbOffset({
      thumb_height: state.thumb_height,
      thumb_offset: drag_state.start_thumb_offset + (event.clientY - drag_state.start_client_y),
      track_height: state.track_height,
      viewport_height: state.viewport_height,
      virtual_height: getVirtualHeight(),
      top_gap,
      bottom_gap,
    });
    handleScroll();
  };

  const handleThumbPointerUp = (event: PointerEvent) => {
    if (!drag_state || drag_state.pointer_id !== event.pointerId) {
      return;
    }

    clearDrag(event.pointerId);
  };

  const handleThumbLostPointerCapture = () => {
    if (!drag_state) {
      return;
    }

    clearDrag();
  };

  const resize_observer = new ResizeObserver(() => {
    sync();
  });
  const observed_content_nodes = new Set<Element>();
  const updateContentObservers = () => {
    const assigned_nodes = slot.assignedElements({ flatten: true });
    observed_content_nodes.forEach((node) => {
      if (!assigned_nodes.includes(node)) {
        resize_observer.unobserve(node);
        observed_content_nodes.delete(node);
      }
    });
    assigned_nodes.forEach((node) => {
      if (!observed_content_nodes.has(node)) {
        observed_content_nodes.add(node);
        resize_observer.observe(node);
      }
    });
  };

  const handleSlotChange = () => {
    updateContentObservers();
    sync();
  };

  const destroy = () => {
    if (is_destroyed) {
      return;
    }

    is_destroyed = true;
    viewport.removeEventListener("scroll", handleScroll);
    thumb.removeEventListener("pointerenter", handleThumbPointerEnter);
    thumb.removeEventListener("pointerleave", handleThumbPointerLeave);
    thumb.removeEventListener("pointerdown", handleThumbPointerDown);
    thumb.removeEventListener("pointermove", handleThumbPointerMove);
    thumb.removeEventListener("pointerup", handleThumbPointerUp);
    thumb.removeEventListener("pointercancel", handleThumbPointerUp);
    thumb.removeEventListener("lostpointercapture", handleThumbLostPointerCapture);
    slot.removeEventListener("slotchange", handleSlotChange);
    resize_observer.disconnect();
    observed_content_nodes.clear();

    if (drag_state) {
      clearDrag(drag_state.pointer_id);
    }

    clearThumbCursor();
    document.body.style.userSelect = body_user_select || document.body.style.userSelect;
  };

  viewport.addEventListener("scroll", handleScroll, { passive: true });
  thumb.addEventListener("pointerenter", handleThumbPointerEnter);
  thumb.addEventListener("pointerleave", handleThumbPointerLeave);
  thumb.addEventListener("pointerdown", handleThumbPointerDown);
  thumb.addEventListener("pointermove", handleThumbPointerMove);
  thumb.addEventListener("pointerup", handleThumbPointerUp);
  thumb.addEventListener("pointercancel", handleThumbPointerUp);
  thumb.addEventListener("lostpointercapture", handleThumbLostPointerCapture);
  slot.addEventListener("slotchange", handleSlotChange);
  resize_observer.observe(host);
  resize_observer.observe(viewport);
  updateContentObservers();
  host.dataset.dragging = NO;
  host.dataset.scrollable = NO;
  sync();

  return { destroy, state, sync };
};

export const registerVScroll = () => {
  if (customElements.get(ELEMENT_NAME)) {
    return;
  }

  customElements.define(
    ELEMENT_NAME,
    class extends HTMLElement {
      instance: ReturnType<typeof createVScroll> | null = null;

      connectedCallback() {
        this.instance ??= createVScroll(this, {
          buffer: Number.parseInt(this.getAttribute("buffer") ?? "", 10) || undefined,
          item_height: Number.parseInt(this.getAttribute("item-height") ?? "", 10) || undefined,
        });
      }

      disconnectedCallback() {
        this.instance?.destroy();
        this.instance = null;
      }
    },
  );
};

export * from "./math";
