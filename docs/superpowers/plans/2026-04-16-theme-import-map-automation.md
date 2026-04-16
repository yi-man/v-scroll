# Theme Import Map Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `v-scroll` use its built-in default theme with zero caller setup, while letting callers opt into a custom theme by configuring a Vite plugin that compiles CSS to JS and automatically injects the required import map in both dev and build.

**Architecture:** Keep the runtime contract in the package: `ensureVScrollTheme()` first checks for an import map and otherwise falls back to the built-in default theme. Extend the existing Vite theme plugin so callers can opt into a custom theme by declaring the CSS source plus the public module URL; the plugin will generate the JS module, inject the import map into HTML, and keep dev/build behavior aligned. Cover both paths with tests at the package/plugin layer and validate the demo in a real browser.

**Tech Stack:** Bun, Vite, TypeScript, Vitest, happy-dom, native import maps

---

### Task 1: Lock the expected behavior with failing tests

**Files:**
- Modify: `packages/v-scroll/tests/public-api.test.ts`
- Modify: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`
- Test: `packages/v-scroll/tests/public-api.test.ts`
- Test: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`

- [ ] **Step 1: Add a package-level fallback test**

```ts
it("uses the built-in default theme when no theme import map is present", async () => {
  document.head.innerHTML = "";

  const style_node = await ensureVScrollTheme();

  expect(style_node.dataset.vScrollTheme).toBe("default");
  expect(style_node.textContent).toContain("--v-scroll-frame-bg");
});
```

- [ ] **Step 2: Add plugin tests for auto import-map injection**

```ts
it("does not inject an import map when html injection is not configured", async () => {
  const plugin = vScrollThemePlugin();

  await callHook(plugin, "configResolved", {
    root: root_dir,
    build: { outDir: "dist" },
  });

  await expect(callHook(plugin, "transformIndexHtml", "/index.html", "<html><head></head><body></body></html>")).resolves.toBeUndefined();
});

it("injects an import map that points $/ to the configured public theme directory", async () => {
  const plugin = vScrollThemePlugin({
    css_source_path: "themes/night/v-scroll.css",
    generated_module_path: "public/themes/night/v-scroll.js",
    html_import_map_path: "/themes/night/",
  });

  await callHook(plugin, "configResolved", {
    root: root_dir,
    build: { outDir: "dist" },
  });

  const html = await callHook(plugin, "transformIndexHtml", "/index.html", "<html><head><title>x</title></head><body></body></html>");

  expect(String(html)).toContain('"$/": "/themes/night/"');
});
```

- [ ] **Step 3: Run the targeted tests and verify RED**

Run: `bunx vitest run --config packages/v-scroll/vitest.config.ts packages/v-scroll/tests/public-api.test.ts packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`
Expected: FAIL because the plugin currently cannot inject import maps and the new expectations are not implemented yet.

### Task 2: Extend the plugin with opt-in HTML injection

**Files:**
- Modify: `packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts`
- Modify: `apps/demo/vite.config.ts`
- Test: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`

- [ ] **Step 1: Add opt-in plugin options for HTML import-map injection**

```ts
type VScrollThemePluginOptions = {
  css_source_path?: string;
  generated_module_path?: string;
  html_import_map_path?: string;
};
```

- [ ] **Step 2: Inject the import map through `transformIndexHtml` only when configured**

```ts
transformIndexHtml(html) {
  if (!html_import_map_path) {
    return;
  }

  return {
    html,
    tags: [
      {
        tag: "script",
        attrs: { type: "importmap" },
        children: JSON.stringify({
          imports: {
            "$/": html_import_map_path,
          },
        }, null, 2),
        injectTo: "head-prepend",
      },
    ],
  };
}
```

- [ ] **Step 3: Restore demo-side custom theme configuration through the plugin**

```ts
plugins: [
  vScrollThemePlugin({
    css_source_path: "themes/night/v-scroll.css",
    generated_module_path: "public/themes/night/v-scroll.js",
    html_import_map_path: "/themes/night/",
  }),
],
```

- [ ] **Step 4: Run the targeted tests and verify GREEN**

Run: `bunx vitest run --config packages/v-scroll/vitest.config.ts packages/v-scroll/tests/public-api.test.ts packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`
Expected: PASS.

### Task 3: Verify end-to-end in build and a real browser

**Files:**
- Verify: `apps/demo/index.html`
- Verify: `apps/demo/dist/index.html`
- Verify: `apps/demo/dist/themes/night/v-scroll.js`

- [ ] **Step 1: Run the full repository verification script**

Run: `./build.sh`
Expected: PASS for check, test, and build.

- [ ] **Step 2: Verify dev mode in a real browser**

Run: `bun run dev:demo`
Then confirm in a browser that:
- the page loads without manual import-map edits
- `document.querySelector('script[type="importmap"]')` exists
- the injected import map maps `$/` to `/themes/night/`
- the style tag injected by `ensureVScrollTheme()` contains the custom theme CSS

- [ ] **Step 3: Verify build output in a real browser**

Run: `bun run build && bunx vite preview --config apps/demo/vite.config.ts --host 127.0.0.1 --port 4173`
Then confirm in a browser that:
- the built page loads successfully
- `apps/demo/dist/index.html` contains the injected import map
- `apps/demo/dist/themes/night/v-scroll.js` exists and is requested successfully
- the page uses the custom theme without any manual HTML edits
