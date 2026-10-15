# add-post-card-details: 卡片摘要、封面与悬停效果

**Sprint**: Sprint 4
**序号**: 10
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层 + 领域层（reader 纯函数）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: `plainText` / `excerptOf`（无 `summary` 时截正文纯文本 120 字）接入卡片；摘要最多 3 行、为空不渲染；封面 128×128（手机 72）`object-fit: cover`、懒加载、无封面不留位；双层虚线框错位（只在 `(hover: hover)`，减弱动效时不移动）
- **影响范围**: `src/lib/reader/excerpt.ts`、`src/components/reader/PostCard.tsx`、列表页 `toCardModel`
- **不变量**: 卡片链接结构不变（TC-US04-02 继续通过）
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04](../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-04-post-list/story.md) AC3–AC5 |
| 设计依据 | [reader-post-list.md 文章卡片](../../ui/pages/reader-post-list.md) · [components.md PostCard](../../ui/components.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US04-03](../../test/features/F-002-博客首页与阅读/acceptance/post-browsing/US-04-tests.md)（READER-UT-02）：摘要来源与纯文本截取 | 单元 |
| 2 | TC-US04-04：摘要最多 3 行 | E2E |
| 3 | TC-US04-05 + UT-208 / 209：封面显示与无封面布局 | E2E + 组件 |
| 4 | TC-US04-09：悬停错位、触屏与减弱动效 | E2E |

## DoD（完成定义）

### 实现类
- [ ] 摘要不含 Markdown / HTML 符号
- [ ] 封面 `img` 带 width / height

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/reader-post-list.spec.ts`——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-post-list-page](add-post-list-page.md)

## 影响的文件

- `src/lib/reader/excerpt.ts`
- `src/components/reader/PostCard.tsx`
- `src/pages/posts/index.astro`、`posts/page/[page].astro`
- `tests/unit/reader/excerpt.test.ts`、`tests/e2e/reader-post-card.spec.ts`

## 回滚策略

卡片回到只显示 `summary`、无封面

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `PostCard` 摘要与封面规则标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
