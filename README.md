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

主题 CSS 支持的完整变量如下：

| 变量名 | 作用 |
| --- | --- |
| `--v-scroll-frame-bg` | 整个滚动容器外框的背景色，作用于 `::part(frame)` |
| `--v-scroll-frame-border` | 滚动容器边框颜色，作用于 `::part(frame)` |
| `--v-scroll-text` | 组件文字主色，作用于宿主 `v-scroll` |
| `--v-scroll-track-width` | 轨道宽度，作用于 `::part(track)` |
| `--v-scroll-track-inset` | 轨道距离右侧的内缩距离，作用于 `::part(track)` |
| `--v-scroll-track-top-gap` | 轨道顶部预留间距，参与 thumb 定位和拖拽映射计算 |
| `--v-scroll-track-bottom-gap` | 轨道底部预留间距，参与 thumb 定位和拖拽映射计算 |
| `--v-scroll-thumb-radius` | 滑块圆角，作用于 `::part(thumb)` |
| `--v-scroll-thumb-bg` | 滑块默认背景色，作用于 `::part(thumb)` |
| `--v-scroll-thumb-bg-hover` | 滑块 hover 状态背景色，作用于 `v-scroll[data-thumb-hovered="yes"]::part(thumb)` |
| `--v-scroll-thumb-bg-dragging` | 滑块拖拽状态背景色，作用于 `v-scroll[data-dragging="yes"]::part(thumb)` |
| `--v-scroll-thumb-min-size` | 滑块最小高度，既作用于 `::part(thumb)`，也同步参与运行时尺寸计算 |

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

### 当前实现说明

当前实现保留了两条与最初 PRD 不完全相同、但更偏工程稳态的设计选择：

- **主题加载采用“内置默认主题 + 自定义主题覆盖”**
  - 好处是自定义主题只需要覆盖自己关心的变量或规则，不必从零写完整主题。
  - 好处是当自定义主题缺少某些选择器或变量时，组件仍然有一套完整可用的基础样式，不会直接退化成无样式状态。
  - 好处是升级库时默认主题仍然可以提供新的基础兼容样式，第三方主题只需要增量适配。

- **`importmap` 采用精确映射 `$/v-scroll.js`，而不是整个 `$/` 前缀映射**
  - 好处是使用方不需要在 HTML 里手动写 `importmap`，只要接入 `vScrollThemePlugin`，插件就会自动注入这条映射。
  - 好处是运行时入口固定为 `$/v-scroll.js`，主题文件路径可以稳定收敛到单一模块入口，调用方不需要理解一整套目录约定。
  - 好处是插件职责更单一，只生成并映射一个主题模块，构建、调试和测试边界都更清晰。
  - 好处是减少路径歧义和误映射风险，避免其他 `$/...` 资源意外落入这个主题机制。

## 开发建议

- 主题源文件改完后，优先走 `bun run dev:demo` 本地验证
- 构建产物文件（如 `public/themes/*/v-scroll.js`）不要手动改
- 提交前执行 `./build.sh`，确保 check/test/build 全通过
