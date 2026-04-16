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
  top_gap = TRACK_TOP_GAP,
  bottom_gap = TRACK_BOTTOM_GAP,
}: {
  scroll_top: number;
  virtual_height: number;
  viewport_height: number;
  track_height: number;
  thumb_height: number;
  top_gap?: number;
  bottom_gap?: number;
}) => {
  const max_scroll_top = Math.max(0, virtual_height - viewport_height),
    usable_track_height = Math.max(0, track_height - top_gap - bottom_gap),
    effective_track = Math.max(0, usable_track_height - thumb_height),
    safe_scroll_top = clamp(scroll_top, 0, max_scroll_top);

  if (max_scroll_top === 0 || effective_track === 0) {
    return top_gap;
  }

  const thumb_offset = Math.round((safe_scroll_top / max_scroll_top) * effective_track);
  return top_gap + thumb_offset;
};

export const calcScrollTopFromThumbOffset = ({
  thumb_offset,
  virtual_height,
  viewport_height,
  track_height,
  thumb_height,
  top_gap = TRACK_TOP_GAP,
  bottom_gap = TRACK_BOTTOM_GAP,
}: {
  thumb_offset: number;
  virtual_height: number;
  viewport_height: number;
  track_height: number;
  thumb_height: number;
  top_gap?: number;
  bottom_gap?: number;
}) => {
  const max_scroll_top = Math.max(0, virtual_height - viewport_height),
    usable_track_height = Math.max(0, track_height - top_gap - bottom_gap),
    effective_track = Math.max(0, usable_track_height - thumb_height),
    safe_thumb_offset = clamp(thumb_offset, top_gap, top_gap + effective_track);

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  const thumb_effective_offset = safe_thumb_offset - top_gap;
  return Math.round((thumb_effective_offset / effective_track) * max_scroll_top);
};

export const calcThumbHeight = ({
  viewport_height,
  virtual_height,
  track_height,
  top_gap = TRACK_TOP_GAP,
  bottom_gap = TRACK_BOTTOM_GAP,
  min_size = THUMB_MIN_SIZE,
}: {
  viewport_height: number;
  virtual_height: number;
  track_height: number;
  top_gap?: number;
  bottom_gap?: number;
  min_size?: number;
}) => {
  const usable_track_height = Math.max(0, track_height - top_gap - bottom_gap);

  if (virtual_height <= viewport_height || track_height <= 0 || usable_track_height <= 0) {
    return 0;
  }

  const visible_ratio = viewport_height / virtual_height,
    raw_height = Math.floor(visible_ratio * usable_track_height);

  return Math.min(usable_track_height, Math.max(min_size, raw_height));
};
