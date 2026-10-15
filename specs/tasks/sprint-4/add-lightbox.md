# add-lightbox: 灯箱：打开、切换、关闭

**Sprint**: Sprint 4
**序号**: 7
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 引入 React Bits DepthCarousel（`src/components/vendor/react-bits/DepthCarousel.tsx`，按 components.md"灯箱层叠参数"补 6 处源码改动、文件头记录）；新建 `Lightbox`（scrim、计数、关闭 `OverlayButton`、图注、← → 与箭头切换、首尾不循环、手机拖动切换与下滑关闭、滚动锁、焦点到关闭按钮、关闭后焦点回触发图片）；`ArticleImagesIsland` 首次点击时动态 `import()` 灯箱，单图 / 网格 / 手风琴已展开项打开对应下标
- **影响范围**: `src/components/vendor/react-bits/DepthCarousel.tsx`、`src/components/reader/Lightbox.tsx`、`ArticleImagesIsland.tsx`
- **不变量**: 预览不打开灯箱；加载失败的图片点击不打开
- **不在本任务**: 灯箱内实况播放、焦点循环与减弱动效、失败重试、单张图片（refine-lightbox）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-10](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-10-image-lightbox/story.md) AC2–AC4 |
| 设计依据 | [components.md 灯箱层叠参数](../../ui/components.md) · [design-tokens 灯箱层叠](../../ui/design-tokens.md) · [reader-post-detail.md](../../ui/pages/reader-post-detail.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US10-03](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-10-tests.md) + UT-220：点击单图打开（名称、计数、图注、背景不滚动） | E2E + 组件 |
| 2 | TC-US10-04：网格与手风琴中的点击下标 | E2E |
| 3 | TC-US10-05 + TC-US10-06 + UT-221：键盘 / 按钮 / 滑动切换与首尾边界 | E2E + 组件 |
| 4 | TC-US10-07 + UT-222 / 223 / 224：四种关闭、下滑阈值、焦点还原、滚动锁恢复 | E2E + 组件 |
| 5 | TC-US10-12：预览中点击图片不打开灯箱 | E2E |

## ⚠️ 前置确认项

- DepthCarousel 源码与许可证（React Bits，MIT + Commons Clause，同 SwipeRow）在实现开始时取最新版本核对

## DoD（完成定义）

### 实现类
- [ ] DepthCarousel 改动按 components.md 表格逐项完成
- [ ] 灯箱 chunk 为动态加载（首屏脚本不含 gsap）
- [ ] components.md `Lightbox`、DepthCarousel 标注已实现

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/image-menu.spec.ts`（预览点击图片仍是菜单行为）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[hydrate-article-images](hydrate-article-images.md)

## 影响的文件

- `src/components/vendor/react-bits/DepthCarousel.tsx`
- `src/components/reader/Lightbox.tsx`、`ArticleImagesIsland.tsx`
- `tests/unit/components/lightbox.test.tsx`、`tests/e2e/reader-lightbox.spec.ts`

## 回滚策略

岛不传点击回调（不打开灯箱），删除 Lightbox 与 DepthCarousel

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `Lightbox`、灯箱层叠参数标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
