# v-scroll Export Surface Design

## Goal

收敛 `v-scroll` 的公开导出面，只保留外部真正需要使用的组件初始化 API，并将 Vite 主题插件拆分为独立入口 `v-scroll/plugin`。同时把默认 theme 和 demo theme 都迁移到各自的 `src/` 目录下，保证包结构、构建产物和消费方式一致。

## Requirements

- `v-scroll` 包根入口只暴露组件初始化相关 API
- `v-scroll/plugin` 作为单独入口暴露 `vScrollThemePlugin`
- 默认 theme 不作为公开 API 导出
- 包内默认 theme 路径迁移到 `packages/v-scroll/src/` 下
- demo 自定义 theme 路径迁移到 `apps/demo/src/` 下
- theme plugin 不能继续放在 `scripts/` 下，应进入源码目录并参与构建
- `dev`、`build`、测试和浏览器真实验证都需要继续正常工作

## Public API Design

### Runtime Entry

`packages/v-scroll/src/index.ts` 只导出以下内容：

- `registerVScroll`
- `createVScroll`
- `ensureVScrollTheme`
- `VScrollConfig`
- `VScrollState`

这些是外部调用方初始化组件或与组件实例交互时真正需要的 API。像 math 计算函数、DOM 组装工具、内部常量都属于实现细节，不再作为公开接口暴露。

### Plugin Entry

新增 `packages/v-scroll/src/plugin.ts`，只导出：

- `vScrollThemePlugin`

外部调用形态固定为：

```ts
import { registerVScroll, ensureVScrollTheme } from "v-scroll";
import { vScrollThemePlugin } from "v-scroll/plugin";
```

这样运行时入口和 Node/Vite 插件入口职责明确，不会把 Node 侧依赖混进浏览器运行时入口。

## Source Layout

### Package

包内目录调整为：

```text
packages/v-scroll/
├── src/
│   ├── index.ts
│   ├── plugin.ts
│   ├── plugins/
│   │   └── vscroll-theme.ts
│   ├── runtime/
│   ├── theme/
│   │   └── default/
│   │       ├── v-scroll.css
│   │       ├── v-scroll.js
│   │       └── v-scroll.d.ts
│   └── virtual-scroll/
```

迁移动作：

- `packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts` -> `packages/v-scroll/src/plugins/vscroll-theme.ts`
- `packages/v-scroll/themes/default/v-scroll.css` -> `packages/v-scroll/src/theme/default/v-scroll.css`
- `packages/v-scroll/themes/default/v-scroll.js` -> `packages/v-scroll/src/theme/default/v-scroll.js`
- `packages/v-scroll/themes/default/v-scroll.d.ts` -> `packages/v-scroll/src/theme/default/v-scroll.d.ts`

### Demo

demo theme 目录调整为：

```text
apps/demo/
└── src/
    └── theme/
        └── night/
            └── v-scroll.css
```

迁移动作为：

- `apps/demo/themes/night/v-scroll.css` -> `apps/demo/src/theme/night/v-scroll.css`

## Internal Module Boundaries

### Keep Internal

以下模块继续存在，但不再通过包根导出：

- `packages/v-scroll/src/virtual-scroll/math.ts`
- `packages/v-scroll/src/virtual-scroll/dom.ts`
- `packages/v-scroll/src/theme/default/*`

### Remove Redundant Re-exports

`packages/v-scroll/src/virtual-scroll/index.ts` 当前再次 `export * from "./math"`，这会让内部实现边界变模糊。该 re-export 需要移除，避免出现“内部模块既是内部实现，又被上层误当成公开 API”的情况。

## Build and Package Exports

### Package Exports

`packages/v-scroll/package.json` 的 `exports` 改为双入口：

```json
{
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./plugin": {
    "import": "./dist/plugin.js",
    "types": "./dist/plugin.d.ts"
  }
}
```

### Build Outputs

包构建需要同时产出：

- `dist/index.js`
- `dist/index.d.ts`
- `dist/plugin.js`
- `dist/plugin.d.ts`

默认 theme 生成产物继续作为包内部依赖存在，不加入包对外导出面。

### Plugin Build Participation

因为 `vScrollThemePlugin` 要作为 `v-scroll/plugin` 对外消费，所以插件实现不能继续停留在不参与 TypeScript 声明产出的 `scripts/` 目录。将其迁到 `src/plugins/` 后，由 `src/plugin.ts` 暴露，并纳入声明构建范围。

## Theme Pipeline Design

### Default Theme

运行时默认 theme 模块改为从 `src/theme/default/v-scroll.js` 内部导入。它仍然作为 fallback 使用，但不再对外暴露路径契约。

### Demo Theme

demo 中的自定义 theme 源文件改为位于 `apps/demo/src/theme/night/v-scroll.css`。demo 的 Vite 配置继续通过 `vScrollThemePlugin` 指定该文件，并在 `dev` 与 `build` 下自动生成对应 JS 模块和 import map。

### Plugin Contract

`vScrollThemePlugin` 继续保证：

- 输入 CSS
- 生成 `v-scroll.js`
- 在 HTML 中自动注入 `$/v-scroll.js` 的精确 import map
- `public/...` 路径在 build 后正确写到 `dist/...`
- 非 `v-scroll.js` 文件名直接报错

## Testing Strategy

### Public API Tests

公开接口测试只验证：

- `v-scroll` 根入口仅暴露组件初始化 API
- `v-scroll/plugin` 可正常导入 `vScrollThemePlugin`

### Internal Tests

内部实现测试继续直接引用源码模块：

- math 测试引用 `src/virtual-scroll/math.ts`
- plugin 测试引用 `src/plugins/vscroll-theme.ts`
- theme 注入测试引用 `src/runtime/inject-theme-css.ts`

这样测试覆盖仍然完整，但不会把内部实现误定义成公开契约。

### Regression Coverage

需要额外覆盖以下回归场景：

- 包根入口不再导出 math API
- `v-scroll/plugin` 可以被 demo 的 `vite.config.ts` 消费
- 默认 theme 迁移到 `src/theme/default/` 后，运行时 fallback 仍然生效
- demo theme 迁移到 `src/theme/night/` 后，`dev` 和 `build` 仍能注入自定义 theme

## Verification

修改完成后必须运行：

```bash
./build.sh
```

并执行真实浏览器验证：

- `bun run dev:demo`
- `bun run build`
- `bunx vite preview --config vite.config.ts --host 127.0.0.1 --port 4173`

浏览器验证标准：

- demo 页面能加载
- 自定义 theme 的 `v-scroll.js` 被实际请求
- 默认 theme fallback 仍能在无 import map 场景下工作
- `dist/index.html` 含有正确的精确 import map

## Success Criteria

- 外部运行时代码只需使用 `v-scroll`
- 外部 Vite 配置只需使用 `v-scroll/plugin`
- 包根入口不再泄露 math 和其他内部实现
- 默认 theme 与 demo theme 都已迁移到各自的 `src/` 目录下
- 包结构、声明文件、构建产物和测试行为一致
