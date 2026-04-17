# v-scroll

`v-scroll` 是一个基于 Web Component 的虚拟滚动条组件库，仓库采用 Bun Workspace monorepo 结构，包含：
- `packages/v-scroll`：组件库源码与构建产物
- `apps/demo`：演示应用（Vite）

## 项目结构

```text
.
├── apps/
│   └── demo/                         # 演示应用
│       ├── src/
│       │   ├── main.ts               # demo 入口
│       │   └── theme/night/v-scroll.css
│       ├── public/themes/            # 主题 js 输出
│       └── vite.config.ts
├── packages/
│   └── v-scroll/                     # 组件库
│       ├── src/
│       │   ├── index.ts              # 公开 API
│       │   ├── virtual-scroll/       # 核心逻辑 + custom element 注册
│       │   └── theme/default/v-scroll.css
│       └── dist/
├── tests/                            # workspace 级测试
├── build.sh                          # check -> test -> build
└── package.json                      # workspace scripts
```

## 快速开始

在仓库根目录执行：

```bash
bun i
bun run dev:demo
```

常用命令：

```bash
bun run check       # workspace 类型检查
bun run test        # workspace 测试
bun run build       # build:lib + build:demo
./build.sh          # check -> test -> build
```

## v-scroll 怎么使用

### 1) 注册组件并注入主题

```ts
import { registerVScroll } from "v-scroll";

const bootstrap = async () => {
  await registerVScroll();
};

void bootstrap();
```

`registerVScroll()` 会做两件事：
- 注册 `<v-scroll>` 自定义元素
- 注入主题 CSS（始终注入内置默认主题；若存在 `$/v-scroll.js`，再叠加自定义主题）

### 2) 在页面里使用

```html
<v-scroll class="panel">
  <div part="v-scroll-item">Item A</div>
  <div part="v-scroll-item">Item B</div>
  <div part="v-scroll-item">Item C</div>
</v-scroll>
```

> 建议给容器设置高度，例如 `height: 400px;`，让滚动区域有明确可视窗口。

## 样式怎么定制

`v-scroll` 支持两种层级的定制方式：不定制（直接用默认主题）和定制（改变量/改完整主题）。

### 不定制：直接使用默认主题

只调用 `registerVScroll()` 即可，不需要额外配置。  
组件会自动注入 `packages/v-scroll/src/theme/default/v-scroll.css` 对应的构建主题。

### 定制方式：通过 Vite 插件提供主题

定制主题只需要一套方式：准备一个主题 CSS 源文件，并通过 `vScrollThemePlugin` 生成 `v-scroll.js`。

加载行为说明：
- **不使用 plugin**：HTML 不会注入 `importmap`，`registerVScroll()` 只会使用内置默认主题。
- **使用 plugin**：plugin 会在 `head` 注入 `importmap`，将 `$/v-scroll.js` 指向你生成的主题模块；`registerVScroll()` 会在默认主题之上叠加这份自定义主题。

```ts
import { defineConfig } from "vite";
import { vScrollThemePlugin } from "v-scroll/plugin";

export default defineConfig({
  plugins: [
    vScrollThemePlugin({
      css_source_path: "src/theme/night/v-scroll.css",
      generated_module_path: "public/themes/night/v-scroll.js",
    }),
  ],
});
```

参数说明：
- `css_source_path`：你的主题源 CSS
- `generated_module_path`：插件输出的主题 JS（必须文件名为 `v-scroll.js`）
- 若输出在 `public/...` 下，插件会自动在 HTML 的 `head` 注入 `importmap`，把 `$/v-scroll.js` 指向该文件

`registerVScroll()` 在运行时会先注入内置默认主题，再叠加你的自定义主题。  
因此主题 CSS 可以按需选择粒度：

- **只覆盖变量**（推荐，改动小）

```css
:root {
  --v-scroll-frame-bg: #0b1020;
  --v-scroll-frame-border: rgb(148 163 184 / 30%);
  --v-scroll-text: #e2e8f0;
  --v-scroll-track-width: 12px;
  --v-scroll-thumb-bg: rgb(148 163 184 / 35%);
  --v-scroll-thumb-bg-hover: rgb(148 163 184 / 50%);
  --v-scroll-thumb-bg-dragging: #60a5fa;
}
```

- **覆盖变量 + 增加规则**（需要改结构或交互观感时）

```css
:root {
  --v-scroll-thumb-bg: rgb(148 163 184 / 35%);
}

v-scroll {
  &::part(frame) {
    background: linear-gradient(180deg, #0b1220, #111827);
  }
}
```

## 开发建议

- 主题源文件改完后，优先走 `bun run dev:demo` 本地验证
- 构建产物文件（如 `public/themes/*/v-scroll.js`）不要手动改
- 提交前执行 `./build.sh`，确保 check/test/build 全通过
