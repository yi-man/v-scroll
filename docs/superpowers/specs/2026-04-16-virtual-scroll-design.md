# Virtual Scroll 组件设计文档

## 目标

将当前的 `v-scroll` 从**自定义滚动条**重构为真正的**虚拟滚动条**组件，实现仅渲染可见内容的能力，支持大数据量场景。

## 核心概念

### 什么是虚拟滚动？

```
传统滚动:                    虚拟滚动:
┌──────────┐                 ┌──────────┐
│ Item 1   │ ← DOM          │ Item 1   │ ← DOM (可见)
│ Item 2   │ ← DOM          │ Item 2   │ ← DOM (可见)
│ Item 3   │ ← DOM          │ Item 3   │ ← DOM (可见)
│ ...      │                ├──────────┤
│ Item 999 │ ← DOM          │          │ ← 虚拟区域 (无DOM)
│ Item 1000│ ← DOM          │          │
└──────────┘                └──────────┘
1000个DOM节点               3个DOM节点
```

### 虚拟滚动核心算法

```typescript
// 1. 计算虚拟总高度
virtualHeight = data.length * itemHeight

// 2. 计算可视区域
visibleCount = Math.ceil(viewportHeight / itemHeight)

// 3. 计算当前起始索引
startIndex = Math.floor(scrollTop / itemHeight)

// 4. 计算实际渲染范围（加缓冲区）
buffer = 2 // 上下各多渲染2项防止白边
renderStart = Math.max(0, startIndex - buffer)
renderEnd = Math.min(data.length, startIndex + visibleCount + buffer)

// 5. 计算偏移量
translateY = renderStart * itemHeight
```

## 架构设计

### DOM 结构

```html
<v-scroll>
  #shadow-root
    ┌─ .frame ───────────────────────────────┐
    │                                         │
    │  ┌─ .viewport (overflow-y: auto) ────┐  │
    │  │                                    │  │
    │  │  ┌─ .virtual-container ────────┐ │  │
    │  │  │   height: 50000px (虚拟高度)  │ │  │
    │  │  └─────────────────────────────┘ │  │
    │  │                                    │  │
    │  │  ┌─ .items-container ──────────┐  │  │
    │  │  │  transform: translateY(1000px)│  │  │
    │  │  │                              │  │  │
    │  │  │  ┌─ .item ───────────────┐   │  │  │
    │  │  │  │  实际DOM项 (可见)     │   │  │  │
    │  │  │  └───────────────────────┘   │  │  │
    │  │  │  ┌─ .item ───────────────┐   │  │  │
    │  │  │  │  实际DOM项 (可见)     │   │  │  │
    │  │  │  └───────────────────────┘   │  │  │
    │  │  └─────────────────────────────┘  │  │
    │  └───────────────────────────────────┘  │
    │                                         │
    │  ┌─ .track (自定义滚动条) ────────────┐  │
    │  │  ┌─ .thumb ────────────────────┐  │  │
    │  │  │                             │  │  │
    │  │  └─────────────────────────────┘  │  │
    │  └───────────────────────────────────┘  │
    └─────────────────────────────────────────┘
</v-scroll>
```

### 组件职责划分

```typescript
class VScrollElement extends HTMLElement {
  // ========== 核心属性 ==========
  data: any[]              // 完整数据集
  itemHeight: number       // 每项固定高度
  buffer: number          // 上下缓冲项数
  
  // ========== 内部状态 ==========
  scrollTop: number       // 当前滚动位置
  viewportHeight: number  // 可视区高度
  startIndex: number      // 当前起始索引
  
  // ========== DOM 引用 ==========
  viewport: HTMLElement   // 滚动容器
  virtualContainer: HTMLElement  // 虚拟高度占位
  itemsContainer: HTMLElement    // 实际项容器
  items: HTMLElement[]    // 实际DOM项池（复用）
  
  // ========== 核心方法 ==========
  render(): void          // 根据scrollTop计算并渲染
  updateItems(): void     // 更新可见项数据
  syncScrollbar(): void   // 同步自定义滚动条位置
  
  // ========== 生命周期 ==========
  connectedCallback(): void
  disconnectedCallback(): void
}
```

## 与当前实现的对比

| 特性 | 当前实现 | 新虚拟滚动实现 |
|------|---------|--------------|
| **核心目标** | 美化滚动条 | 海量数据渲染 |
| **内容渲染** | 全部DOM | 仅可见区+缓冲 |
| **虚拟高度** | 无 | 计算得出 |
| **DOM项复用** | 无 | 池化复用 |
| **适用数据量** | < 1000项 | 无限制（百万级） |
| **滚动体验** | 原生滚动 | 虚拟滚动 + 可选自定义滚动条 |

## 实现计划

### 阶段1：核心虚拟滚动引擎
1. 重构 DOM 结构，添加虚拟高度容器
2. 实现可见区域计算算法
3. 实现 DOM 项池化复用机制

### 阶段2：数据驱动渲染
1. 添加 `data` 属性支持
2. 实现 `renderItem` 回调
3. 支持动态数据更新

### 阶段3：滚动条集成
1. 保留现有自定义滚动条逻辑
2. 适配虚拟滚动计算
3. 支持原生滚动条 fallback

### 阶段4：测试与优化
1. 大数据量性能测试
2. 边界情况处理
3. 内存泄漏检查

这个设计是否满足你的预期？我是否可以继续编写详细的技术实现文档？
