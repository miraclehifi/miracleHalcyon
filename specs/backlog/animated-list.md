# 文章列表改用 AnimatedList 动效与交互

| 字段 | 值 |
|------|-----|
| 状态 | ready |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

文章列表参考 [React Bits AnimatedList](https://reactbits.dev)（TypeScript + Tailwind 版）：行逐个弹入、键盘上下选择、选中项跟随悬停。AnimatedList 只作底层容器，每行用 `renderItem` 渲染现有卡片，**外观仍是 `PostCard` 的虚线纸质卡片**，不用它自带的磨砂底板、行块和选中框。

## 目标与验收

> 2026-10-14：后台 `PostList` 已实现（Sprint 2 add-post-list-animated-entry）；读者端 `HomePosts` 属 F-002，届时复用同一个 vendor 组件。

**目标**: 两个文章列表有统一的入场动效和键盘选择，同时保留现有卡片外观、无障碍结构、分页和触屏规则。

**验收条件**:
- [x] [components.md](../ui/components.md) 写明 `PostList`、`HomePosts` 底层使用 AnimatedList，以及参数对照和需要改的源码
- [x] [design-tokens.md](../ui/design-tokens.md)"焦点与交互"把列表入场列为过渡的例外，并写明减弱动效时怎么降级
- [x] [admin-post-list.md](../ui/pages/admin-post-list.md) 写明入场动画与方向键选择
- [x] 列表随页面滚动（不出现内部滚动条和上下渐隐），筛选、翻页后整页重新入场
- [x] 选中行 = `PostCard/Hover`（双层错位，边框保持 `line-strong`）；悬停、键盘聚焦、方向键都只改选中行，同一时间只有一行处于该状态
- [x] 焦点在列表内时 ↑ / ↓ / Home / End 把焦点移到对应卡片的标题链接；焦点不在列表内时方向键照常滚动页面
- [x] Tab 顺序、`<a>` + 并列 `<button>` 的结构和读屏名称与现在一致；不使用 `listbox` / `option`
- [x] `prefers-reduced-motion` 时只做透明度渐显，不位移、不缩放、不错开

## 影响分析

- **影响范围**: `specs/ui/components.md`、`specs/ui/design-tokens.md`、`specs/ui/pages/admin-post-list.md`；implement 阶段新增 `AnimatedList` 底层组件
- **设计稿**: [admin.pen](../ui/admin.pen) 不改。动画画不出静态稿，选中态就是已有的 `PostCard/Hover`
- **依赖项**: 无
- **被依赖**: F-001 design-arch（前端组件结构）、implement；F-002 design-ui（`/posts` 页面规格沿用本条）
- **决策**（2026-10-12 与作者确认）:
  - 程度：只借动效和交互，不改卡片外观
  - 范围：后台文章列表 `/admin`、读者端文章列表 `/posts`（首页 `HomePosts` 同一组件）。文章详情侧栏（`TagPostsNav`、`TableOfContents`）和 `DropdownMenu` 不改
  - 滚动：跟随页面滚动，不用固定高度的内部滚动

## 待 design-arch 解决

- **SSR 首屏闪烁**：组件在 hydrate 前给行加 `opacity: 0`（`[data-animated]` 选择器）。Astro 预渲染的 `/posts` 若 JS 晚到，列表会先空白。方向：服务端输出不带 `data-animated`，hydrate 后再加；或 `client:visible` + `<noscript>` 兜底
- ~~**手机长按菜单**~~：长按菜单已由 SwipeRow 左滑抽屉替代，拖动与选中的交互见 [swipe-row-actions.md](swipe-row-actions.md)

## 估算

- **规模**: S

## 备注

- 当前处于 F-001 `ui_design` 阶段，本条先更新设计规格；代码在 plan-tasks 之后按 Sprint 任务实现
