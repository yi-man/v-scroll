# Package / Demo Layering Design

## 目标

把当前 `v-scroll` 仓库从“单一 Vite app 同时承载包实现和 demo”调整为“单仓、分层、可独立理解”的结构：

- `package` 负责组件源码、主题生成链路、库构建和测试
- `demo` 负责消费包、开发预览和 Vercel 部署
- 保持现有工具栈不变，继续使用 `Vite + TypeScript + Bun`

本轮不做 npm 发布流程设计，但新的结构必须为未来发布包保留自然路径。

## 已确认范围

包含：

- 调整为 `packages/v-scroll` + `apps/demo` 的目录结构
- 将主题 CSS、主题生成 plugin 和相关产物明确归属到包侧
- 为包和 demo 建立分层的 Vite 构建配置
- 明确 `dev` 模式和 `build` 模式下 demo 对包的解析方式
- 调整根目录命令编排，显式区分 `build:lib` 和 `build:demo`
- 保持现有测试能力，但重新划分测试归属
- 保持 demo 可部署到 Vercel

不包含：

- npm 发布脚本、版本管理和 changelog 流程
- 引入新的构建工具、打包器或 monorepo 管理器
- 新增第二个 demo app 或文档站
- 对组件运行时能力做功能性改造

## 当前问题

当前仓库虽然本质上已经包含“包实现”和“demo 页面”两种职责，但结构仍然是单一 app：

- `src/main.ts` 同时承担组件注册、主题注入和 demo 页面渲染
- `vite build` 默认产出的语义更接近 demo app，而不是独立库
- `vercel.json` 直接面向当前 app 构建，没有体现“先包后 demo”的依赖关系
- 主题 plugin 和主题源文件虽然属于包能力，但仍和根级应用结构耦合

这样的问题是：

- 目录不能表达职责边界
- demo 很容易继续直接依赖包内部实现细节
- 未来发包前还要再次拆结构
- 构建和部署链路无法清晰验证“demo 消费构建产物”的真实场景

## 方案选择

本轮考虑三类方案：

### 方案 A：轻量分层，保留单 app 结构

- 只把源码分到 `src/lib` 和 `src/demo`
- 根目录继续只保留一套 Vite 配置和单一构建上下文

优点：

- 改动最小
- 学习成本最低

缺点：

- 只是“视觉分层”，不是“职责分层”
- 包和 demo 仍共享同一构建语义，后续容易再次耦合
- 不利于未来发布包

### 方案 B：Workspace 分层，`packages/v-scroll` + `apps/demo`

- 包和 demo 各自拥有目录、入口和 Vite 配置
- 根目录负责 workspace 编排和统一脚本
- demo 在开发态吃源码，在构建态吃库产物

优点：

- 目录、构建、部署三条边界都清晰
- 不更换工具栈
- 最符合未来发布包的自然路径

缺点：

- 需要维护两份 Vite 配置
- 根目录脚本编排会比现在更明确也更严格

### 方案 C：Workspace 分层，但 demo 始终消费构建产物

- 结构同方案 B
- dev 和 build 都要求先产出库，再让 demo 消费

优点：

- 最接近最终发布态

缺点：

- 本地开发效率明显变差
- 不符合“dev 模式下直接引入未编译包源码”的目标

## 选型结论

选择方案 B。

原因：

- 同时满足“结构清晰”和“开发效率高”
- 开发态下 demo 直接消费源码，反馈最快
- 构建态下 demo 消费库产物，验证最真实
- 不更换 `Vite + TypeScript + Bun` 工具链
- 未来补充发包流程时基本不需要再做结构级重构

## 目标结构

建议调整后的仓库结构：

```text
.
├── apps/
│   └── demo/
│       ├── src/
│       │   ├── main.ts
│       │   └── demo-data.ts
│       ├── index.html
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   └── v-scroll/
│       ├── src/
│       │   ├── index.ts
│       │   ├── virtual-scroll/
│       │   ├── runtime/
│       │   ├── theme-imports/
│       │   └── assets/
│       ├── tests/
│       ├── themes/
│       │   └── default/
│       │       └── v-scroll.css
│       ├── scripts/
│       │   └── vite-plugin-vscroll-theme.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── docs/
│   └── superpowers/
│       ├── plans/
│       └── specs/
├── package.json
├── tsconfig.json
├── build.sh
└── vercel.json
```

原则：

- `packages/v-scroll` 是真正的产品单元
- `apps/demo` 是真正的消费端和部署单元
- 根目录只负责编排，不承载包内部实现细节
- 根目录通过 Bun workspaces 管理 `apps/*` 和 `packages/*`

## 模块边界

### 包侧职责

`packages/v-scroll` 负责：

- `v-scroll` 组件实现
- virtual scroll 算法和 DOM 结构
- 主题注入 runtime
- 主题源文件
- 主题生成 plugin
- 库构建产物
- 类型导出
- 包级测试

包侧不负责：

- `#app` 页面初始化
- demo 数据构造
- demo 文案和布局
- Vercel 展示页面逻辑

### Demo 侧职责

`apps/demo` 负责：

- 演示页面入口
- demo 数据和示例内容
- demo 页面布局和文案
- 调用包导出的公开 API
- Vercel 部署产物

demo 侧不负责：

- 组件内部实现
- 主题 plugin
- 主题源文件维护
- 读取包内部私有模块路径

## Plugin 与主题链路归属

主题链路完整归属到包侧。

明确归属如下：

- `packages/v-scroll/scripts/vite-plugin-vscroll-theme.ts`
- `packages/v-scroll/themes/default/v-scroll.css`
- `packages/v-scroll/src/theme-imports/v-scroll.js`

原因：

- 该 plugin 的职责是把包拥有的主题样式编译成包可消费模块
- 它服务的是组件构建约定，不服务 demo 展示逻辑
- demo 只是消费者，不应拥有包内部生成链路

根目录只允许编排，不承载这个 plugin 的实现。

## 包入口与公开接口

包对外只暴露稳定入口，不暴露 demo 相关内容。

建议公开接口：

- `registerVScroll`
- 需要公开的类型
- 必要的 runtime 初始化入口

不公开：

- demo 数据函数
- demo 页面结构
- 包内部私有目录，例如 `virtual-scroll/dom`、`scripts/*`

设计原则：

- 消费方能理解“包能做什么”，不需要理解其内部组织
- 后续可在不破坏消费端的前提下调整包内部实现

## 开发流与构建流

### 开发态

目标：demo 本地开发时直接消费包源码。

做法：

- `apps/demo` 始终使用统一导入名，例如 `import { registerVScroll } from "v-scroll"`
- 在 demo 的 `vite.config.ts` 中，仅 dev 模式对 `"v-scroll"` 做 alias
- alias 指向 `packages/v-scroll/src/index.ts`

效果：

- 改包源码时，demo 直接热更新
- 不需要先手动构建库
- 用户写法在 dev 和 build 两种模式下保持一致

### 构建态

目标：demo 生产构建时消费库产物，而不是源码。

做法：

- `packages/v-scroll/package.json` 的 `exports` 指向 `dist/index.js` 和类型文件
- demo 的生产构建不再为 `"v-scroll"` 提供源码 alias
- `build:demo` 之前必须先执行 `build:lib`

效果：

- demo 构建行为更接近未来真实发包后的消费方式
- 可以尽早暴露“库构建产物是否可被正确消费”的问题

## 命令设计

不建议继续把根命令维持成语义模糊的单一 `dev` / `build`。

建议显式命令如下：

### 根目录

- `bun run dev:demo`
- `bun run build:lib`
- `bun run build:demo`
- `bun run build`
- `bun run check`
- `bun run test`

语义定义：

- `dev:demo`：启动 demo，直接消费包源码
- `build:lib`：只构建 `packages/v-scroll`
- `build:demo`：在库产物就绪的前提下构建 `apps/demo`
- `build`：顺序执行 `build:lib` 和 `build:demo`
- `check`：执行 workspace 范围类型检查
- `test`：执行 workspace 范围测试

### build.sh

`build.sh` 继续作为完整校验入口，但内部顺序调整为面向 workspace 编排。

建议顺序：

1. `check`
2. `test`
3. `build`

这样可以保留现有使用习惯，同时让最终校验符合新的分层结构。

## Vite 配置边界

保留 Vite，但拆为两套职责明确的配置：

- `packages/v-scroll/vite.config.ts`
  - 面向库构建
  - 使用主题 plugin
  - 产出包的 `dist`
- `apps/demo/vite.config.ts`
  - 面向 demo app
  - 处理 dev 模式源码 alias
  - 构建 demo 页面产物

根目录如需保留少量公共配置，应只放共享常量或工具函数，不再承载单一“全局 app 配置”。

## 测试边界

测试需要跟随职责拆分，而不是继续把所有测试都留在根级 `tests/`。

### 包侧测试

放入 `packages/v-scroll/tests`：

- 组件行为测试
- virtual scroll 数学与 DOM 测试
- 主题注入测试
- Vite plugin 生成链路测试

这些测试回答的问题是：

- 包是否能独立成立
- 包的核心能力是否正确
- 主题链路是否完整

### Demo 侧测试

`apps/demo` 默认不承担核心能力测试。

只有在 demo 自身出现复杂逻辑时，才为 demo 添加少量消费端测试。当前阶段 demo 主要承担：

- 可启动
- 可构建
- 可部署

## 部署边界

Vercel 只部署 demo，不部署包。

部署逻辑应体现“先包后 demo”：

- 先执行 `build:lib`
- 再执行 `build:demo`

推荐方式：

- Vercel 项目继续指向仓库根目录
- 由根级构建命令完成编排
- 最终输出仍来自 demo 的构建目录

不推荐让 Vercel 直接只在 `apps/demo` 内独立构建，除非额外补齐它对库产物的前置依赖管理。对当前项目，这样只会增加不必要复杂度。

## 迁移原则

迁移时遵守以下原则：

- 先重划结构和入口，再调整脚本和配置
- demo 只能通过包公开入口消费能力
- 包内部构建资产跟随包移动，不残留在根目录
- 迁移后保留完整校验：类型、测试、构建都必须通过
- 不在本轮顺手加入发包流程，避免范围膨胀

## 成功标准

完成后应满足：

- 仓库目录一眼能看出 package 与 demo 的职责边界
- demo 开发态直接消费 `packages/v-scroll/src`
- demo 构建态只消费 `packages/v-scroll/dist`
- `build:demo` 明确依赖 `build:lib`
- 主题 plugin、主题 CSS 和生成产物都归包管理
- 包测试能独立验证核心能力
- demo 仍可通过 Vercel 正常部署

## 风险与约束

### 风险

- 如果 demo 在实现中继续绕过包入口访问内部文件，分层会被重新破坏
- 如果根命令仍保留模糊语义，团队会回到“默认只管跑通 demo”的旧习惯
- 如果 Vercel 构建没有体现库前置构建，线上产物会和本地预期不一致

### 约束

- 不更换 `Vite + TypeScript + Bun`
- 保留现有主题生成能力
- 保留现有完整校验入口 `./build.sh`
- 现阶段不引入额外 monorepo 工具

## 结论

本轮以 `packages/v-scroll` + `apps/demo` 的 workspace 分层为目标结构。

开发态让 demo 直接消费包源码，保证效率；构建态让 demo 只消费库产物，保证边界真实。主题 plugin 与主题源文件完整归包所有，根目录只负责脚本和流程编排。这样既能解决当前包与 demo 混写的问题，也为后续发布包和扩展示例应用保留了清晰路径。
