import { describe, expect, it } from "vitest";
import { getVScrollAlias } from "../vite.resolve-v-scroll";

describe("getVScrollAlias", () => {
  it("aliases the package name to source in serve mode", () => {
    const alias = getVScrollAlias("serve");

    expect(alias).toHaveLength(1);
    expect(alias[0]?.find).toBe("v-scroll");
    expect(String(alias[0]?.replacement)).toMatch(
      /packages\/v-scroll\/src\/index\.ts$/,
    );
  });

  it("leaves package resolution untouched in build mode", () => {
    expect(getVScrollAlias("build")).toEqual([]);
  });
});
