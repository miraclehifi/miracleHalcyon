# Sprint 7：F-006 媒体存储清理

**状态**: in_progress
**创建**: 2026-10-16
**Feature**: F-006 媒体存储清理（[Backlog: media-orphan-cleanup](../../backlog/media-orphan-cleanup.md)）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：后台 `/admin/storage` 能统计未引用图片与实况视频并一键清理，不误删任何文章（含已发布快照）在用的文件。
> 粒度按 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)（1 个任务 = 1 个可演示功能点，可跨层）。
> 与 Sprint 6（media-upload-experience，并行会话）互不修改同一文件：本 Sprint 不碰 `src/lib/upload/*`、`src/lib/editor/*`、`src/lib/markdown/*`、`src/components/admin/editor/*`、`IconButton.tsx`。
> 测试执行：任务内只跑本任务测试文件（E2E chromium，完成前补跑 webkit 一次）；Sprint 末跑全量。

## 任务索引

| # | Task | 名称 | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|------|---------|----|------|---------|---------|------|
| 1 | [implement-orphan-detection-api](implement-orphan-detection-api.md) | 检测接口：引用查询 + 分类 + `GET /api/admin/storage/orphans` | API | 领域 + 数据 + 接口 | US-01 | — | 3 | 高（D1 `json_each` / `->>` 与 instr 交叉判定的性能，ADR-009） | completed |
| 2 | [implement-orphan-cleanup-api](implement-orphan-cleanup-api.md) | 清理接口：`POST /api/admin/storage/cleanup`（R2 批量删、D1 删行 / 置空视频） | API | 领域 + 数据 + 接口 | US-02 | 1 | 1 | 中 | completed |
| 3 | [add-storage-page](add-storage-page.md) | 存储页：顶栏"文章 / 存储"、`StatCard`、统计 / 加载 / 空 / 失败态 | FRONTEND | 表现层 | US-01 | 1 | 1 | 低 | completed |
| 4 | [add-storage-cleanup-flow](add-storage-cleanup-flow.md) | 存储页一键清理：确认框、进行中、结果与失败提示 | FRONTEND | 表现层 | US-02 | 2、3 | 0 | 低 | completed |

依赖图：`1 → 2 → 4`，`1 → 3 → 4`。任务 1 先验证 ADR-009 的性能假设：若 300 篇 / 3,000 张超过 2s，暂停并回到 design-arch（考虑引用索引表方案）。

> 任务 1 实测：逐图 instr（方案 C1）34s 不达标，改为递归 CTE 抽取片段（方案 C2）711 ms，ADR-009 已修订。

无 DDL 变更；无跨团队协作任务。跨 Feature 影响（feature-architecture §5）：`AdminHeader` 与文章列表页传 `current`，在任务 3 中完成；`LiveBadge` 降级沿用现状，由任务 4 的 E2E（TC-US02-08）验证。

## DoD（Sprint 级）

- [x] 所有任务 completed
- [ ] `npm run lint`、`npm run check`、`npm test`、`npm run test:e2e` 通过
- [x] F-006 验收用例 TC-US01-01 – 15、TC-US02-01 – 14 都有对应测试（见 [sprint-7-task-results](../../test/features/F-006-媒体存储清理/validation/sprint-7-task-results.md)）
- [ ] 进入 code-review
