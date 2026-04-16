import { describe, expect, it } from "vitest";
import {
  TRACK_BOTTOM_GAP,
  TRACK_TOP_GAP,
  getScrollTopFromThumbOffset,
  getThumbOffset,
  getThumbSize,
} from "../src/elements/v-scroll-math";

describe("v-scroll math", () => {
  it("returns zero thumb size when content does not overflow", () => {
    expect(getThumbSize({ track_size: 200, client_size: 200, scroll_size: 200 })).toBe(0);
  });

  it("uses the visible ratio and minimum size for thumb height", () => {
    expect(getThumbSize({ track_size: 200, client_size: 100, scroll_size: 1000 })).toBe(19);
    expect(getThumbSize({ track_size: 200, client_size: 300, scroll_size: 600 })).toBe(97);
  });

  it("maps scrollTop into the effective track range", () => {
    const thumb_size = 40;

    expect(
      getThumbOffset({
        track_size: 200,
        thumb_size,
        client_size: 300,
        scroll_size: 900,
        scroll_top: 300,
      }),
    ).toBe(77);
  });

  it("maps thumb offset back to scrollTop with track gaps applied", () => {
    expect(
      getScrollTopFromThumbOffset({
        track_size: 200,
        thumb_size: 40,
        client_size: 300,
        scroll_size: 900,
        thumb_offset: 154,
      }),
    ).toBe(600);
  });

  it("exposes the PDF gap constants", () => {
    expect(TRACK_TOP_GAP).toBe(3);
    expect(TRACK_BOTTOM_GAP).toBe(3);
  });
});
