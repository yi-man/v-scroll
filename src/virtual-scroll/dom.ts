export const createParts = () => {
  const frame = document.createElement("div"),
    viewport = document.createElement("div"),
    virtual_container = document.createElement("div"),
    items_container = document.createElement("div"),
    track = document.createElement("div"),
    thumb = document.createElement("div");

  frame.setAttribute("part", "frame");
  frame.setAttribute("data_v_scroll_frame", "yes");

  viewport.setAttribute("part", "viewport");
  viewport.setAttribute("data_v_scroll_viewport", "yes");
  viewport.style.cssText = "position: relative; block-size: 100%; overflow-y: auto;";

  virtual_container.setAttribute("part", "virtual-container");
  virtual_container.setAttribute("data_v_scroll_virtual", "yes");
  virtual_container.style.cssText = "inline-size: 100%; pointer-events: none; visibility: hidden;";

  items_container.setAttribute("part", "items-container");
  items_container.setAttribute("data_v_scroll_items", "yes");
  items_container.style.cssText = "position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 100%; will-change: transform;";

  track.setAttribute("part", "track");
  track.setAttribute("data_v_scroll_track", "yes");
  track.setAttribute("aria-hidden", "true");
  track.style.cssText = "position: absolute; inset-block: 0; inset-inline-end: 0;";

  thumb.setAttribute("part", "thumb");
  thumb.setAttribute("data_v_scroll_thumb", "yes");
  thumb.style.cssText = "inline-size: 100%;";

  frame.style.cssText = "position: relative; block-size: 100%; overflow: hidden;";

  viewport.append(virtual_container, items_container);
  track.append(thumb);
  frame.append(viewport, track);

  return { frame, viewport, virtual_container, items_container, track, thumb };
};
