# add-deploy-hook-rebuild: 发布后触发读者页重建

**Sprint**: Sprint 4
**序号**: 18
**状态**: completed
**类别**: API
**架构层级**: 接口层（适配器）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: `createDeployHookHooks`（reader module-spec §5：url 空 → noop；`waitUntil(fetch POST)`；失败记 `deploy_hook_failed` 不含 url）；`publish.ts`、`unpublish.ts`、`posts/[id].ts`（DELETE）的 handler 新增可选 `hooks` 参数并在导出处注入；`src/env.d.ts` 补 `DEPLOY_HOOK_URL?`；README 首次部署步骤
- **影响范围**: `src/lib/rebuild/deploy-hook.ts`、`src/pages/api/admin/posts/[id]/{publish,unpublish}.ts`、`src/pages/api/admin/posts/[id].ts`、`src/env.d.ts`、`README.md`
- **不变量**: 发布 / 撤回 / 删除的响应与错误码不变；钩子失败不影响结果
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-03-static-rebuild/story.md) AC2、AC3 |
| 设计依据 | [ADR-007 §3](../../engineering/features/F-002-博客首页与阅读/architecture/adr/ADR-007-reader-build-data.md) · [reader module-spec §5](../../engineering/frontend/modules/reader/module-spec.md) · [post domain-model §4](../../engineering/backend/domains/post/domain-model.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US03-02](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-03-tests.md)：发布成功后调用一次 | 集成 |
| 2 | TC-US03-03：发布更新、撤回、删除已发布文章各一次；失败操作不发 | 集成 |
| 3 | TC-US03-04：删除从未发布的草稿不触发 | 集成 |
| 4 | TC-US03-05 + TC-US03-06 + READER-UT-10：钩子失败不影响发布、日志不含 URL；未配置时跳过 | 集成 + 单元 |

## DoD（完成定义）

### 实现类
- [x] `DEPLOY_HOOK_URL` 不出现在 `wrangler.jsonc`
- [x] README 写明 Secret 与 `READER_BOOTSTRAP` 首次部署步骤

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/integration/post/*`（发布、撤回、删除接口）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

无

## 影响的文件

- `src/lib/rebuild/deploy-hook.ts`
- `src/pages/api/admin/posts/[id]/publish.ts`、`unpublish.ts`、`[id].ts`
- `src/env.d.ts`、`README.md`
- `tests/unit/rebuild/deploy-hook.test.ts`、`tests/integration/post/rebuild-hook.test.ts`

## 回滚策略

路由改回 `noopHooks`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [ADR-007](../../engineering/features/F-002-博客首页与阅读/architecture/adr/ADR-007-reader-build-data.md) | Deploy Hook 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
