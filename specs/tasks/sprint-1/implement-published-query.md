# implement-published-query: 实现已发布只读查询（D1）

**Sprint**: Sprint 1
**序号**: 39
**状态**: pending
**类别**: DATA
**架构层级**: 数据层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现已发布只读查询（D1）
- **影响范围**: `src/domains/post/published-query.ts`, `tests/integration/post/published-query.test.ts`
- **不变量**: 不改变依赖任务（implement-post-repo）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [post](../../engineering/backend/domains/post/domain-model.md) · [postdata](../../engineering/backend/domains/post/data-model.md) |

## 唯一测试（红 → 绿）

POST-UT-11：草稿查不到；有修改的已发布文章返回快照内容而非工作稿；列表按 publishedAt 降序

## DoD（完成定义）

### 实现类
- [ ] `src/domains/post/published-query.ts`：`listPublished`、`getPublishedBySlug`、`listPublishedTags`

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-post-repo](implement-post-repo.md)

## 影响的文件

- `src/domains/post/published-query.ts`
- `tests/integration/post/published-query.test.ts`

## 回滚策略

回退本任务新增 / 修改的仓储文件与测试；迁移类任务额外执行 `wrangler d1 migrations` 回退（本地删除 `.wrangler/state` 重新应用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
