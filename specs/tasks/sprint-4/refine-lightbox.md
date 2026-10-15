# refine-lightbox: 灯箱：实况播放、焦点与降级

**Sprint**: Sprint 4
**序号**: 15
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 灯箱内实况照片（DepthCarousel `renderOverlay` 挂 `LiveBadge` 与播放层，悬停 / 长按播放）；焦点陷阱；减弱动效不创建补间；当前图片加载失败显示"图片加载失败"+"重试"（`?retry=n`）；只有 1 张时不显示切换按钮
- **影响范围**: `src/components/reader/Lightbox.tsx`、`DepthCarousel.tsx`
- **不变量**: add-lightbox 的打开 / 切换 / 关闭行为不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-10](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-10-image-lightbox/story.md) AC5、AC6 |
| 设计依据 | [reader-post-detail.md 图片与灯箱](../../ui/pages/reader-post-detail.md) · [components.md LiveBadge、灯箱层叠参数](../../ui/components.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US10-08](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-10-tests.md)：灯箱内实况照片播放 | E2E |
| 2 | TC-US10-09 + UT-225 / 226：焦点循环与减弱动效 | E2E + 组件 |
| 3 | TC-US10-10 + UT-227：图片加载失败与重试 | E2E + 组件 |
| 4 | TC-US10-11：只有一张图片 | 组件 |

## DoD（完成定义）

### 实现类
- [x] 实况播放复用 `live-photo.tsx`，不另写播放逻辑

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/reader-lightbox.spec.ts`、`tests/unit/components/live-badge.test.tsx`——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-lightbox](add-lightbox.md)

## 影响的文件

- `src/components/reader/Lightbox.tsx`
- `src/components/vendor/react-bits/DepthCarousel.tsx`
- `tests/unit/components/lightbox.test.tsx`、`tests/e2e/reader-lightbox.spec.ts`

## 回滚策略

还原 Lightbox 到 add-lightbox 完成时的版本

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [US-10 story](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-10-image-lightbox/story.md) | stories/_index.md 状态 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
