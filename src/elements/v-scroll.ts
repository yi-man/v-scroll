import grab_icon from "../assets/grab.svg";

const ELEMENT_NAME = "v-scroll",
  FRAME_ATTR = "data_v_scroll_frame",
  VIEWPORT_ATTR = "data_v_scroll_viewport",
  TRACK_ATTR = "data_v_scroll_track",
  THUMB_ATTR = "data_v_scroll_thumb",
  GRAB_ATTR = "data_v_scroll_grab";

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

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
  }

  connectedCallback() {
    if (!this.parts) {
      this.parts = createParts();
      this.shadow_root.append(this.parts.frame);
    }
  }
}

export const registerVScroll = () => {
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, VScrollElement);
  }
};
