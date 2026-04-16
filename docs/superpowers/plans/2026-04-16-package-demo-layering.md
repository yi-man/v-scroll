# Package / Demo Layering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the repo into a real `v-scroll` package plus a deployable demo app, with dev mode consuming package source and build mode consuming package output.

**Architecture:** Keep one repo, but move product code into `packages/v-scroll` and demo code into `apps/demo`. The package owns the component, theme plugin, theme source, and tests; the demo owns only the preview page and aliases `v-scroll` to source in dev while production resolves the built package through its workspace manifest.

**Tech Stack:** Bun workspaces, TypeScript, Vite, Vitest, happy-dom, native Web Components, lightningcss, Vercel

---

## File Map

- Create: `docs/superpowers/plans/2026-04-16-package-demo-layering.md`
- Create: `tsconfig.base.json`
- Create: `tests/workspace-config.test.ts`
- Create: `apps/demo/package.json`
- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/vite.config.ts`
- Create: `apps/demo/vite.resolve-v-scroll.ts`
- Create: `apps/demo/tests/vite.resolve-v-scroll.test.ts`
- Create: `apps/demo/index.html`
- Create: `apps/demo/src/main.ts`
- Create: `apps/demo/src/demo-data.ts`
- Create: `apps/demo/src/vite-env.d.ts`
- Create: `packages/v-scroll/package.json`
- Create: `packages/v-scroll/tsconfig.json`
- Create: `packages/v-scroll/tsconfig.build.json`
- Create: `packages/v-scroll/vite.config.ts`
- Create: `packages/v-scroll/src/index.ts`
- Create: `packages/v-scroll/src/theme-imports/v-scroll.d.ts`
- Create: `packages/v-scroll/tests/package-structure.test.ts`
- Create: `packages/v-scroll/tests/public-api.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `build.sh`
- Modify: `vercel.json`
- Modify: `packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts`
- Modify: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`
- Remove after moves: `vite.config.ts`
- Remove after moves: `index.html`
- Remove after moves: `src/`
- Remove after moves: `scripts/`
- Remove after moves: `themes/`
- Remove after moves: `tests/` except `tests/workspace-config.test.ts`

## Notes Before Execution

- `packages/v-scroll/src/theme-imports/v-scroll.js` remains generated. Do not hand-edit the generated `.js` file.
- The package public entry is `packages/v-scroll/src/index.ts`. Demo code must not import `packages/v-scroll/src/virtual-scroll/*` directly.
- The theme plugin stays inside the package. Demo never owns or runs package-internal theme generation logic.
- The demo no longer needs the root importmap. The package should import its generated theme module by relative path.
- Root `build` remains the orchestration entry. `./build.sh` must still run `check`, `test`, and `build` in order.

### Task 1: Bootstrap the workspace shell and root orchestration

**Files:**

- Create: `tests/workspace-config.test.ts`
- Create: `tsconfig.base.json`
- Create: `apps/demo/package.json`
- Create: `packages/v-scroll/package.json`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `build.sh`
- Modify: `vercel.json`

- [ ] **Step 1: Write the failing workspace configuration test**

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readJson = async <T>(path: string) =>
  JSON.parse(await readFile(resolve(process.cwd(), path), "utf8")) as T;

describe("workspace orchestration", () => {
  it("defines workspaces and explicit layered scripts at the root", async () => {
    const pkg = await readJson<{
      private: boolean;
      workspaces: string[];
      scripts: Record<string, string>;
    }>("package.json");

    expect(pkg.private).toBe(true);
    expect(pkg.workspaces).toEqual(["apps/*", "packages/*"]);
    expect(pkg.scripts["dev:demo"]).toBe("bun run --cwd apps/demo dev");
    expect(pkg.scripts["build:lib"]).toBe("bun run --cwd packages/v-scroll build");
    expect(pkg.scripts["build:demo"]).toBe(
      "test -f packages/v-scroll/dist/index.js && bun run --cwd apps/demo build",
    );
    expect(pkg.scripts.build).toBe("bun run build:lib && bun run build:demo");
    expect(pkg.scripts.check).toBe("bun run --cwd packages/v-scroll check && bun run --cwd apps/demo check");
    expect(pkg.scripts.test).toBe(
      "bun run test:workspace-config && bun run --cwd packages/v-scroll test && bun run --cwd apps/demo test",
    );
  });

  it("declares dedicated manifests for the demo and package", async () => {
    const demo_pkg = await readJson<{
        name: string;
        private: boolean;
        dependencies: Record<string, string>;
      }>("apps/demo/package.json"),
      lib_pkg = await readJson<{
        name: string;
        type: string;
        exports: Record<string, unknown>;
      }>("packages/v-scroll/package.json");

    expect(demo_pkg.name).toBe("v-scroll-demo");
    expect(demo_pkg.private).toBe(true);
    expect(demo_pkg.dependencies["v-scroll"]).toBe("workspace:*");
    expect(lib_pkg.name).toBe("v-scroll");
    expect(lib_pkg.type).toBe("module");
    expect(lib_pkg.exports["."]).toEqual({
      import: "./dist/index.js",
      types: "./dist/index.d.ts",
    });
  });

  it("points vercel and the build gate at the demo output", async () => {
    const vercel = await readJson<{
        buildCommand: string;
        outputDirectory: string;
      }>("vercel.json"),
      build_sh = await readFile(resolve(process.cwd(), "build.sh"), "utf8");

    expect(vercel.buildCommand).toBe("bun run build");
    expect(vercel.outputDirectory).toBe("apps/demo/dist");
    expect(build_sh).toContain("bun run check");
    expect(build_sh).toContain("bun run test");
    expect(build_sh).toContain("bun run build");
    expect(build_sh.indexOf("bun run check")).toBeLessThan(build_sh.indexOf("bun run test"));
    expect(build_sh.indexOf("bun run test")).toBeLessThan(build_sh.indexOf("bun run build"));
  });
});
```

- [ ] **Step 2: Run the focused root test to verify it fails**

Run: `bun run vitest tests/workspace-config.test.ts`  
Expected: FAIL because `workspaces`, `dev:demo`, `build:lib`, `build:demo`, and the child manifests do not exist yet.

- [ ] **Step 3: Add the workspace manifests and root orchestration configs**

`package.json`

```json
{
  "name": "v-scroll-workspace",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:demo": "bun run --cwd apps/demo dev",
    "build:lib": "bun run --cwd packages/v-scroll build",
    "build:demo": "test -f packages/v-scroll/dist/index.js && bun run --cwd apps/demo build",
    "build": "bun run build:lib && bun run build:demo",
    "test:workspace-config": "vitest run tests/workspace-config.test.ts",
    "check": "bun run --cwd packages/v-scroll check && bun run --cwd apps/demo check",
    "test": "bun run test:workspace-config && bun run --cwd packages/v-scroll test && bun run --cwd apps/demo test"
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

`tsconfig.base.json`

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
    "types": ["vite/client", "node"]
  }
}
```

`tsconfig.json`

```json
{
  "extends": "./tsconfig.base.json",
  "include": ["tests/workspace-config.test.ts"]
}
```

`apps/demo/package.json`

```json
{
  "name": "v-scroll-demo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "check": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run tests/vite.resolve-v-scroll.test.ts"
  },
  "dependencies": {
    "v-scroll": "workspace:*"
  }
}
```

`packages/v-scroll/package.json`

```json
{
  "name": "v-scroll",
  "version": "0.0.0",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "vite build && tsc -p tsconfig.build.json",
    "check": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  }
}
```

`build.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

bun run check
bun run test
bun run build
```

`vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "bun run build",
  "outputDirectory": "apps/demo/dist"
}
```

- [ ] **Step 4: Run the focused root test to verify it passes**

Run: `bun run vitest tests/workspace-config.test.ts`  
Expected: PASS with `3 passed`

- [ ] **Step 5: Commit the workspace shell**

```bash
git add package.json tsconfig.base.json tsconfig.json build.sh vercel.json tests/workspace-config.test.ts apps/demo/package.json packages/v-scroll/package.json
git commit -m "build: add workspace shell for package and demo"
```

### Task 2: Move the product code into the package and add the package build entry

**Files:**

- Create: `packages/v-scroll/tsconfig.json`
- Create: `packages/v-scroll/tsconfig.build.json`
- Create: `packages/v-scroll/vite.config.ts`
- Create: `packages/v-scroll/src/index.ts`
- Create: `packages/v-scroll/src/theme-imports/v-scroll.d.ts`
- Create: `packages/v-scroll/tests/package-structure.test.ts`
- Modify: `packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts`
- Remove after moves: `vite.config.ts`
- Remove after moves: `src/`
- Remove after moves: `scripts/`
- Remove after moves: `themes/`

- [ ] **Step 1: Write the failing package structure smoke test**

```ts
import { describe, expect, it } from "vitest";
import { ensureVScrollTheme, registerVScroll } from "../src/index";

describe("package structure", () => {
  it("exports a package entry from packages/v-scroll/src/index.ts", () => {
    expect(registerVScroll).toBeTypeOf("function");
    expect(ensureVScrollTheme).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run the focused package test to verify it fails**

Run: `bun run --cwd packages/v-scroll test tests/package-structure.test.ts`  
Expected: FAIL with `Cannot find module '../src/index'`

- [ ] **Step 3: Move the source tree and create the package-local build files**

Move the existing code into the package:

```bash
mkdir -p packages/v-scroll/src packages/v-scroll/scripts packages/v-scroll/themes packages/v-scroll/tests
mv src/assets packages/v-scroll/src/assets
mv src/runtime packages/v-scroll/src/runtime
mv src/theme-imports packages/v-scroll/src/theme-imports
mv src/virtual-scroll packages/v-scroll/src/virtual-scroll
mv src/vite-env.d.ts packages/v-scroll/src/vite-env.d.ts
mv scripts/vite-plugin-vscroll-theme.ts packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts
mv themes/default packages/v-scroll/themes/default
rm -rf src scripts themes vite.config.ts
```

`packages/v-scroll/src/index.ts`

```ts
import css_text from "./theme-imports/v-scroll.js";
import { ensureThemeCss } from "./runtime/inject-theme-css";

export { registerVScroll } from "./virtual-scroll";
export type { VScrollConfig, VScrollState } from "./virtual-scroll";
export * from "./virtual-scroll/math";

export const ensureVScrollTheme = () => ensureThemeCss(css_text);
```

`packages/v-scroll/src/theme-imports/v-scroll.d.ts`

```ts
declare const css_text: string;

export default css_text;
```

`packages/v-scroll/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "scripts", "tests", "vite.config.ts"]
}
```

`packages/v-scroll/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/v-scroll/vite.config.ts`

```ts
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { vScrollThemePlugin } from "./scripts/vite-plugin-vscroll-theme";

export default defineConfig({
  plugins: [vScrollThemePlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist",
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

`packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts`

```ts
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { transform } from "lightningcss";
import type { Plugin } from "vite";

const CSS_SOURCE_PATH = "themes/default/v-scroll.css",
  GENERATED_MODULE_PATH = "src/theme-imports/v-scroll.js";

const toThemeModule = (css_text: string) =>
  `export default ${JSON.stringify(css_text)};\n`;

export const vScrollThemePlugin = (): Plugin => {
  let root_dir = "",
    out_dir = "",
    source_path = "",
    generated_module_path = "",
    built_module_path = "";

  const removeGeneratedOutputs = async () => {
    await Promise.all(
      [generated_module_path, built_module_path]
        .filter(Boolean)
        .map((path) => rm(path, { force: true })),
    );
  };

  const writeGeneratedModule = async (output_path: string, module_code: string) => {
    await mkdir(dirname(output_path), { recursive: true });
    await writeFile(output_path, module_code, "utf8");
  };

  const generateThemeModule = async () => {
    let source_css = "";

    try {
      source_css = await readFile(source_path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await removeGeneratedOutputs();
      }

      throw error;
    }

    try {
      const result = transform({
          filename: source_path,
          code: Buffer.from(source_css),
          minify: true,
        }),
        module_code = toThemeModule(result.code.toString());

      await writeGeneratedModule(generated_module_path, module_code);
      return module_code;
    } catch (error) {
      await removeGeneratedOutputs();
      throw error;
    }
  };

  return {
    name: "v-scroll-theme-plugin",
    async configResolved(config) {
      root_dir = config.root;
      out_dir = resolve(root_dir, config.build?.outDir ?? "dist");
      source_path = join(root_dir, CSS_SOURCE_PATH);
      generated_module_path = join(root_dir, GENERATED_MODULE_PATH);
      built_module_path = join(out_dir, GENERATED_MODULE_PATH);
      await generateThemeModule();
    },
    async writeBundle() {
      const module_code = await generateThemeModule();
      await writeGeneratedModule(built_module_path, module_code);
    },
    configureServer(server) {
      server.watcher.add(source_path);

      const regenerateAndReload = async (changed_path: string) => {
        if (changed_path !== source_path) {
          return;
        }

        try {
          await generateThemeModule();
        } finally {
          server.ws.send({ type: "full-reload" });
        }
      };

      server.watcher.on("change", regenerateAndReload);
      server.watcher.on("add", regenerateAndReload);
      server.watcher.on("unlink", async (changed_path) => {
        if (changed_path !== source_path) {
          return;
        }

        await removeGeneratedOutputs();
        server.ws.send({ type: "full-reload" });
      });
    },
  };
};
```

- [ ] **Step 4: Run the focused package test to verify it passes**

Run: `bun run --cwd packages/v-scroll test tests/package-structure.test.ts`  
Expected: PASS with `1 passed`

- [ ] **Step 5: Commit the package relocation**

```bash
git add packages/v-scroll
git add -u src scripts themes vite.config.ts
git commit -m "refactor: move product code into package workspace"
```

### Task 3: Move the package test suite and lock the public API

**Files:**

- Create: `packages/v-scroll/tests/public-api.test.ts`
- Modify: `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`
- Move: `tests/setup.ts` to `packages/v-scroll/tests/setup.ts`
- Move: `tests/inject-theme-css.test.ts` to `packages/v-scroll/tests/inject-theme-css.test.ts`
- Move: `tests/v-scroll-math.test.ts` to `packages/v-scroll/tests/v-scroll-math.test.ts`
- Move: `tests/v-scroll.test.ts` to `packages/v-scroll/tests/v-scroll.test.ts`
- Move: `tests/virtual-scroll-dom.test.ts` to `packages/v-scroll/tests/virtual-scroll-dom.test.ts`
- Move: `tests/vite-plugin-vscroll-theme.test.ts` to `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts`

- [ ] **Step 1: Write the failing public API test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ensureVScrollTheme, registerVScroll } from "../src/index";

describe("public api", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("registers the element and injects the generated default theme", () => {
    registerVScroll();
    const style_node = ensureVScrollTheme();

    expect(customElements.get("v-scroll")).toBeDefined();
    expect(style_node.dataset.vScrollTheme).toBe("default");
    expect(style_node.textContent?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the full package suite to verify it fails before the move is complete**

Run: `bun run --cwd packages/v-scroll test`  
Expected: FAIL because `tests/setup.ts` is still missing in the package, the old root tests have not been moved yet, and the plugin test still expects importmap-specific behavior.

- [ ] **Step 3: Move the test suite into the package and replace the importmap-specific plugin expectations**

Move the existing test files:

```bash
mv tests/setup.ts packages/v-scroll/tests/setup.ts
mv tests/inject-theme-css.test.ts packages/v-scroll/tests/inject-theme-css.test.ts
mv tests/v-scroll-math.test.ts packages/v-scroll/tests/v-scroll-math.test.ts
mv tests/v-scroll.test.ts packages/v-scroll/tests/v-scroll.test.ts
mv tests/virtual-scroll-dom.test.ts packages/v-scroll/tests/virtual-scroll-dom.test.ts
mv tests/vite-plugin-vscroll-theme.test.ts packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts
```

Replace the importmap-only assertions in `packages/v-scroll/tests/vite-plugin-vscroll-theme.test.ts` with a relative-module smoke test:

```ts
it("keeps the generated module importable from the package by relative path", async () => {
  await writeFile(
    join(root_dir, "themes/default/v-scroll.css"),
    ":root {\n  --color: red;\n}\n",
    "utf8",
  );

  await resolveConfig(root_dir);

  await expect(
    readFile(join(root_dir, "src/theme-imports/v-scroll.js"), "utf8"),
  ).resolves.toBe('export default ":root{--color:red}";\n');
});
```

Delete the two obsolete cases titled:

- `"resolves the importmap specifier to a virtual module in serve mode"`
- `"marks the importmap specifier as external in build mode so browser resolution stays in play"`

- [ ] **Step 4: Run the full package suite to verify it passes**

Run: `bun run --cwd packages/v-scroll test`  
Expected: PASS with all package tests green, including `public-api.test.ts`, DOM behavior tests, math tests, runtime tests, and the updated plugin tests.

- [ ] **Step 5: Commit the package-local tests**

```bash
git add packages/v-scroll/tests
git add -u tests
git commit -m "test: move package test suite into workspace package"
```

### Task 4: Create the demo app with dev-source resolution and build-output consumption

**Files:**

- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/vite.resolve-v-scroll.ts`
- Create: `apps/demo/vite.config.ts`
- Create: `apps/demo/tests/vite.resolve-v-scroll.test.ts`
- Create: `apps/demo/index.html`
- Create: `apps/demo/src/main.ts`
- Create: `apps/demo/src/demo-data.ts`
- Create: `apps/demo/src/vite-env.d.ts`
- Remove after move: `index.html`
- Remove after move: `src/main.ts`

- [ ] **Step 1: Write the failing demo resolution test**

```ts
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
```

- [ ] **Step 2: Run the focused demo test to verify it fails**

Run: `bun run --cwd apps/demo test`  
Expected: FAIL with `Cannot find module '../vite.resolve-v-scroll'`

- [ ] **Step 3: Create the demo app and its resolution helper**

`apps/demo/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests", "vite.config.ts", "vite.resolve-v-scroll.ts"]
}
```

`apps/demo/vite.resolve-v-scroll.ts`

```ts
import { resolve } from "node:path";
import type { Alias } from "vite";

const LIB_SOURCE_ENTRY = resolve(
  __dirname,
  "../../packages/v-scroll/src/index.ts",
);

export const getVScrollAlias = (command: "serve" | "build"): Alias[] =>
  command === "serve"
    ? [{ find: "v-scroll", replacement: LIB_SOURCE_ENTRY }]
    : [];
```

`apps/demo/vite.config.ts`

```ts
import { defineConfig } from "vite";
import { getVScrollAlias } from "./vite.resolve-v-scroll";

export default defineConfig(({ command }) => ({
  resolve: {
    alias: getVScrollAlias(command === "serve" ? "serve" : "build"),
  },
}));
```

`apps/demo/src/demo-data.ts`

```ts
export const createDemoData = () =>
  Array.from({ length: 100000 }, (_, index) => ({
    description: `This is the description for item ${index + 1}`,
    id: index,
    title: `Item ${index + 1}`,
  }));
```

`apps/demo/src/main.ts`

```ts
import { ensureVScrollTheme, registerVScroll } from "v-scroll";
import { createDemoData } from "./demo-data";

const renderApp = () => {
  registerVScroll();
  ensureVScrollTheme();

  const app_root = document.querySelector<HTMLDivElement>("#app");
  if (!app_root) {
    throw new Error("Expected #app root node");
  }

  app_root.innerHTML = "";

  const container = document.createElement("div"),
    title = document.createElement("h1"),
    desc = document.createElement("p"),
    vscroll = document.createElement("v-scroll");

  container.style.cssText =
    "max-width: 600px; margin: 0 auto; padding: 40px 20px;";

  title.textContent = "Virtual Scroll Demo";
  title.style.cssText =
    "font-size: 28px; font-weight: 600; margin: 0 0 24px 0; color: #1a1a1a;";

  desc.textContent = "虚拟滚动演示：10万项数据，仅渲染可见区域";
  desc.style.cssText =
    "font-size: 14px; color: #666; margin: 0 0 24px 0; line-height: 1.5;";

  vscroll.setAttribute("item-height", "50");
  vscroll.style.cssText =
    "border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: #fff; block-size: 400px;";

  container.append(title, desc, vscroll);
  app_root.append(container);

  (vscroll as HTMLElement & { data: ReturnType<typeof createDemoData> }).data =
    createDemoData();
};

renderApp();
```

`apps/demo/index.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>v-scroll demo</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`apps/demo/src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />
```

Remove the old root demo entry:

```bash
rm -f index.html src/main.ts
```

- [ ] **Step 4: Run the demo test and type-check to verify the boundary works**

Run: `bun run --cwd apps/demo test && bun run --cwd apps/demo check`  
Expected: PASS with `2 passed` from `vite.resolve-v-scroll.test.ts`, then a clean TypeScript check for the demo app.

- [ ] **Step 5: Commit the demo app**

```bash
git add apps/demo
git add -u index.html src/main.ts
git commit -m "feat: add workspace demo app"
```

## Final Verification

- [ ] Run: `bun run test:workspace-config`  
  Expected: PASS with the root orchestration test green.
- [ ] Run: `bun run --cwd packages/v-scroll check`  
  Expected: PASS with no TypeScript errors in the package.
- [ ] Run: `bun run --cwd packages/v-scroll test`  
  Expected: PASS with all package tests green.
- [ ] Run: `bun run --cwd packages/v-scroll build`  
  Expected: PASS and create `packages/v-scroll/dist/index.js`, `packages/v-scroll/dist/index.d.ts`, and `packages/v-scroll/dist/src/theme-imports/v-scroll.js`.
- [ ] Run: `bun run --cwd apps/demo test`  
  Expected: PASS with the demo resolution test green.
- [ ] Run: `bun run --cwd apps/demo check`  
  Expected: PASS with no TypeScript errors in the demo app.
- [ ] Run: `bun run build`  
  Expected: PASS after building the package first and the demo second, with final demo assets in `apps/demo/dist`.
- [ ] Run: `./build.sh`  
  Expected: PASS after executing root `check`, `test`, and `build` in order.

## Spec Coverage Check

- Workspace split into `packages/v-scroll` and `apps/demo`: covered by Tasks 1, 2, and 4.
- Package owns theme source, plugin, generated module path, and core tests: covered by Tasks 2 and 3.
- Demo dev mode consumes package source: covered by Task 4 through `getVScrollAlias("serve")`.
- Demo build mode consumes package output: covered by Task 1 root scripts plus Task 4 app wiring and Final Verification `bun run build`.
- Explicit `build:lib` / `build:demo` orchestration and Vercel output path: covered by Task 1.
- Test responsibilities moved into the package while keeping root orchestration validation: covered by Task 3 and `tests/workspace-config.test.ts`.

## Placeholder Scan

- No `TBD`, `TODO`, or deferred design notes remain.
- Every new file path has concrete content or an explicit move command.
- Every verification step names the exact command and expected outcome.

## Type Consistency Check

- Package public API uses `registerVScroll` and `ensureVScrollTheme` consistently in Tasks 2, 3, and 4.
- Demo resolution helper is named `getVScrollAlias` consistently in Task 4 tests and implementation.
- Root scripts refer to the same workspace paths used in the task file map.
