### Project: v-scroll

基于 Vite + TypeScript 的原生 Web Component 项目，提供 `<v-scroll>` 自定义元素、主题 CSS 注入能力和对应的 Vitest 验证。

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

### 常用命令

- `bun i`: 安装项目依赖。
- `bun run dev`: 启动 Vite 开发服务器，默认端口 `5173`。
- `bun run build`: 生成生产构建到 `dist/`。
- `bun run preview`: 预览构建产物，默认端口 `4173`。
- `bun run check`: 运行 TypeScript 类型检查。
- `bun run test`: 运行 Vitest 测试。
- `./build.sh`: 串行执行 `check`、`test`、`build`，用于改动后的完整验证。

---

### 项目架构

```text
├── src/
│   ├── main.ts # 演示入口，注册元素并注入主题样式
│   ├── elements/
│   │   └── v-scroll.ts # <v-scroll> 自定义元素实现
│   ├── runtime/
│   │   └── inject-theme-css.ts # 将主题样式注入到 document.head
│   ├── demo/
│   │   └── seed-content.ts # 生成演示用滚动内容
│   ├── theme-imports/
│   │   └── v-scroll.js # 由 Vite 插件生成的主题模块
│   └── vite-env.d.ts # Vite 类型声明
├── scripts/
│   └── vite-plugin-vscroll-theme.ts # 编译主题 CSS 并生成导入模块
├── themes/
│   └── default/
│       └── v-scroll.css # 默认主题样式源文件
├── tests/
│   ├── setup.ts # 测试环境初始化
│   ├── v-scroll.test.ts # 自定义元素行为测试
│   ├── inject-theme-css.test.ts # 主题注入逻辑测试
│   └── vite-plugin-vscroll-theme.test.ts # Vite 插件生成链路测试
├── docs/
│   └── superpowers/ # 项目规格和执行计划文档
├── index.html # 本地演示页面入口
├── vite.config.ts # Vite 与 Vitest 配置
└── build.sh # 一键校验与构建脚本
```

---

### 重要说明

- TDD驱动模式，完善的单测、集成测试。
- 所有测试都需要使用真实环境，不要mock。例如，数据库使用真实数据库等。
- 遇到问题优先使用 /systematic-debugging 彻底查明原因，再去解决。解决完之后，一定要验证、跑完所有测试才可以生成完成。
- 端口号勿随意修改。
- `customElements` 需要继承 `HTMLElement` 时，可以使用最小范围的类实现原生自定义元素。
- `themes/default/v-scroll.js` 是由 Vite 插件生成的主题模块，不手动编辑。
- 主题样式应优先修改 `themes/default/v-scroll.css`，再通过插件生成链路同步产物。
- 提交前优先执行 `./build.sh`，不要只跑单项命令后直接结束。
