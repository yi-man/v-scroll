# v-scroll Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a bun-based TypeScript Vite project for the `v-scroll` assignment with a runnable demo, placeholder custom element, theme import pipeline, root `AGENTS.md`, and verification scripts, without implementing virtual scrollbar behavior.

**Architecture:** Keep everything in one Vite app repository so the demo page, component placeholder, theme source, generated theme module, and Vite plugin can evolve together. Use a generated `src/theme-imports/v-scroll.js` module for the browser `importmap` contract, while keeping the rest of the authoring surface in TypeScript.

**Tech Stack:** bun, TypeScript, Vite, Vitest, happy-dom, lightningcss, native Web Components, native CSS nesting

---

## File Map

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `bun.lock`
- Create: `vite.config.ts`
- Create: `build.sh`
- Create: `AGENTS.md`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/demo/seed-content.ts`
- Create: `src/elements/v-scroll.ts`
- Create: `src/runtime/inject-theme-css.ts`
- Create: `src/theme-imports/.gitkeep`
- Create: `src/vite-env.d.ts`
- Create: `themes/default/v-scroll.css`
- Create: `scripts/vite-plugin-vscroll-theme.ts`
- Create: `tests/vite-plugin-vscroll-theme.test.ts`
- Create: `tests/inject-theme-css.test.ts`
- Create: `tests/v-scroll.test.ts`
- Create: `tests/setup.ts`

## Notes Before Execution

- `src/theme-imports/v-scroll.js` is a generated file written by the Vite plugin. Do not hand-edit it.
- The repository is already a git repository with one spec commit. Continue from that state.
- The initialization target is intentionally narrow. Do not add real scrolling behavior, `ResizeObserver`, pointer capture, deployment config, or framework code.

### Task 1: Bootstrap bun, TypeScript, and Vite

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `bun.lock`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Write the failing package and compiler baseline**

```json
{
  "name": "v-scroll",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "happy-dom": "^16.0.0",
    "lightningcss": "^1.29.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "$/*": ["src/theme-imports/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "tests", "vite.config.ts"]
}
```

```gitignore
node_modules
dist
coverage
src/theme-imports/v-scroll.js
```

```ts
/// <reference types="vite/client" />

declare module "$/v-scroll.js" {
  const css_text: string;
  export default css_text;
}
```

- [ ] **Step 2: Run install and typecheck to verify the repository is not yet buildable**

Run: `bun install && bun run check`  
Expected: `bun install` succeeds, then `bun run check` fails because `vite.config.ts` and app source files do not exist yet.

- [ ] **Step 3: Commit the tooling baseline**

```bash
git add package.json tsconfig.json .gitignore bun.lock src/vite-env.d.ts
git commit -m "chore: add bun and typescript baseline"
```

### Task 2: Add Vite config, plugin hook, and build entrypoint

**Files:**
- Create: `vite.config.ts`
- Create: `build.sh`
- Create: `scripts/vite-plugin-vscroll-theme.ts`
- Create: `tests/setup.ts`
- Test: `tests/vite-plugin-vscroll-theme.test.ts`

- [ ] **Step 1: Write the failing plugin test**

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vScrollThemePlugin } from "../scripts/vite-plugin-vscroll-theme";

describe("vScrollThemePlugin", () => {
  let root_dir = "";

  beforeEach(async () => {
    root_dir = await mkdtemp(join(tmpdir(), "v-scroll-plugin-"));
    await mkdir(join(root_dir, "themes/default"), { recursive: true });
    await mkdir(join(root_dir, "src/theme-imports"), { recursive: true });
  });

  afterEach(async () => {
    if (root_dir) {
      await rm(root_dir, { recursive: true, force: true });
    }
  });

  it("writes a minified javascript theme module during config resolution", async () => {
    await writeFile(
      join(root_dir, "themes/default/v-scroll.css"),
      "/* c */\n:root {\n  --color: red;\n}\n",
      "utf8",
    );

    const plugin = vScrollThemePlugin();
    await plugin.configResolved?.({
      root: root_dir,
    } as never);

    const generated_code = await readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8");

    expect(generated_code).toBe('export default ":root{--color:red}";\n');
  });
});
```

- [ ] **Step 2: Run the plugin test to verify it fails**

Run: `bun run test tests/vite-plugin-vscroll-theme.test.ts`  
Expected: FAIL with a module resolution or missing export error because the plugin file does not exist yet.

- [ ] **Step 3: Write the plugin, vite config, and build script**

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { transform } from "lightningcss";
import type { Plugin } from "vite";

const CSS_SOURCE_PATH = "themes/default/v-scroll.css",
  GENERATED_MODULE_PATH = "src/theme-imports/v-scroll.js";

const toThemeModule = (css_text: string) => `export default ${JSON.stringify(css_text)};\n`;

export const vScrollThemePlugin = (): Plugin => ({
  name: "v-scroll-theme-plugin",
  async configResolved(config) {
    const source_path = join(config.root, CSS_SOURCE_PATH),
      output_path = join(config.root, GENERATED_MODULE_PATH),
      source_css = await readFile(source_path, "utf8"),
      result = transform({
        filename: source_path,
        code: Buffer.from(source_css),
        minify: true,
      }),
      module_code = toThemeModule(result.code.toString());

    await mkdir(dirname(output_path), { recursive: true });
    await writeFile(output_path, module_code, "utf8");
  },
});
```

```ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./scripts/vite-plugin-vscroll-theme";

export default defineConfig({
  resolve: {
    alias: {
      "$/": fileURLToPath(new URL("./src/theme-imports/", import.meta.url)),
    },
  },
  plugins: [vScrollThemePlugin()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

```bash
#!/usr/bin/env bash
set -euo pipefail

bun run check
bun run test
bun run build
```

```ts
export {};
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `bun run test tests/vite-plugin-vscroll-theme.test.ts`  
Expected: PASS with `1 passed`.

- [ ] **Step 5: Make the build script executable**

Run: `chmod +x build.sh`  
Expected: no output.

- [ ] **Step 6: Commit the plugin pipeline**

```bash
git add vite.config.ts build.sh scripts/vite-plugin-vscroll-theme.ts tests/setup.ts tests/vite-plugin-vscroll-theme.test.ts
git commit -m "build: add theme generation plugin"
```

### Task 3: Add shared test setup and CSS injection runtime

**Files:**
- Modify: `tests/setup.ts`
- Create: `tests/inject-theme-css.test.ts`
- Create: `src/runtime/inject-theme-css.ts`

- [ ] **Step 1: Write the failing runtime test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ensureThemeCss } from "../src/runtime/inject-theme-css";

describe("ensureThemeCss", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects one style tag and deduplicates repeat calls", () => {
    ensureThemeCss(":root{--demo:1}");
    ensureThemeCss(":root{--demo:1}");

    const style_nodes = document.head.querySelectorAll('style[data-v-scroll-theme="default"]');

    expect(style_nodes).toHaveLength(1);
    expect(style_nodes[0]?.textContent).toBe(":root{--demo:1}");
  });
});
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run: `bun run test tests/inject-theme-css.test.ts`  
Expected: FAIL because `src/runtime/inject-theme-css.ts` does not exist yet.

- [ ] **Step 3: Write the test setup and runtime module**

```ts
import { afterEach } from "vitest";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});
```

```ts
const THEME_SELECTOR = 'style[data-v-scroll-theme="default"]';

export const ensureThemeCss = (css_text: string) => {
  const existing_node = document.head.querySelector<HTMLStyleElement>(THEME_SELECTOR);

  if (existing_node) {
    if (existing_node.textContent !== css_text) {
      existing_node.textContent = css_text;
    }

    return existing_node;
  }

  const style_node = document.createElement("style");

  style_node.dataset.vScrollTheme = "default";
  style_node.textContent = css_text;
  document.head.append(style_node);

  return style_node;
};
```

- [ ] **Step 4: Run the runtime test and verify it passes**

Run: `bun run test tests/inject-theme-css.test.ts`  
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the runtime layer**

```bash
git add tests/setup.ts tests/inject-theme-css.test.ts src/runtime/inject-theme-css.ts
git commit -m "test: add theme injection runtime"
```

### Task 4: Add theme source and import contract

**Files:**
- Create: `themes/default/v-scroll.css`
- Create: `src/theme-imports/.gitkeep`

- [ ] **Step 1: Write the raw theme source**

```css
:root {
  --v_scroll_frame_bg: linear-gradient(180deg, #f7f4ef 0%, #ede5d6 100%);
  --v_scroll_frame_border: #c8baa2;
  --v_scroll_text: #2c2418;
  --v_scroll_track_bg: rgb(99 77 40 / 12%);
  --v_scroll_thumb_bg: #6b5939;
  --v_scroll_thumb_hover_bg: #4f422b;
  --v_scroll_thumb_active_bg: #342b1d;
}

v-scroll {
  display: block;
  color: var(--v_scroll_text);
}

v-scroll > article,
v-scroll > article h2,
v-scroll > article p,
v-scroll > article section {
  margin: 0;
}

v-scroll > article > section + section {
  margin-block-start: 16px;
}

v-scroll::part(frame) {
  min-block-size: 320px;
  padding: 24px;
  border: 1px solid var(--v_scroll_frame_border);
  border-radius: 24px;
  background: var(--v_scroll_frame_bg);
  box-shadow: 0 24px 60px rgb(73 53 21 / 12%);
}

v-scroll::part(track) {
  inline-size: 12px;
  border-radius: 999px;
  background: var(--v_scroll_track_bg);
}

v-scroll::part(thumb) {
  inline-size: 12px;
  min-block-size: 48px;
  border-radius: 999px;
  background: var(--v_scroll_thumb_bg);
  transition: background-color 160ms ease;
}

v-scroll:hover::part(thumb) {
  background: var(--v_scroll_thumb_hover_bg);
}

v-scroll[data_dragging="yes"]::part(thumb) {
  background: var(--v_scroll_thumb_active_bg);
}
```

- [ ] **Step 2: Ensure the generated module directory is tracked**

Run: `touch src/theme-imports/.gitkeep`  
Expected: no output.

- [ ] **Step 3: Run the plugin test again to verify the CSS source is consumable**

Run: `bun run test tests/vite-plugin-vscroll-theme.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit the theme source**

```bash
git add themes/default/v-scroll.css src/theme-imports/.gitkeep
git commit -m "style: add placeholder v-scroll theme"
```

### Task 5: Add the placeholder custom element and demo content

**Files:**
- Create: `src/demo/seed-content.ts`
- Create: `src/elements/v-scroll.ts`
- Test: `tests/v-scroll.test.ts`

- [ ] **Step 1: Write the failing component tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { registerVScroll } from "../src/elements/v-scroll";

describe("registerVScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("registers the custom element once", () => {
    registerVScroll();
    registerVScroll();

    expect(customElements.get("v-scroll")).toBeDefined();
  });

  it("wraps host content inside a frame part", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.innerHTML = "<p>Demo content</p>";
    document.body.append(host);

    const frame = host.shadowRoot?.querySelector('[data_v_scroll_frame="yes"]'),
      slot = host.shadowRoot?.querySelector("slot");

    expect(frame?.getAttribute("part")).toBe("frame");
    expect(slot).toBeDefined();
    expect(host.querySelector("p")?.textContent).toBe("Demo content");
  });
});
```

- [ ] **Step 2: Run the component tests to verify they fail**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: FAIL because the custom element module does not exist yet.

- [ ] **Step 3: Write the demo content seed**

```ts
const SECTIONS = [
  {
    title: "Virtual Scroll Placeholder",
    body: "This project currently validates the shell, theme path, and custom element registration only.",
  },
  {
    title: "Planned Next Step",
    body: "Future work will replace this static shell with a real scroll container and custom thumb behavior.",
  },
  {
    title: "Assignment Boundary",
    body: "Resize observation, pointer dragging, and detach cleanup are intentionally excluded from this initialization pass.",
  },
];

export const createSeedContent = () => {
  const article = document.createElement("article");

  for (const section of SECTIONS) {
    const block = document.createElement("section"),
      heading = document.createElement("h2"),
      paragraph = document.createElement("p");

    heading.textContent = section.title;
    paragraph.textContent = section.body;
    block.append(heading, paragraph);
    article.append(block);
  }

  return article;
};
```

- [ ] **Step 4: Write the placeholder custom element**

```ts
const ELEMENT_NAME = "v-scroll",
  FRAME_ATTR = "data_v_scroll_frame",
  TRACK_ATTR = "data_v_scroll_track",
  THUMB_ATTR = "data_v_scroll_thumb";

class VScrollElement extends HTMLElement {
  shadow_root: ShadowRoot;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.shadow_root.querySelector(`[${FRAME_ATTR}="yes"]`)) {
      return;
    }

    const frame = document.createElement("div"),
      content = document.createElement("slot"),
      track = document.createElement("b"),
      thumb = document.createElement("b");

    frame.setAttribute("part", "frame");
    frame.setAttribute(FRAME_ATTR, "yes");

    content.setAttribute("part", "content");

    while (this.firstChild) {
      content.append(this.firstChild);
    }

    track.setAttribute("part", "track");
    track.setAttribute(TRACK_ATTR, "yes");

    thumb.setAttribute("part", "thumb");
    thumb.setAttribute(THUMB_ATTR, "yes");
    track.append(thumb);

    frame.append(content, track);
    this.shadow_root.append(frame);
  }
}

export const registerVScroll = () => {
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, VScrollElement);
  }
};
```

- [ ] **Step 5: Run the component tests and verify they pass**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: PASS with `2 passed`.

- [ ] **Step 6: Commit the element shell**

```bash
git add src/demo/seed-content.ts src/elements/v-scroll.ts tests/v-scroll.test.ts
git commit -m "feat: add placeholder v-scroll element"
```

### Task 6: Add the HTML shell, main bootstrap, and AGENTS.md

**Files:**
- Create: `index.html`
- Create: `src/main.ts`
- Create: `AGENTS.md`

- [ ] **Step 1: Write the HTML entry**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>v-scroll</title>
    <script type="importmap">
      {
        "imports": {
          "$/": "/src/theme-imports/"
        }
      }
    </script>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the app bootstrap**

```ts
import css_text from "$/v-scroll.js";
import { createSeedContent } from "./demo/seed-content";
import { registerVScroll } from "./elements/v-scroll";
import { ensureThemeCss } from "./runtime/inject-theme-css";

const renderApp = () => {
  registerVScroll();
  ensureThemeCss(css_text);

  const app_root = document.querySelector<HTMLDivElement>("#app");

  if (!app_root) {
    throw new Error("Expected #app root node");
  }

  app_root.innerHTML = "";

  const page = document.createElement("section"),
    heading = document.createElement("h1"),
    shell = document.createElement("v-scroll");

  heading.textContent = "v-scroll initialization demo";
  shell.append(createSeedContent());
  page.append(heading, shell);
  app_root.append(page);
};

renderApp();
```

- [ ] **Step 3: Write the root AGENTS.md**

```md
# AGENTS.md

## Project Rules

- 用 `bun i` 安装依赖。
- 用最现代的 JS / TS 写法。
- `const` 定义的常量使用大写或清晰的常量命名。
- 函数使用小写驼峰风格命名。
- 函数优先使用 `const funcName = ()=>{}` 形式，不使用 `function` 声明，除非平台接口强制要求。
- 连续的 `const` 声明在可读性允许时合并书写。
- `import` 优先导入明确的函数或值，避免无必要的整模块导入。
- 变量名保持极简，普通变量可使用下划线风格，函数名使用小写驼峰风格。
- 使用 `await`，不要使用 `.then`。
- 优先写纯函数，避免无必要的类。
- 注重复用，多拆小函数，避免大段重复结构。
- 使用最新浏览器支持的原生 CSS nesting。
- 除非 `import.meta.main` 需要，否则不要为了默认导出先声明再导出常量。
- 修改后运行 `./build.sh` 修复错误。

## Project Exception

- `customElements` 需要继承 `HTMLElement` 时，可以使用最小范围的类实现原生自定义元素。
- `src/theme-imports/v-scroll.js` 是由 Vite 插件生成的主题模块，不手动编辑。
```

- [ ] **Step 4: Run the typecheck to verify the new entrypoint wiring is complete**

Run: `bun run check`  
Expected: PASS because the Vite alias and ambient module declaration cover the generated theme import contract.

- [ ] **Step 5: Commit the app shell**

```bash
git add index.html src/main.ts AGENTS.md
git commit -m "feat: add demo entry and project rules"
```

### Task 7: Generate the theme module, verify the app, and lock the repository state

**Files:**
- Modify: `src/theme-imports/v-scroll.js` via plugin output
- Verify: `package.json`
- Verify: `build.sh`
- Verify: `vite.config.ts`

- [ ] **Step 1: Run the plugin through Vite so the generated module exists**

Run: `bun run build`  
Expected: PASS and `src/theme-imports/v-scroll.js` is created before bundling completes.

- [ ] **Step 2: Re-run typecheck and full test suite**

Run: `bun run check && bun run test`  
Expected: PASS with no TypeScript errors and all tests green.

- [ ] **Step 3: Run the unified verification entrypoint**

Run: `./build.sh`  
Expected: PASS after printing successful `check`, `test`, and `build` output.

- [ ] **Step 4: Start the dev server for a smoke check**

Run: `bun run dev --host 127.0.0.1 --port 4173`  
Expected: Vite prints a local URL such as `http://127.0.0.1:4173/`.

- [ ] **Step 5: Manually verify the browser smoke case**

Run: open `http://127.0.0.1:4173/` in a browser  
Expected:
- the page title is `v-scroll`
- the page shows a heading with `v-scroll initialization demo`
- one `<v-scroll>` instance is visible
- theme styling is applied from the generated module
- no real custom scrolling behavior is present yet

- [ ] **Step 6: Commit the initialized project**

```bash
git add package.json tsconfig.json .gitignore bun.lock vite.config.ts build.sh AGENTS.md index.html src scripts tests themes
git commit -m "feat: initialize v-scroll project skeleton"
```

## Self-Review

### Spec Coverage

- `bun` setup: Task 1
- TypeScript + Vite baseline: Task 1 and Task 2
- `configResolved` plugin: Task 2
- independent CSS source: Task 4
- `importmap` theme contract: Task 6
- placeholder `<v-scroll>` custom element: Task 5
- runnable demo page: Task 6 and Task 7
- `AGENTS.md`: Task 6
- `build.sh`: Task 2 and Task 7
- explicit exclusion of behavior work: Notes Before Execution and Task boundaries

### Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation markers remain in the task steps.
- Every code-writing step includes concrete code.
- Every run step includes an explicit command and expected result.

### Type and Naming Consistency

- Theme module contract stays `$/v-scroll.js` everywhere.
- The generated artifact path stays `src/theme-imports/v-scroll.js` everywhere.
- The custom element registration entry stays `registerVScroll` everywhere.
- The CSS injection entry stays `ensureThemeCss` everywhere.
