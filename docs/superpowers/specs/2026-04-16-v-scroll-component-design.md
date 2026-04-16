# v-scroll Component Design

## 目标

实现一个符合 PDF 题目要求的 `<v-scroll>` 原生自定义元素，在桌面浏览器中提供真实内容滚动、自定义滚动条外观、拖拽滑块交互、主题样式外置和完整生命周期清理能力。

本轮设计以“通用组件边界不破坏”为前提，在实现冲突时优先还原演示视频中的视觉和交互效果。

## 已确认范围

包含：

- `customElements` 注册 `v-scroll`
- 使用 `Shadow DOM` 做结构隔离
- 代理 `<v-scroll>...</v-scroll>` 内任意 DOM 子内容
- 使用真实 `overflow: auto` 滚动容器
- 隐藏系统原生滚动条并使用自定义轨道与滑块接管外观
- 用独立主题 CSS 控制视觉，不把主题样式写进组件内部
- 用 `ResizeObserver` 监听尺寸变化并动态决定是否显示滚动条
- 根据内容比例计算滑块高度，并设置最小高度下限
- 用 `Pointer Events` 和 pointer capture 完成拖拽
- 按比例把滑块位移映射到滚动容器 `scrollTop`
- 在组件脱离文档时主动销毁 observer、事件和挂起更新
- 保持现有 `importmap + Vite plugin + 主题 CSS 转 JS 模块` 链路
- 为桌面浏览器场景编写单测

不包含：

- 移动端触摸拖拽优化
- 对外公开方法或属性 API
- 多主题切换 UI
- GitHub Pages / Cloudflare Pages 部署
- 与题目无关的框架接入

## PDF 要求映射

### 1. 结构与样式隔离

PDF 要求：

- 必须使用 `customElements` 注册名为 `v-scroll` 的组件
- 组件需要代理被 `<v-scroll>...</v-scroll>` 包裹的任意 DOM 内容
- 方案必须是“真实滚动容器 + 隐藏原生滚动条 + 自定义 DOM 外观”
- 滚动轨道和滑块样式不能写在 JavaScript 的 Shadow DOM 中，必须提取到独立 CSS 样式表中
- 外部 CSS 必须可以控制 hover / dragging 状态

设计响应：

- 宿主组件使用 `customElements.define("v-scroll", ...)`
- Shadow DOM 内仅承载结构和状态标记，用户内容通过 `slot` 透传
- 真正滚动的是内部 `viewport`，不是手写位移模拟
- 视觉样式由 `themes/default/v-scroll.css` 提供，并通过现有主题注入链路注入全局
- 通过 `::part(frame|viewport|track|thumb|grab)` 与 CSS 变量暴露主题控制面

### 2. 尺寸探测与生命周期管理

PDF 要求：

- 使用原生 `ResizeObserver` 监听滚动容器与内容高度差变化
- 动态决定是否显示自定义滚动条结构
- 滑块高度必须根据内容高度自适应，并设置最低下限
- 组件脱离文档流后，必须主动销毁内部定时器、解绑滚动与观察者监听

设计响应：

- `ResizeObserver` 同时观测 `viewport` 和内容承载节点
- 所有测量统一进入 `syncLayout()`
- `syncLayout()` 负责计算 `hidden / visible`、滑块高度和偏移
- 通过 `MIN_THUMB_SIZE` 钳制滑块最小高度
- 在 `disconnectedCallback` 中执行 `dispose()`，断开观察者、移除事件、取消 RAF 和拖拽态

### 3. 指针捕捉与拖拽映射

PDF 要求：

- 必须使用原生 `Pointer Events`
- 必须使用相关捕捉 API
- 拖拽时需要按比例映射到滚动容器的 `scrollTop`
- 需要考虑滑块上下两端的 CSS 像素预留间距，例如 `3px`

设计响应：

- `thumb` 上使用 `pointerdown / pointermove / pointerup / pointercancel`
- `pointerdown` 后调用 `setPointerCapture(pointerId)`
- 拖拽只在“扣除上下预留间距和 thumb 自身高度后的有效轨道区间”内计算
- 默认 `topGap = 3px`、`bottomGap = 3px`
- 公式显式写入实现与测试：

```text
maxScrollTop = scrollHeight - clientHeight
effectiveTrack = trackHeight - topGap - bottomGap - thumbHeight
thumbOffset = clamp(rawOffset, 0, effectiveTrack)
scrollTop = effectiveTrack <= 0 ? 0 : (thumbOffset / effectiveTrack) * maxScrollTop
```

### 4. 基于 Vite Hook 的 CSS 模块化构建

PDF 要求：

- 首页通过 `importmap` 指向主题路径
- 组件内部通过 `import CSS from "$/v-scroll.js"` 获取主题
- 需要使用 Vite 自定义插件，在 `configResolved` 中读取 CSS、压缩并包装成 `export default '...'`

设计响应：

- 保持当前 `$/v-scroll.js` 约定不变
- 继续使用现有 `scripts/vite-plugin-vscroll-theme.ts`
- 主题源仍在 `themes/default/v-scroll.css`
- 组件运行时继续通过 `ensureThemeCss()` 注入主题

## 方案选择

备选方案有三类：

1. `Shadow DOM + 真实滚动容器 + 绝对定位假滚动条`
2. `Light DOM` 改写用户内容结构
3. 宿主本体滚动 + 覆盖层模拟滚动条

最终选择方案 1。

原因：

- 最符合 PDF 对 `Shadow DOM` 和组件隔离的要求
- 不需要改写用户原始子节点结构
- 真实滚动、视觉主题、拖拽交互和生命周期边界最清晰
- 最容易同时满足视频还原和可维护性

## 组件结构

Shadow DOM 内固定使用以下结构：

```text
<v-scroll>
  #shadow-root
    <div part="frame" data_v_scroll_frame="yes">
      <div part="viewport" data_v_scroll_viewport="yes">
        <slot></slot>
      </div>
      <div part="track" data_v_scroll_track="yes" aria-hidden="true">
        <div part="thumb" data_v_scroll_thumb="yes">
          <img part="grab" data_v_scroll_grab="yes" />
        </div>
      </div>
    </div>
</v-scroll>
```

职责划分：

- `frame`：相对定位外层，承载整体状态
- `viewport`：真实滚动容器
- `slot`：透传用户原始内容
- `track`：自定义轨道，绝对定位在右侧
- `thumb`：可拖拽滑块
- `grab`：滑块内部装饰图标，优先使用 `src/assets/grab.svg`

## 状态模型

组件内部只保留 5 个实现态：

- `hidden`：内容未溢出，不显示自定义滚动条
- `idle`：可滚动，但未 hover、未 drag
- `hover`：鼠标进入组件或轨道区域
- `dragging`：滑块正在拖拽
- `detached`：组件已脱离文档并完成清理

状态切换原则：

- `viewport` 不可滚动时直接进入 `hidden`
- 鼠标进入后从 `idle` 切到 `hover`
- `pointerdown` 后切到 `dragging`
- `pointerup / pointercancel` 后回到 `hover` 或 `idle`
- `disconnectedCallback` 后进入 `detached`

状态只驱动类名或 `data-state`，不直接承载主题颜色值。

## 布局同步与测量

所有布局变化统一经过 `syncLayout()`，不分散逻辑。

触发来源：

- `viewport` 的 `scroll`
- `ResizeObserver` 观察 `viewport`
- `ResizeObserver` 观察内容承载节点
- `slotchange`
- 初始化完成时的首次同步

`syncLayout()` 负责：

1. 读取 `clientHeight`、`scrollHeight`、`scrollTop`
2. 判断是否存在溢出
3. 计算 `thumbHeight`
4. 计算 `thumbOffset`
5. 决定 `track` 显示状态
6. 将计算结果同步到 DOM 和状态标记

滑块高度公式：

```text
visibleRatio = clientHeight / scrollHeight
rawThumbHeight = visibleRatio * usableTrackHeight
thumbHeight = max(MIN_THUMB_SIZE, rawThumbHeight)
```

其中 `usableTrackHeight = trackHeight - topGap - bottomGap`。

## 拖拽映射算法

这是 PDF 中的显式强制项，必须独立实现和测试。

常量默认值：

- `TRACK_TOP_GAP = 3`
- `TRACK_BOTTOM_GAP = 3`
- `MIN_THUMB_SIZE = 16`

拖拽流程：

1. `pointerdown` 记录 `startClientY` 和 `startThumbOffset`
2. 调用 `thumb.setPointerCapture(pointerId)`
3. `pointermove` 中计算 `deltaY = currentClientY - startClientY`
4. 计算 `rawOffset = startThumbOffset + deltaY`
5. 将 `rawOffset` clamp 到有效轨道范围
6. 按比例反推 `viewport.scrollTop`
7. 由正常的 `scroll` 与 `syncLayout()` 回写视觉位置

核心公式：

```text
maxScrollTop = scrollHeight - clientHeight
effectiveTrack = trackHeight - TRACK_TOP_GAP - TRACK_BOTTOM_GAP - thumbHeight
thumbOffset = clamp(rawOffset, 0, effectiveTrack)
scrollTop = effectiveTrack <= 0 ? 0 : (thumbOffset / effectiveTrack) * maxScrollTop
```

关键约束：

- 上下两端预留间距必须参与计算，不能直接用整条轨道高度映射
- 真实数据源始终是 `viewport.scrollTop`
- 拖拽时禁止文本异常选中

## 生命周期与销毁

初始化：

- `connectedCallback` 中创建结构、绑定事件、注册 observer、执行首轮同步

销毁：

- `disconnectedCallback` 中调用 `dispose()`
- `dispose()` 必须断开所有 `ResizeObserver`
- 解绑 `scroll`、`pointer`、`mouseenter`、`mouseleave` 等监听
- 取消挂起的 `requestAnimationFrame`
- 清理拖拽中的 pointer capture 和内部状态

重新挂载：

- 组件若再次插入文档，由 `connectedCallback` 重新初始化

## 样式策略

视觉样式全部放在独立主题 CSS 中，不在组件内部注入视觉 `<style>`。

主题应控制：

- 轨道宽度和右侧 inset
- thumb 半径、背景、边框、阴影
- hover 和 dragging 两种显式状态
- `grab` 图标的透明度、缩放、显示方式

建议暴露的 CSS 变量：

- `--v-scroll-track-width`
- `--v-scroll-track-inset`
- `--v-scroll-thumb-radius`
- `--v-scroll-thumb-bg`
- `--v-scroll-thumb-bg-hover`
- `--v-scroll-thumb-bg-dragging`
- `--v-scroll-thumb-min-size`
- `--v-scroll-thumb-gap`

建议暴露的 part：

- `frame`
- `viewport`
- `track`
- `thumb`
- `grab`

## 视频还原策略

从演示视频中确认的关键目标：

- 组件右侧是细长、轻量的自定义滚动条，而不是系统默认滚动条
- `thumb` 在顶部、中段、底部位置时都有明确的上下留白
- 拖拽态会进入高亮视觉状态
- 组件整体保持简洁，适合嵌入任意页面

实现时优先保证这些可见行为与 PDF 强制项不冲突。

## 测试策略

单测至少覆盖：

1. `v-scroll` 注册成功并能渲染 shadow 结构
2. Light DOM 子内容通过 `slot` 代理进入真实滚动容器
3. 无溢出时隐藏轨道
4. 有溢出时按比例计算 thumb 高度，且遵守最小高度
5. `scrollTop` 变化时 thumb 位置同步更新
6. 拖拽 thumb 时会调用 pointer capture，并按带上下预留间距的公式映射 `scrollTop`
7. `disconnectedCallback` 后 observer 与事件被清理

## 实施边界

为了避免过度设计，本次实现不做：

- 公共方法例如 `refresh()`、`scrollTo()`、`destroy()`
- 移动端触摸体验专门优化
- 水平滚动条
- 多实例共享全局状态

## 验收标准

以下条件同时满足才算完成：

1. `<v-scroll>...</v-scroll>` 能代理并显示任意内容
2. 内容溢出时显示自定义轨道与滑块，不溢出时隐藏
3. 原生滚动仍然真实存在，滚轮和拖拽都能驱动内容滚动
4. 拖拽滑块使用 `Pointer Events` 与 pointer capture
5. `scrollTop` 与 thumb 位置双向映射正确，且考虑上下 `3px` 预留间距
6. 视觉样式来自独立主题 CSS，而不是组件内部硬编码主题
7. 组件脱离文档后能正确清理 observer 和监听
8. 现有 `./build.sh` 和测试可以覆盖并验证该实现
