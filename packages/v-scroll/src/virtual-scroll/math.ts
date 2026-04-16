export const ITEM_HEIGHT_DEFAULT = 50,
  BUFFER_DEFAULT = 3,
  THUMB_MIN_SIZE = 16,
  TRACK_TOP_GAP = 3,
  TRACK_BOTTOM_GAP = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const calcVirtualHeight = ({
  item_count,
  item_height,
}: {
  item_count: number;
  item_height: number;
}) => item_count * item_height;

export const calcVisibleRange = ({
  scroll_top,
  viewport_height,
  item_height,
  item_count,
  buffer = BUFFER_DEFAULT,
}: {
  scroll_top: number;
  viewport_height: number;
  item_height: number;
  item_count: number;
  buffer?: number;
}) => {
  if (item_count === 0) {
    return { start: 0, end: 0 };
  }

  const start_index = Math.floor(scroll_top / item_height),
    visible_count = Math.ceil(viewport_height / item_height),
    start = Math.max(0, start_index - buffer),
    end = Math.min(item_count, start_index + visible_count + buffer);

  return { start, end };
};

export const calcThumbOffset = ({
  scroll_top,
  virtual_height,
  viewport_height,
  track_height,
  thumb_height,
}: {
  scroll_top: number;
  virtual_height: number;
  viewport_height: number;
  track_height: number;
  thumb_height: number;
}) => {
  const max_scroll_top = Math.max(0, virtual_height - viewport_height),
    effective_track = Math.max(0, track_height - thumb_height),
    safe_scroll_top = clamp(scroll_top, 0, max_scroll_top);

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  return Math.round((safe_scroll_top / max_scroll_top) * effective_track);
};

export const calcScrollTopFromThumbOffset = ({
  thumb_offset,
  virtual_height,
  viewport_height,
  track_height,
  thumb_height,
}: {
  thumb_offset: number;
  virtual_height: number;
  viewport_height: number;
  track_height: number;
  thumb_height: number;
}) => {
  const max_scroll_top = Math.max(0, virtual_height - viewport_height),
    effective_track = Math.max(0, track_height - thumb_height),
    safe_thumb_offset = clamp(thumb_offset, 0, effective_track);

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  return Math.round((safe_thumb_offset / effective_track) * max_scroll_top);
};

export const calcThumbHeight = ({
  viewport_height,
  virtual_height,
  track_height,
  min_size = THUMB_MIN_SIZE,
}: {
  viewport_height: number;
  virtual_height: number;
  track_height: number;
  min_size?: number;
}) => {
  if (virtual_height <= viewport_height || track_height <= 0) {
    return 0;
  }

  const visible_ratio = viewport_height / virtual_height,
    raw_height = Math.floor(visible_ratio * track_height);

  return Math.min(track_height, Math.max(min_size, raw_height));
};
