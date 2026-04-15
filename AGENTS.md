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
