### Project: v-scroll (monorepo)

基于 Bun Workspace + Vite + TypeScript 的原生 Web Component 项目，提供 `packages/v-scroll` 组件库与 `apps/demo` 演示应用。

---

### 规范

- 用 bun i 安装依赖
- 用最现代的 js 写法
- const 定义的常量要大写，函数用驼峰风格命名
- 函数用 const funcname = ()=>{} 这种格式来定义, 不要用 function 定义函数
- 合并多个连续的 const 声明为一个,要写 `const a=1, b=2, c=3;`（而不是 `const a=1;const b=2;const c=3`）
- import 导入函数，避免直接导入模块
- 命名要极简，变量名用下划线风格，函数名用小写驼峰风格
- 用 await 不要用 .then
- 写纯函数，不要写类
- 注重代码复用，多定义函数，避免出现大量类似的代码结构
- 用最新浏览器支持的原生 css nesting，减少代码冗余
- export default 的函数、变量，除非是在 import.meta.main 中有调用需求，否则不要声明const变量再导出
- 修改后运行 ./build.sh 修复错误

---

### 常用命令（在仓库根目录执行）

- `bun i`: 安装项目依赖。
- `bun run dev:demo`: 先构建组件库，再启动 demo 开发服务器（`apps/demo`）。
- `bun run build:lib`: 构建组件库 `packages/v-scroll`。
- `bun run build:demo`: 构建 demo（依赖库产物存在）。
- `bun run build`: 顺序执行 `build:lib` + `build:demo`。
- `bun run check`: workspace 级 TypeScript 检查（lib + demo）。
- `bun run test`: workspace 级测试（workspace config + lib + demo）。
- `./build.sh`: 串行执行 `check` -> `test` -> `build` 的完整验证。

---

### 项目架构

```text
├── apps/
│   └── demo/ # 演示应用（vite）
│       ├── src/
│       └── public/themes/ # 主题构建输出（js）
├── packages/
│   └── v-scroll/ # 组件库主包
│       ├── src/
│       └── dist/
├── scripts/
│   └── ... # 共享脚本（如主题构建相关逻辑）
├── tests/ # workspace 级测试（如 workspace-config）
├── vitest.workspace-config.ts
└── build.sh # 一键校验与构建脚本
```

---

### 重要说明

- TDD驱动模式，完善的单测、集成测试。
- 遇到问题优先使用 /systematic-debugging 彻底查明原因，再去解决。解决完之后，一定要验证、跑完所有测试才可以生成完成。
- 端口号勿随意修改。
- `customElements` 需要继承 `HTMLElement` 时，可以使用最小范围的类实现原生自定义元素。
- 本地联调优先使用 `bun run dev:demo`，它会先构建库再启动 demo，避免 demo 读取旧库产物。
- 提交前优先执行 `./build.sh`，不要只跑单项命令后直接结束。
