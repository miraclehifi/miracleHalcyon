# 书影音分类导航改用 GooeyNav 交互

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

书影音分类导航 `MediaTypeTabs` 改用 [React Bits GooeyNav](https://reactbits.dev)（TypeScript + Tailwind 版）：切换分类时，当前胶囊碎成水滴飞向新分类、融合成新胶囊，悬停项有柔和底色。上游源码由作者在 2026-10-22 对话中提供，vendor 到 `src/components/vendor/react-bits/GooeyNav.tsx`。

## 目标与验收

**目标**: 读者端 `/media*` 与后台 `/admin/media` 的分类导航使用 GooeyNav 的胶囊与水滴动效，同时保留路径路由（每个分类一个预渲染页、可分享地址）、无 JS 可用和现有无障碍结构。

**验收条件**:
- [x] [components.md](../ui/components.md) 写明 `MediaTypeTabs` 底层使用 GooeyNav，以及参数对照和需要改的源码
- [x] [reader-media.md](../ui/pages/reader-media.md) 分类切换、响应式、可访问性改为 GooeyNav 口径
- [x] 普通左键点击未选中的分类：水滴动画播完后（≤ 700ms）跳到该分类地址；Ctrl / ⌘ / Shift / 中键点击按浏览器默认行为（新标签页等），不播动画
- [x] `prefers-reduced-motion` 时不播水滴，点击立即跳转
- [x] 水合前（及无 JS）当前分类已显示反色胶囊，不出现"先无胶囊、水合后才出现"的闪烁
- [x] 胶囊颜色取令牌 `ink`、胶囊内文字取 `bg`，随亮 / 暗主题切换
- [x] 每项仍是 `<a href>`，当前项 `aria-current="page"`，外层 `<nav aria-label="书影音分类">`
- [x] 读者页除分类导航岛外不加载 React（BH-17 收窄）（2026-10-22 任务 8 完成：构建用例 TC-US03-11 断言每页只有 `MediaTypeTabs` 一个岛；后台列表部分任务 4 已完成）

## 影响分析

- **影响范围**:
  - UI：`specs/ui/components.md`（`MediaTypeTab` 行与新增"分类导航参数"）、`specs/ui/pages/reader-media.md`、`specs/ui/pages/admin-media.md`（分类引用）
  - 产品 / 测试：US-03 `behaviors.md` BH-17、`US-03-tests.md` TC-US03-11 改为"仅分类导航岛引用 React"
  - 工程：F-005 `feature-architecture.md`（`MediaTypeTabs` 由 `.astro` 改为 React 岛）、ADR-012"读者页零 JS"加注例外
  - 任务：Sprint 9 任务 4（后台列表）、任务 8（读者页）的 `MediaTypeTabs` 改为 `MediaTypeTabs.tsx` + `client:load`；GooeyNav vendor 文件随任务 4 或 8（先做的那个）落地
- **设计稿**: [admin.pen](../ui/admin.pen) `MediaTypeTab/Selected` 圆角由 4 改为胶囊（高度一半）；动画画不出静态稿
- **依赖项**: 无新 npm 依赖（GooeyNav 只用 React + WebGL2，不支持 WebGL2 时用组件自带的 DOM 胶囊兜底）
- **决策**（2026-10-22，AI 按作者需求设计，作者偏好文档阶段不逐项确认）:
  - 范围：读者端与后台共用的 `MediaTypeTabs` 一起换（同一组件，不分两套外观）
  - 路由：保留路径路由；点击先播动画再整页跳转，而不是改成单页内切换（保留可分享地址、每页只含一个分类的 HTML）
  - 外观：`frame={false}`（不要磨砂底板，保持纸面风格），`size="sm"`，胶囊为全圆角
  - 手机：不再横向滚动，放不下时换行（GooeyNav 的列表本身 `flex-wrap`，水滴可跨行；画布外扩 72px，放在横向滚动容器里会被裁切）

## 估算

- **规模**: S

## 备注

- F-005 处于 implementation，任务 4、8 均未开始，本条只改规格与任务描述，代码随这两个任务实现
