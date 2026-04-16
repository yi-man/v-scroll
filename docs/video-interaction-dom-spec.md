# 虚拟滚动条视频还原：DOM 结构与交互细节

> 依据来源：
> - 题目 PDF：`/Users/xxwade/tmp/前端笔试题：原生虚拟滚动条组件.pdf`
> - 本地截图：`/Users/xxwade/mine/claude-code-projects/v-scroll/.superpowers/video-frames/`
>
> 本文仅根据截图可观测行为总结，不引入未出现的视觉特性。

## 1. 组件视觉区域拆解（从外到内）

从截图可稳定识别出 3 层：

1. **外层容器（可视边框框）**
   - 白底、浅灰边框矩形。
   - 固定可视高度（约 320px 量级）。
   - 右侧预留自定义滚动条展示区域。

2. **真实滚动视口（内容承载层）**
   - 内容是连续文本行（`Welcome to vibe N`）。
   - 滚动后文本编号连续变化，说明是原生滚动而非分页切换。
   - 系统默认滚动条被隐藏，用户看到的是自定义滑块。

3. **自定义滚动条层**
   - 位于容器右侧内边距位置，不侵入正文主列。
   - 包含细长轨道区域 + 圆角滑块（thumb）。
   - 滑块高度明显小于容器高度，并随可滚动内容比例变化（截图里表现为固定范围内短条）。

## 2. 推荐 DOM 结构（与截图一致的最小实现）

可落地的最小结构如下：

```html
<v-scroll data-scrollable="yes|no" data-dragging="yes|no">
  #shadow-root
  <div part="frame" data_v_scroll_frame="yes">
    <div part="viewport" data_v_scroll_viewport="yes">
      <slot></slot>
    </div>
    <div part="track" data_v_scroll_track="yes" aria-hidden="true" data-visible="yes|no">
      <div part="thumb" data_v_scroll_thumb="yes"></div>
    </div>
  </div>
</v-scroll>
```

说明：
- `viewport` 是真实 `overflow: auto` 滚动容器。
- `track/thumb` 只负责“外观与拖拽输入”，位置通过 `thumb` 的 `translateY(...)` 映射。
- 通过 `part` 对外暴露样式定制点，满足题目“外部样式控制状态”的要求。

## 3. 交互细节（按时间线）

### 3.1 默认态
- 初始可见：文本列表 + 右侧细灰滑块。
- 滑块位置接近顶部，代表 `scrollTop` 接近 0。

### 3.2 内容滚动态（鼠标滚轮/触控板）
- 当内容向下滚动时，滑块同步向下移动。
- 从 `frame-01` 到 `frame-25` 可见：
  - 文本从 `vibe 2x` 区间过渡到 `vibe 8x/9x` 区间。
  - 滑块从轨道上段逐步移动到下段。
- 结论：滚动条是“内容驱动”，不是独立动画。

### 3.3 滑块悬停态（hover）
- 在滑块附近出现指针反馈变化（截图工具的指针样式变化可见）。
- 滑块视觉对比度略增强（深一些），用于提示可拖拽。

### 3.4 拖拽态（pointer drag）
- 按下滑块后进入 dragging：
  - 滑块颜色进一步增强（通常为强调色或更深色）。
  - 持续移动指针时，内容行号实时变化。
- 拖拽到轨道不同位置时，内容跳转到对应比例位置（非逐行步进）。

### 3.5 选择干扰防护
- 在 `frame-26 ~ frame-28` 出现大面积蓝色文本选中痕迹，反证了“若未处理好会误选中文本”这一风险。
- 题目要求中也明确指出拖拽时需防止异常文本选择，最终实现应保证：
  - 拖拽 thumb 不触发内容文本选中。
  - 指针移出 thumb 仍保持拖拽连续（依赖 pointer capture）。

## 4. 状态机抽象（建议直接用于实现）

核心状态：
- `scrollable = no|yes`：内容是否超出容器高度。
- `dragging = no|yes`：当前是否处于滑块拖拽。
- `trackVisible = no|yes`：轨道是否展示（可与 scrollable/hover/dragging 联动）。

关键事件：
- `scroll`（来自 viewport）
- `pointerenter/pointerleave`（thumb）
- `pointerdown/pointermove/pointerup/pointercancel`（thumb）
- `lostpointercapture`
- `resize`（容器或内容尺寸变化）
- `slotchange`（插槽内容变更）

状态转移要点：
1. `pointerdown` 且可滚动 -> `dragging=yes`，记录起点。
2. `pointermove` 且处于 dragging -> 计算 `thumbOffset`，映射到 `scrollTop`。
3. `pointerup/cancel/lostcapture` -> `dragging=no`，恢复用户选择状态与光标。
4. `scroll/resize/slotchange` -> 重新计算 `thumbSize + thumbOffset`。

## 5. 几何映射规则（从截图行为反推）

设：
- `clientSize = viewport.clientHeight`
- `scrollSize = viewport.scrollHeight`
- `maxScrollTop = scrollSize - clientSize`
- `trackSize = track.clientHeight`
- `topGap/bottomGap = 轨道上下保留间距（题目示例为 3px）`

则：
1. **thumb 高度**
   - `thumbSize = max(MIN_SIZE, (clientSize / scrollSize) * trackSize)`
2. **thumb 可移动范围**
   - `dragRange = trackSize - topGap - bottomGap - thumbSize`
3. **映射**
   - `scrollTop = ((thumbOffset - topGap) / dragRange) * maxScrollTop`
   - `thumbOffset = topGap + (scrollTop / maxScrollTop) * dragRange`
4. **边界处理**
   - `thumbOffset`、`scrollTop` 均需 clamp 到有效区间。

## 6. 可验收检查项（用于对照视频）

- 滚动内容时，thumb 连续同步移动，无抖动。
- 拖拽 thumb 时，内容按比例快速跳转，非逐行离散。
- 拖拽期间不出现文本选中（修复 `frame-26~28` 暴露的问题）。
- 内容不足一屏时，track/thumb 自动隐藏或进入不可交互态。
- 组件销毁后无残留监听、无持续动画帧、无光标样式污染。

## 7. 本次结论

基于截图可确认：该题目目标是**“原生滚动容器 + 自定义可拖拽外观层 + 严格的指针事件管理”**。  
实现重点不是“画出一条滚动条”，而是保证 **滚动映射正确、拖拽连续、状态切换自然、生命周期干净**。

