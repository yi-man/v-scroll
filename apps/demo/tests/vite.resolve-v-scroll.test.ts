import { describe, expect, it } from "vitest";
import { getVScrollAlias } from "../vite.resolve-v-scroll";

describe("getVScrollAlias", () => {
  it("keeps package resolution untouched in serve mode", () => {
    expect(getVScrollAlias("serve")).toEqual([]);
  });

  it("leaves package resolution untouched in build mode", () => {
    expect(getVScrollAlias("build")).toEqual([]);
  });

  it("keeps plugin resolution on package exports in serve mode", () => {
    const alias = getVScrollAlias("serve");

    expect(alias.some((item) => String(item.find) === "v-scroll/plugin")).toBe(false);
  });
});
