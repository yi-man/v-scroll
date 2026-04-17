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
});
