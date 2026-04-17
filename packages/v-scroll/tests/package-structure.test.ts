import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createVScroll, ensureVScrollTheme, registerVScroll } from "../src/index";
import { vScrollThemePlugin } from "../src/plugin";

describe("package structure", () => {
  it("exports only runtime public api from src/index.ts", () => {
    expect(registerVScroll).toBeTypeOf("function");
    expect(ensureVScrollTheme).toBeTypeOf("function");
    expect(createVScroll).toBeTypeOf("function");
  });

  it("does not expose math helpers from the root runtime entry", async () => {
    const mod = await import("../src/index");

    expect("calcVisibleRange" in mod).toBe(false);
    expect("BUFFER_DEFAULT" in mod).toBe(false);
  });

  it("declares dual package exports for runtime and plugin entries", async () => {
    const package_json_path = join(import.meta.dirname, "..", "package.json"),
      package_json = JSON.parse(await readFile(package_json_path, "utf8")) as {
        exports?: Record<string, { import?: string; types?: string }>;
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      },
      package_exports = package_json.exports,
      package_dependencies = package_json.dependencies,
      package_peer_dependencies = package_json.peerDependencies;

    expect(package_exports).toMatchObject({
      ".": {
        import: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
      "./plugin": {
        import: "./dist/plugin.js",
        types: "./dist/plugin.d.ts",
      },
    });
    expect(package_dependencies?.lightningcss).toBeTypeOf("string");
    expect(package_peer_dependencies?.vite).toBeTypeOf("string");
    expect(vScrollThemePlugin).toBeTypeOf("function");
  });

  it("keeps thumb cursor control in runtime instead of hardcoding pointer in themes", async () => {
    const default_theme_path = join(import.meta.dirname, "..", "src/theme/default/v-scroll.css"),
      demo_theme_path = join(import.meta.dirname, "..", "..", "..", "apps/demo/src/theme/night/v-scroll.css"),
      [default_theme_css, demo_theme_css] = await Promise.all([
        readFile(default_theme_path, "utf8"),
        readFile(demo_theme_path, "utf8"),
      ]);

    expect(default_theme_css).not.toContain("cursor: pointer;");
    expect(demo_theme_css).not.toContain("cursor: pointer;");
  });

  it("drives thumb hover theme state from explicit runtime data instead of host hover selectors", async () => {
    const default_theme_path = join(import.meta.dirname, "..", "src/theme/default/v-scroll.css"),
      default_theme_css = await readFile(default_theme_path, "utf8");

    expect(default_theme_css).toContain('&[data-thumb-hovered="yes"]::part(thumb)');
    expect(default_theme_css).not.toContain("&:hover::part(thumb)");
  });
});
