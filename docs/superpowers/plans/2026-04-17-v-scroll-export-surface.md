# v-scroll Export Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `v-scroll` so runtime consumers use only `v-scroll`, Vite consumers use only `v-scroll/plugin`, internal math/theme implementation details stop leaking through the package root, and all theme assets live under `src/`.

**Architecture:** Split the package into two public entry points: `src/index.ts` for browser/runtime APIs and `src/plugin.ts` for the Vite plugin. Move the plugin implementation and both package/demo theme sources under `src/`, keep theme generation internal to the package, and update tests so public-surface assertions only cover exported APIs while internal tests continue importing internal modules directly.

**Tech Stack:** Bun, TypeScript, Vite, Vitest, happy-dom

---

### Task 1: Move plugin and theme sources under `src/`

**Files:**
- Create: `packages/v-scroll/src/plugin.ts`
- Create: `packages/v-scroll/src/plugins/vscroll-theme.ts`
- Create: `packages/v-scroll/src/theme/default/v-scroll.d.ts`
- Modify: `packages/v-scroll/src/index.ts`
- Modify: `packages/v-scroll/src/vite-env.d.ts`
- Modify: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`
- Modify: `apps/demo/vite.config.ts`
- Modify: `apps/demo/src/main.ts`
- Test: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`

- [ ] **Step 1: Write the failing import-path tests for the new source layout**

Update `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts` so custom-theme cases target the new demo path, and package-root cases target the new package theme path:

```ts
it("injects an import map for a configured custom theme html path", async () => {
  await mkdir(join(root_dir, "src/theme/night"), { recursive: true });
  await writeFile(join(root_dir, "src/theme/night/v-scroll.css"), ":root {\n  --color: blue;\n}\n", "utf8");

  const plugin = vScrollThemePlugin({
    css_source_path: "src/theme/night/v-scroll.css",
    generated_module_path: "public/themes/night/v-scroll.js",
  });
```

Also change every package-default test fixture from:

```ts
join(root_dir, "themes/default/v-scroll.css")
join(root_dir, "themes/default/v-scroll.js")
join(root_dir, "dist/themes/default/v-scroll.js")
```

to:

```ts
join(root_dir, "src/theme/default/v-scroll.css")
join(root_dir, "src/theme/default/v-scroll.js")
join(root_dir, "dist/theme/default/v-scroll.js")
```

- [ ] **Step 2: Run the plugin test to verify RED**

Run: `bunx vitest run --config vitest.config.ts tests/vite-plugin-vscroll-theme.test.ts`
Expected: FAIL because the source files and plugin import path have not moved yet.

- [ ] **Step 3: Move the plugin implementation into `src/` and create the plugin entry**

Create `packages/v-scroll/src/plugin.ts`:

```ts
export { vScrollThemePlugin } from "./plugins/vscroll-theme";
```

Create `packages/v-scroll/src/plugins/vscroll-theme.ts` using the current plugin implementation, but change the default source/module paths to the new `src/theme/default` location:

```ts
const CSS_SOURCE_PATH_DEFAULT = "src/theme/default/v-scroll.css",
  GENERATED_MODULE_PATH_DEFAULT = "src/theme/default/v-scroll.js",
  PUBLIC_DIR_PREFIX = "public/",
  THEME_MODULE_FILENAME = "v-scroll.js",
  THEME_MODULE_SPECIFIER = "$/v-scroll.js";
```

Update `apps/demo/vite.config.ts` to consume the plugin from the new source entry while the package export is not built yet:

```ts
import { defineConfig } from "vite";
import { vScrollThemePlugin } from "../../packages/v-scroll/src/plugin";
import { getVScrollAlias } from "./vite.resolve-v-scroll";

export default defineConfig(({ command }) => ({
  plugins: [
    vScrollThemePlugin({
      css_source_path: "src/theme/night/v-scroll.css",
      generated_module_path: "public/themes/night/v-scroll.js",
    }),
  ],
  resolve: {
    alias: getVScrollAlias(command === "serve" ? "serve" : "build"),
  },
}));
```

Move the package default-theme declaration into `packages/v-scroll/src/theme/default/v-scroll.d.ts`:

```ts
declare const css_text: string;
export default css_text;
```

Update `packages/v-scroll/src/index.ts` and `packages/v-scroll/src/vite-env.d.ts` to import and declare the new internal path:

```ts
import default_theme_css from "./theme/default/v-scroll.js";
```

```ts
declare module "./theme/default/v-scroll.js" {
  const css_text: string;
  export default css_text;
}
```

- [ ] **Step 4: Move the theme files into `src/`**

Move:

```bash
mkdir -p packages/v-scroll/src/theme/default apps/demo/src/theme/night
mv packages/v-scroll/themes/default/v-scroll.css packages/v-scroll/src/theme/default/v-scroll.css
mv packages/v-scroll/themes/default/v-scroll.js packages/v-scroll/src/theme/default/v-scroll.js
mv packages/v-scroll/themes/default/v-scroll.d.ts packages/v-scroll/src/theme/default/v-scroll.d.ts
mv apps/demo/themes/night/v-scroll.css apps/demo/src/theme/night/v-scroll.css
```

- [ ] **Step 5: Run the plugin test to verify GREEN**

Run: `bunx vitest run --config vitest.config.ts tests/vite-plugin-vscroll-theme.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit the layout migration**

```bash
git add packages/v-scroll/src/plugin.ts packages/v-scroll/src/plugins/vscroll-theme.ts packages/v-scroll/src/theme/default packages/v-scroll/src/index.ts packages/v-scroll/src/vite-env.d.ts packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts apps/demo/src/theme/night/v-scroll.css apps/demo/vite.config.ts
git commit -m "refactor: move plugin and themes under src"
```

### Task 2: Add dual package exports and build both entry points

**Files:**
- Modify: `packages/v-scroll/package.json`
- Modify: `packages/v-scroll/vite.config.ts`
- Modify: `packages/v-scroll/tsconfig.build.json`
- Modify: `apps/demo/vite.config.ts`
- Test: `packages/v-scroll/tests/package-structure.test.ts`

- [ ] **Step 1: Write the failing public-surface test for the plugin entry**

Update `packages/v-scroll/tests/package-structure.test.ts` to assert only runtime APIs on the root entry and add a plugin-entry import:

```ts
import { describe, expect, it } from "vitest";
import { createVScroll, ensureVScrollTheme, registerVScroll } from "../src/index";
import { vScrollThemePlugin } from "../src/plugin";

describe("package structure", () => {
  it("exports only runtime public api from src/index.ts", () => {
    expect(registerVScroll).toBeTypeOf("function");
    expect(ensureVScrollTheme).toBeTypeOf("function");
    expect(createVScroll).toBeTypeOf("function");
  });

  it("exports the vite plugin from src/plugin.ts", () => {
    expect(vScrollThemePlugin).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run the package-structure test to verify RED**

Run: `bunx vitest run --config vitest.config.ts tests/package-structure.test.ts`
Expected: FAIL after later tasks remove the root math exports but before package build/consumer config is updated.

- [ ] **Step 3: Update package exports and build config for dual entry points**

Change `packages/v-scroll/package.json`:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./plugin": {
      "import": "./dist/plugin.js",
      "types": "./dist/plugin.d.ts"
    }
  }
}
```

Change `packages/v-scroll/vite.config.ts` to build both source entry files:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./src/plugin";

export default defineConfig({
  plugins: [vScrollThemePlugin()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        plugin: resolve(__dirname, "src/plugin.ts"),
      },
      formats: ["es"],
      fileName: (_format, entry_name) => `${entry_name}.js`,
    },
    outDir: "dist",
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

`packages/v-scroll/tsconfig.build.json` can remain rooted at `src`, but confirm `src/plugin.ts` is included by leaving:

```json
{
  "include": ["src"]
}
```

Update `apps/demo/vite.config.ts` to consume the built package subpath in build mode:

```ts
import { defineConfig } from "vite";
import { vScrollThemePlugin } from "v-scroll/plugin";
import { getVScrollAlias } from "./vite.resolve-v-scroll";

export default defineConfig(({ command }) => ({
  plugins: [
    vScrollThemePlugin({
      css_source_path: "src/theme/night/v-scroll.css",
      generated_module_path: "public/themes/night/v-scroll.js",
    }),
  ],
  resolve: {
    alias: getVScrollAlias(command === "serve" ? "serve" : "build"),
  },
}));
```

- [ ] **Step 4: Run the package-structure test to verify GREEN**

Run: `bunx vitest run --config vitest.config.ts tests/package-structure.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the dual-entry packaging change**

```bash
git add packages/v-scroll/package.json packages/v-scroll/vite.config.ts packages/v-scroll/tsconfig.build.json packages/v-scroll/tests/package-structure.test.ts apps/demo/vite.config.ts
git commit -m "build: add separate plugin package entry"
```

### Task 3: Shrink the root runtime exports to the required public API

**Files:**
- Modify: `packages/v-scroll/src/index.ts`
- Modify: `packages/v-scroll/src/virtual-scroll/index.ts`
- Modify: `packages/v-scroll/tests/package-structure.test.ts`
- Modify: `packages/v-scroll/tests/v-scroll-math.test.ts`
- Modify: `packages/v-scroll/tests/public-api.test.ts`
- Test: `packages/v-scroll/tests/package-structure.test.ts`
- Test: `packages/v-scroll/tests/v-scroll-math.test.ts`

- [ ] **Step 1: Write the failing regression for removed math exports**

Add this to `packages/v-scroll/tests/package-structure.test.ts`:

```ts
it("does not expose math helpers from the root runtime entry", async () => {
  const mod = await import("../src/index");

  expect("calcVisibleRange" in mod).toBe(false);
  expect("BUFFER_DEFAULT" in mod).toBe(false);
});
```

Move the math tests off the package root by updating `packages/v-scroll/tests/v-scroll-math.test.ts` imports from `../src/index` to:

```ts
import {
  BUFFER_DEFAULT,
  ITEM_HEIGHT_DEFAULT,
  THUMB_MIN_SIZE,
  TRACK_BOTTOM_GAP,
  TRACK_TOP_GAP,
  calcScrollTopFromThumbOffset,
  calcThumbHeight,
  calcThumbOffset,
  calcVirtualHeight,
  calcVisibleRange,
} from "../src/virtual-scroll/math";
```

- [ ] **Step 2: Run the public-surface and math tests to verify RED**

Run: `bunx vitest run --config vitest.config.ts tests/package-structure.test.ts tests/v-scroll-math.test.ts`
Expected: FAIL because the root entry still exports math.

- [ ] **Step 3: Remove the redundant math re-exports**

Update `packages/v-scroll/src/index.ts` to:

```ts
import { ensureThemeCss } from "./runtime/inject-theme-css";
import default_theme_css from "./theme/default/v-scroll.js";

export { createVScroll, registerVScroll } from "./virtual-scroll";
export type { VScrollConfig, VScrollState } from "./virtual-scroll";

const THEME_MODULE_SPECIFIER = "$/v-scroll.js";

const importThemeCss = async (specifier: string) =>
  (await import(
    /* @vite-ignore */
    specifier
  ))?.default as string;

const loadThemeCss = async () => await importThemeCss(THEME_MODULE_SPECIFIER).catch(async () => default_theme_css);

export const ensureVScrollTheme = async () => ensureThemeCss(await loadThemeCss());
```

Remove the redundant re-export from `packages/v-scroll/src/virtual-scroll/index.ts` by deleting:

```ts
export * from "./math";
```

- [ ] **Step 4: Run the public-surface and math tests to verify GREEN**

Run: `bunx vitest run --config vitest.config.ts tests/package-structure.test.ts tests/v-scroll-math.test.ts tests/public-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the export-surface cleanup**

```bash
git add packages/v-scroll/src/index.ts packages/v-scroll/src/virtual-scroll/index.ts packages/v-scroll/tests/package-structure.test.ts packages/v-scroll/tests/v-scroll-math.test.ts packages/v-scroll/tests/public-api.test.ts
git commit -m "refactor: narrow v-scroll runtime exports"
```

### Task 4: Update demo consumption and run full verification

**Files:**
- Modify: `apps/demo/src/main.ts`
- Modify: `apps/demo/tests/vite.resolve-v-scroll.test.ts`
- Verify: `apps/demo/dist/index.html`
- Verify: `packages/v-scroll/dist/index.js`
- Verify: `packages/v-scroll/dist/plugin.js`

- [ ] **Step 1: Write the failing demo config regression test**

Extend `apps/demo/tests/vite.resolve-v-scroll.test.ts` with a path assertion for the runtime alias only:

```ts
it("keeps plugin resolution on package exports in serve mode", () => {
  const alias = getVScrollAlias("serve");

  expect(alias.some((item) => String(item.find) === "v-scroll/plugin")).toBe(false);
});
```

This locks in that only the runtime entry is source-aliased during serve; the plugin stays on its own import path.

- [ ] **Step 2: Run the demo config test to verify RED if aliasing regresses**

Run: `bunx vitest run --config vitest.config.ts tests/vite.resolve-v-scroll.test.ts`
Expected: PASS now, and remain PASS after the config changes. This step is the guardrail before final integration.

- [ ] **Step 3: Update the demo runtime import if needed and build the package**

Keep `apps/demo/src/main.ts` on the runtime entry only:

```ts
import { ensureVScrollTheme, registerVScroll } from "v-scroll";
import { createDemoData } from "./demo-data";
```

Then run:

```bash
bun run --cwd packages/v-scroll build
```

Expected: PASS and create `packages/v-scroll/dist/index.js`, `packages/v-scroll/dist/plugin.js`, `packages/v-scroll/dist/index.d.ts`, and `packages/v-scroll/dist/plugin.d.ts`.

- [ ] **Step 4: Run full repository verification**

Run: `./build.sh`
Expected: PASS for root check, package tests, demo tests, package build, and demo build.

- [ ] **Step 5: Run real-browser verification**

Run:

```bash
bun run dev:demo -- --host 127.0.0.1
```

Verify in the browser:

- `http://127.0.0.1:5173/` loads
- `GET /themes/night/v-scroll.js` returns `200`
- the demo still renders the custom dark theme

Then run:

```bash
bunx vite preview --config vite.config.ts --host 127.0.0.1 --port 4173
```

from `apps/demo/`, and verify:

- `http://127.0.0.1:4173/` loads
- `apps/demo/dist/index.html` contains `{"imports":{"$/v-scroll.js":"/themes/night/v-scroll.js"}}`
- `GET /themes/night/v-scroll.js` returns `200`

- [ ] **Step 6: Commit the demo and verification changes**

```bash
git add apps/demo/src/main.ts apps/demo/tests/vite.resolve-v-scroll.test.ts apps/demo/dist/index.html packages/v-scroll/dist
git commit -m "test: verify v-scroll runtime and plugin entrypoints"
```

---

## Spec Coverage Check

- Root runtime API narrowed to initialization-only: Task 3
- Separate `v-scroll/plugin` entry: Task 2
- Plugin moved out of `scripts/` and into `src/`: Task 1
- Default theme moved under `packages/v-scroll/src/`: Task 1
- Demo theme moved under `apps/demo/src/`: Task 1
- Package exports/build outputs updated for dual entry: Task 2
- Public vs internal tests separated: Tasks 2 and 3
- `dev`/`build`/browser verification preserved: Task 4

## Placeholder Scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- Each task includes exact files, commands, and code snippets.

## Type Consistency Check

- Runtime root exports stay `registerVScroll`, `createVScroll`, `ensureVScrollTheme`, `VScrollConfig`, `VScrollState`.
- Plugin subpath export stays `vScrollThemePlugin`.
- Theme module import contract remains `$/v-scroll.js` throughout runtime, plugin injection, and browser verification.
