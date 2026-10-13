# implement-post-list-query: 实现后台列表查询（D1）

**Sprint**: Sprint 1
**序号**: 37
**状态**: completed
**类别**: DATA
**架构层级**: 数据层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现后台列表查询（D1）
- **影响范围**: `src/domains/post/repo.ts`, `tests/integration/post/list-query.test.ts`
- **不变量**: 不改变依赖任务（implement-post-repo）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [post](../../engineering/backend/domains/post/domain-model.md) · [postdata](../../engineering/backend/domains/post/data-model.md) |

## 唯一测试（红 → 绿）

POST-UT-10：25 篇混合状态下的计数口径、排序、`q` 中 `%` `_` 转义、超出页码返回空

## DoD（完成定义）

### 实现类
- [x] `PostRepo.list`（筛选、搜索、分页、counts、total）
- [x] `PostService.list`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 仓储 `list` 返回 `PostSummary`（不读正文，正文最长 20 万字符），domain-model §6 已注明\n- 加强了 `_` 转义用例（`1_0` 不转义会命中两篇）\n- LoginForm 的 `FormEvent`（@types/react 已弃用）改为 `SubmitEvent`

## 依赖

[implement-post-repo](implement-post-repo.md)

## 影响的文件

- `src/domains/post/repo.ts`
- `tests/integration/post/list-query.test.ts`

## 回滚策略

回退本任务新增 / 修改的仓储文件与测试；迁移类任务额外执行 `wrangler d1 migrations` 回退（本地删除 `.wrangler/state` 重新应用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
