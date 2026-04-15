const ELEMENT_NAME = "v-scroll",
  FRAME_ATTR = "data_v_scroll_frame",
  TRACK_ATTR = "data_v_scroll_track",
  THUMB_ATTR = "data_v_scroll_thumb";

class VScrollElement extends HTMLElement {
  shadow_root: ShadowRoot;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.shadow_root.querySelector(`[${FRAME_ATTR}="yes"]`)) {
      return;
    }

    const frame = document.createElement("div"),
      content = document.createElement("slot"),
      track = document.createElement("b"),
      thumb = document.createElement("b");

    frame.setAttribute("part", "frame");
    frame.setAttribute(FRAME_ATTR, "yes");

    content.setAttribute("part", "content");

    track.setAttribute("part", "track");
    track.setAttribute(TRACK_ATTR, "yes");

    thumb.setAttribute("part", "thumb");
    thumb.setAttribute(THUMB_ATTR, "yes");
    track.append(thumb);

    frame.append(content, track);
    this.shadow_root.append(frame);
  }
}

export const registerVScroll = () => {
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, VScrollElement);
  }
};
