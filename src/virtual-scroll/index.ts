import grab_icon from "../assets/grab.svg";
import scroll_icon from "../assets/scroll.svg";
import { createParts } from "./dom";
import {
  BUFFER_DEFAULT,
  ITEM_HEIGHT_DEFAULT,
  calcScrollTopFromThumbOffset,
  calcThumbHeight,
  calcThumbOffset,
  calcVirtualHeight,
  calcVisibleRange,
} from "./math";

const ELEMENT_NAME = "v-scroll",
  ITEM_CLASS = "v-scroll-item",
  NO = "no",
  YES = "yes";

const SCROLL_CURSOR = `url("${scroll_icon}") 10 10, ns-resize`,
  GRAB_CURSOR = `url("${grab_icon}") 7 7, grabbing`;

const getRenderItem = (render_item?: (item: unknown, index: number) => string) =>
  render_item ??
  ((item: unknown) => {
    if (typeof item === "string" || typeof item === "number") {
      return String(item);
    }

    if (item && typeof item === "object") {
      const entry = item as Record<string, unknown>;

      return String(entry.text ?? entry.name ?? entry.title ?? "");
    }

    return "";
  });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type VScrollConfig = {
  item_height?: number;
  buffer?: number;
  render_item?: (item: unknown, index: number) => string;
};

export type VScrollState = {
  buffer: number;
  data: unknown[];
  item_height: number;
  scroll_top: number;
  thumb_height: number;
  track_height: number;
  viewport_height: number;
};

export const createVScroll = (host: HTMLElement, config: VScrollConfig = {}) => {
  const shadow_root = host.shadowRoot ?? host.attachShadow({ mode: "open" }),
    { frame, items_container, thumb, track, viewport, virtual_container } = createParts(),
    render_item = getRenderItem(config.render_item);

  shadow_root.innerHTML = "";
  shadow_root.append(frame);

  const state: VScrollState = {
      buffer: config.buffer ?? BUFFER_DEFAULT,
      data: [],
      item_height: Math.max(1, config.item_height ?? ITEM_HEIGHT_DEFAULT),
      scroll_top: 0,
      thumb_height: 0,
      track_height: 0,
      viewport_height: 0,
    },
    item_pool: HTMLDivElement[] = [];

  let drag_state: {
      pointer_id: number;
      start_client_y: number;
      start_thumb_offset: number;
    } | null = null,
    body_user_select = "",
    is_destroyed = false;

  const ensureItemPool = (size: number) => {
    while (item_pool.length < size) {
      const item = document.createElement("div");
      item.className = ITEM_CLASS;
      item.setAttribute("part", "item");
      item.style.cssText = `position: absolute; inset-inline-start: 0; inline-size: 100%; block-size: ${state.item_height}px;`;
      item_pool.push(item);
    }
  };

  const getVirtualHeight = () =>
    calcVirtualHeight({
      item_count: state.data.length,
      item_height: state.item_height,
    });

  const renderItems = () => {
    const { end, start } = calcVisibleRange({
        buffer: state.buffer,
        item_count: state.data.length,
        item_height: state.item_height,
        scroll_top: state.scroll_top,
        viewport_height: state.viewport_height,
      }),
      visible_count = end - start;

    ensureItemPool(visible_count);

    const next_items = item_pool.slice(0, visible_count).map((item, offset) => {
      const index = start + offset,
        data_item = state.data[index];

      item.style.insetBlockStart = `${offset * state.item_height}px`;
      item.style.blockSize = `${state.item_height}px`;
      item.textContent = render_item(data_item, index);

      return item;
    });

    items_container.replaceChildren(...next_items);
    items_container.style.transform = `translateY(${start * state.item_height}px)`;
  };

  const syncVirtualHeight = () => {
    virtual_container.style.height = `${getVirtualHeight()}px`;
  };

  const syncScrollbar = () => {
    const virtual_height = getVirtualHeight();

    state.track_height = track.clientHeight;
    state.thumb_height = calcThumbHeight({
      track_height: state.track_height,
      viewport_height: state.viewport_height,
      virtual_height,
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
    })}px)`;
  };

  const sync = () => {
    if (is_destroyed) {
      return state;
    }

    state.viewport_height = viewport.clientHeight;
    state.scroll_top = viewport.scrollTop;
    renderItems();
    syncVirtualHeight();
    syncScrollbar();

    return state;
  };

  const handleScroll = () => {
    state.scroll_top = viewport.scrollTop;
    renderItems();
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

    drag_state = {
      pointer_id: event.pointerId,
      start_client_y: event.clientY,
      start_thumb_offset: calcThumbOffset({
        scroll_top: state.scroll_top,
        thumb_height: state.thumb_height,
        track_height: state.track_height,
        viewport_height: state.viewport_height,
        virtual_height: getVirtualHeight(),
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

    viewport.scrollTop = calcScrollTopFromThumbOffset({
      thumb_height: state.thumb_height,
      thumb_offset: drag_state.start_thumb_offset + (event.clientY - drag_state.start_client_y),
      track_height: state.track_height,
      viewport_height: state.viewport_height,
      virtual_height: getVirtualHeight(),
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

  const setData = (data: unknown[]) => {
    state.data = data;
    viewport.scrollTop = clamp(viewport.scrollTop, 0, Math.max(0, getVirtualHeight() - state.viewport_height));
    sync();
  };

  const setItemHeight = (item_height: number) => {
    state.item_height = Math.max(1, item_height);
    sync();
  };

  const scrollToIndex = (index: number) => {
    viewport.scrollTop = Math.max(0, index * state.item_height);
    handleScroll();
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
    resize_observer.disconnect();

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
  resize_observer.observe(host);
  resize_observer.observe(viewport);
  host.dataset.dragging = NO;
  host.dataset.scrollable = NO;
  sync();

  return { destroy, scrollToIndex, setData, setItemHeight, state, sync };
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

      get data() {
        return this.instance?.state.data ?? [];
      }

      set data(value: unknown[]) {
        this.instance?.setData(value);
      }

      scrollToIndex(index: number) {
        this.instance?.scrollToIndex(index);
      }
    },
  );
};

export * from "./math";
