# add-post-cover-api: 文章封面字段（数据 + 领域 + 接口）

**Sprint**: Sprint 4
**序号**: 16
**状态**: completed
**类别**: API
**架构层级**: 数据 + 领域 + 接口
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)（F-001 增量）

## 意图声明

- **改动意图**: 迁移 `0003_post_cover.sql`（`cover`、`pub_cover`）；`PostContent.cover` 与 `CoverUrl` 校验（`parseImageKey` + `/img/` 前缀 + ≤ 200）；`contentHash` 兼容规则（非空才追加第 7 项）；仓储读写 `cover` / `pub_cover`（发布写快照、撤回清空）；`PostView`、`PublishedPost`、`PublishedPostSummary` 返回 `cover`；`DraftInput` 七字段必填；前端 `PostEditorPage` 状态、自动保存请求体、本地暂存补 `cover`（旧暂存按 null）
- **影响范围**: `src/db/migrations/0003_post_cover.sql`、`src/domains/post/{content,content-hash,repo,published-query,service}.ts`、`src/lib/api/http.ts`、`src/pages/api/admin/posts/**`、`src/pages/api/posts/**`、`src/lib/autosave/local-draft.ts`、编辑器状态
- **不变量**: 旧文章迁移后 `hasUnpublishedChanges` 不变；公开接口只返回快照封面
- **不在本任务**: 设置抽屉 UI（add-cover-field）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-06](../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-06-post-cover/story.md) AC2–AC4 |
| 设计依据 | [post domain-model §2.2、§3](../../engineering/backend/domains/post/domain-model.md) · [api-contract](../../engineering/backend/domains/post/api-contract.md) · [data-model 0003](../../engineering/backend/domains/post/data-model.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US06-08](../../test/features/F-002-博客首页与阅读/acceptance/post-browsing/US-06-tests.md) + POST-UT-12：封面字段校验 | 单元 + 集成 |
| 2 | TC-US06-09 + POST-UT-13：迁移后旧文章 cover 为 null 且哈希不变 | 单元 + 集成 |
| 3 | TC-US06-06：四个接口返回 cover（快照 / 工作稿口径） | 集成 |
| 4 | TC-US06-05 的接口部分（POST-UT-14）：改封面 → 有未发布修改 → 发布更新后公开接口变化 | 集成 |

## DoD（完成定义）

### 实现类
- [x] 本地 D1 应用 0003 后原有数据保留
- [x] api-contract、data-model 标注已实现
- [x] F-001 前端请求体已带 `cover`（否则保存会 400）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/unit/post/*`、`tests/integration/post/*`、F-001 自动保存与本地暂存相关单元测试、`tests/e2e/editor-autosave*.spec.ts`——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

无

## 影响的文件

- `src/db/migrations/0003_post_cover.sql`
- `src/domains/post/*.ts`（5 个）
- `src/pages/api/**`（文章相关）
- `src/lib/autosave/local-draft.ts`、`src/components/admin/editor/PostEditorPage.tsx`
- `tests/unit/post/*`、`tests/integration/post/cover.test.ts`

## 回滚策略

回退代码；D1 新列保留不影响旧代码（可空列）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [post domain-model](../../engineering/backend/domains/post/domain-model.md)、[api-contract](../../engineering/backend/domains/post/api-contract.md)、[data-model](../../engineering/backend/domains/post/data-model.md) | 封面标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
