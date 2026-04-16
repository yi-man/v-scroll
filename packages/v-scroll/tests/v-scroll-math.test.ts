import { describe, expect, it } from "vitest";
import {
  BUFFER_DEFAULT,
  ITEM_HEIGHT_DEFAULT,
  THUMB_MIN_SIZE,
  calcScrollTopFromThumbOffset,
  calcThumbHeight,
  calcThumbOffset,
  calcVirtualHeight,
  calcVisibleRange,
} from "../src/virtual-scroll/math";

describe("virtual-scroll math", () => {
  describe("calcVirtualHeight", () => {
    it("returns 0 when no items", () => {
      expect(calcVirtualHeight({ item_count: 0, item_height: 50 })).toBe(0);
    });

    it("calculates total height from item count and height", () => {
      expect(calcVirtualHeight({ item_count: 100, item_height: 50 })).toBe(5000);
      expect(calcVirtualHeight({ item_count: 1000, item_height: 30 })).toBe(30000);
    });
  });

  describe("calcVisibleRange", () => {
    it("returns empty range when no items", () => {
      const result = calcVisibleRange({
        scroll_top: 0,
        viewport_height: 400,
        item_height: 50,
        item_count: 0,
        buffer: 3,
      });

      expect(result.start).toBe(0);
      expect(result.end).toBe(0);
    });

    it("calculates visible range with buffer", () => {
      const result = calcVisibleRange({
        scroll_top: 200,
        viewport_height: 400,
        item_height: 50,
        item_count: 100,
        buffer: 3,
      });

      expect(result.start).toBe(1);
      expect(result.end).toBe(15);
    });

    it("clamps range to item count", () => {
      const result = calcVisibleRange({
        scroll_top: 4800,
        viewport_height: 400,
        item_height: 50,
        item_count: 100,
        buffer: 3,
      });

      expect(result.end).toBe(100);
    });

    it("uses default buffer", () => {
      const result = calcVisibleRange({
        scroll_top: 0,
        viewport_height: 400,
        item_height: 50,
        item_count: 100,
      });

      expect(result.start).toBe(0);
      expect(result.end).toBe(11);
    });
  });

  describe("calcThumbOffset", () => {
    it("maps scroll position to thumb offset", () => {
      const result = calcThumbOffset({
        scroll_top: 2500,
        virtual_height: 5000,
        viewport_height: 400,
        track_height: 200,
        thumb_height: 40,
      });

      expect(result).toBe(87);
    });

    it("returns 0 at top", () => {
      const result = calcThumbOffset({
        scroll_top: 0,
        virtual_height: 5000,
        viewport_height: 400,
        track_height: 200,
        thumb_height: 40,
      });

      expect(result).toBe(3);
    });

    it("returns max at bottom", () => {
      const result = calcThumbOffset({
        scroll_top: 4600,
        virtual_height: 5000,
        viewport_height: 400,
        track_height: 200,
        thumb_height: 40,
      });

      expect(result).toBe(157);
    });
  });

  describe("calcScrollTopFromThumbOffset", () => {
    it("maps thumb offset to scroll position", () => {
      const result = calcScrollTopFromThumbOffset({
        thumb_offset: 87,
        virtual_height: 5000,
        viewport_height: 400,
        track_height: 200,
        thumb_height: 40,
      });

      expect(result).toBe(2509);
    });

    it("returns 0 at top", () => {
      const result = calcScrollTopFromThumbOffset({
        thumb_offset: 0,
        virtual_height: 5000,
        viewport_height: 400,
        track_height: 200,
        thumb_height: 40,
      });

      expect(result).toBe(0);
    });
  });

  describe("calcThumbHeight", () => {
    it("returns 0 when content fits viewport", () => {
      expect(
        calcThumbHeight({
          viewport_height: 400,
          virtual_height: 400,
          track_height: 180,
        }),
      ).toBe(0);
    });

    it("uses visible ratio and minimum size", () => {
      expect(
        calcThumbHeight({
          viewport_height: 10,
          virtual_height: 1000,
          track_height: 200,
        }),
      ).toBe(THUMB_MIN_SIZE);

      expect(
        calcThumbHeight({
          viewport_height: 100,
          virtual_height: 1000,
          track_height: 200,
        }),
      ).toBe(19);
    });
  });

  describe("constants", () => {
    it("exposes default constants", () => {
      expect(ITEM_HEIGHT_DEFAULT).toBe(50);
      expect(BUFFER_DEFAULT).toBe(3);
      expect(THUMB_MIN_SIZE).toBe(16);
    });
  });
});
