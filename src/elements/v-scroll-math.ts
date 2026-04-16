export const TRACK_TOP_GAP = 3,
  TRACK_BOTTOM_GAP = 3,
  MIN_THUMB_SIZE = 16;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getUsableTrackSize = (track_size: number) => Math.max(0, track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP);

const getMaxScrollTop = (client_size: number, scroll_size: number) => Math.max(0, scroll_size - client_size);

export const getThumbSize = ({
  track_size,
  client_size,
  scroll_size,
}: {
  track_size: number;
  client_size: number;
  scroll_size: number;
}) => {
  if (scroll_size <= client_size || track_size <= 0) {
    return 0;
  }

  const usable_track = getUsableTrackSize(track_size),
    raw_size = Math.floor((client_size / scroll_size) * usable_track);

  return Math.min(usable_track, Math.max(MIN_THUMB_SIZE, raw_size));
};

export const getThumbOffset = ({
  track_size,
  thumb_size,
  client_size,
  scroll_size,
  scroll_top,
}: {
  track_size: number;
  thumb_size: number;
  client_size: number;
  scroll_size: number;
  scroll_top: number;
}) => {
  const max_scroll_top = getMaxScrollTop(client_size, scroll_size),
    effective_track = Math.max(0, track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP - thumb_size),
    safe_scroll_top = clamp(scroll_top, 0, max_scroll_top);

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  return Math.round((safe_scroll_top / max_scroll_top) * effective_track);
};

export const getScrollTopFromThumbOffset = ({
  track_size,
  thumb_size,
  client_size,
  scroll_size,
  thumb_offset,
}: {
  track_size: number;
  thumb_size: number;
  client_size: number;
  scroll_size: number;
  thumb_offset: number;
}) => {
  const max_scroll_top = getMaxScrollTop(client_size, scroll_size),
    effective_track = Math.max(0, track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP - thumb_size),
    safe_offset = clamp(thumb_offset, 0, effective_track);

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  return Math.round((safe_offset / effective_track) * max_scroll_top);
};
