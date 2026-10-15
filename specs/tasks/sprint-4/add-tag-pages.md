# add-tag-pages: 标签页与标签索引

**Sprint**: Sprint 4
**序号**: 11
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层 + 领域层（reader 纯函数）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: `groupTags`（大小写合并、显示名、计数、排序）；新建 `src/pages/tags/[tag]/index.astro`、`tags/[tag]/page/[page].astro`（页头"#标签" + 篇数 + "全部文章"，列表与分页复用）；`/posts` 第 1 页 `TagIndex`（`TagChip` 链接形态 `# 名称 · 篇数`）
- **影响范围**: `src/lib/reader/tags.ts`、`src/pages/tags/**`、`src/components/reader/TagIndex.astro`、`src/components/ui/TagChip.tsx`（新增 `href`）
- **不变量**: 设置抽屉 `TagInput` 中的 `TagChip` 行为不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-05-tag-page/story.md)；[US-04](../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-04-post-list/story.md) AC8 |
| 设计依据 | [reader-post-list.md 标签地址](../../ui/pages/reader-post-list.md) · [reader module-spec §2](../../engineering/frontend/modules/reader/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US05-01](../../test/features/F-002-博客首页与阅读/acceptance/post-browsing/US-05-tests.md) + TC-US05-02：标签页内容、大小写合并与规范地址 | E2E |
| 2 | TC-US05-03：特殊字符标签 | E2E |
| 3 | TC-US05-04 + TC-US05-05：标签页分页；只在草稿中的标签 404 | E2E |
| 4 | TC-US05-06（READER-UT-03）：`tagSlug` / `groupTags` | 单元 |
| 5 | TC-US04-10：`/posts` 标签索引 | E2E |

## DoD（完成定义）

### 实现类
- [x] 标签地址与 spike 结论一致（若走退路，TC-US05-03 期望已同步修订）
- [x] `TagChip` 链接形态写入 components.md

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/unit/components/tag-chip*.test.tsx`、设置抽屉标签输入 E2E——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-post-list-page](add-post-list-page.md)

## 影响的文件

- `src/lib/reader/tags.ts`
- `src/pages/tags/[tag]/index.astro`、`tags/[tag]/page/[page].astro`
- `src/components/reader/TagIndex.astro`、`src/components/ui/TagChip.tsx`
- `tests/e2e/reader-tags.spec.ts`、`tests/unit/reader/tags.test.ts`

## 回滚策略

删除标签页与索引；还原 `TagChip`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader-post-list.md](../../ui/pages/reader-post-list.md) | 标签页、标签索引标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
