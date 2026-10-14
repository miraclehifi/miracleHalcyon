# implement-delete-post-api: 实现删除文章接口

**Sprint**: Sprint 2
**序号**: 8
**状态**: completed
**类别**: API
**架构层级**: 领域层 + 数据层 + 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: `post.delete(id)` 删除整行，曾发布则调用 `onPublicationChanged({ kind: 'deleted', slug })`；`DELETE /api/admin/posts/:id` 返回 204，不存在 404 `POST_NOT_FOUND`；不删除 R2 图片
- **影响范围**: `src/domains/post/service.ts`、`repo.ts`、`src/pages/api/admin/posts/[id].ts`（加 DELETE）
- **不变量**: 同文件 GET / PUT 行为不变（`tests/integration/post/get-endpoint.test.ts`、`save-endpoint.test.ts` 保持通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-09 删除文章](../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/behaviors.md) |
| 设计依据 | [post api-contract `DELETE`](../../engineering/backend/domains/post/api-contract.md) · [post domain-model（delete、PublicationChange）](../../engineering/backend/domains/post/domain-model.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US09-06](../../test/features/F-001-文章写作/acceptance/post-management/US-09-tests.md)：任意状态 → deleted；deleted 上的操作被拒（服务单元 + 接口） | 单元 + 集成 |
| 2 | TC-US09-03：删除已发布（clean / dirty）文章后 `GET /api/posts/:slug` 404，钩子收到 `deleted` | 集成 |
| 3 | TC-US09-04：重复删除 / 不存在 id → 404，其他数据不受影响 | 集成 |
| 4 | TC-US09-07、TC-US09-08：未登录 401、跨站 Origin 403 | 集成（安全） |
| 5 | TC-US09-09：删除不删除 R2 图片 | 集成 |

## DoD（完成定义）

### 实现类
- [x] `PostRepo.delete` 返回被删行；`PostService.delete` 调用钩子（F-001 内为空实现）
- [x] `DELETE /api/admin/posts/:id` 按契约返回

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `PostRepo.delete`（接口 + `D1PostRepo`：`DELETE … RETURNING`，一次往返拿到被删行；测试用 `MemoryPostRepo` 同步）
- `PostService.delete`：不存在 → `NotFoundError`；**当前处于已发布状态**时触发 `{ kind: "deleted", slug: 快照 slug }`。规格原文"若曾发布则触发钩子"按此理解：曾发布但已撤回的文章读者端早已 404，撤回时已触发过钩子，无需再重建；钩子失败只记日志
- `DELETE /api/admin/posts/:id`：204；不存在或 id 不合法（`nope`、`1 OR 1=1`、`*`、空）→ 404 `POST_NOT_FOUND`
- 删除释放 slug（行被删除，唯一性检查自然通过）；不删除 R2 图片（media 与 post 无关联）
- 仅后端改动，未跑 E2E（写文章页删除的 E2E 在 add-editor-delete-action）

## 依赖

无（TC-US09-09 需要能写入 R2 测试对象，直接用 R2 绑定写入，不依赖上传接口）

## 影响的文件

- `src/domains/post/service.ts`、`repo.ts`
- `src/pages/api/admin/posts/[id].ts`
- `tests/unit/post/delete-service.test.ts`、`tests/integration/post/delete-endpoint.test.ts`（新建）、`tests/unit/post/memory-post-repo.ts`

## 回滚策略

回退服务、仓储与端点改动（无数据结构变更）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| post api-contract `DELETE` | 标注"已实现" |
