export const createParts = () => {
  const frame = document.createElement("div"),
    viewport = document.createElement("div"),
    slot = document.createElement("slot"),
    track = document.createElement("div"),
    thumb = document.createElement("div");

  frame.setAttribute("part", "frame");
  frame.setAttribute("data_v_scroll_frame", "yes");

  viewport.setAttribute("part", "viewport");
  viewport.setAttribute("data_v_scroll_viewport", "yes");
  viewport.append(slot);

  track.setAttribute("part", "track");
  track.setAttribute("data_v_scroll_track", "yes");
  track.setAttribute("aria-hidden", "true");

  thumb.setAttribute("part", "thumb");
  thumb.setAttribute("data_v_scroll_thumb", "yes");

  track.append(thumb);
  frame.append(viewport, track);

  return { frame, viewport, slot, track, thumb };
};
