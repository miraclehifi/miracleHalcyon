# add-storage-cleanup-flow: 存储页一键清理

**Sprint**: Sprint 7
**序号**: 4
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-006 媒体存储清理](../../product/features/F-006-媒体存储清理/feature-scope.md)
**来源 PBI**: [media-orphan-cleanup](../../backlog/media-orphan-cleanup.md)

## 意图声明

- **改动意图**：点"一键清理未引用资源"后弹出 `ConfirmDialog/Danger`，确认后调用清理接口：
  - 成功：`Toast/Success`"已清理 X 项，释放 Y"，并自动重新检测
  - 失败：`Toast/Error`"清理未完成，请重试"，并自动重新检测
  - 清理进行中不能取消、不能重复提交
- **可演示**：在存储页一键清理，统计归零，按钮变为禁用，显示良好状态
- **影响范围**：`StoragePage.tsx`、`storage-client.ts`（任务 3 的文件）
- **不变量**：取消 / Esc 不发请求；清理结果按接口返回值提示，不按页面上的旧统计

## 设计来源

- [admin-storage.md](../../ui/pages/admin-storage.md)"交互""状态"
- [components.md](../../ui/components.md)：`ConfirmDialog`（`onConfirm` 返回 Promise 时自动加载并禁止取消）、`Toast`
- US-02 [behaviors](../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-02-cleanup-orphans/behaviors.md)

## 测试清单

| # | 文件 | 覆盖 | 层 |
|---|------|------|----|
| 1 | `tests/unit/admin/storage-cleanup-text.test.ts` | F-006 UT-05、06（确认框与结果文案，含某项为 0 时省略） | 单元 |
| 2 | `tests/e2e/storage-cleanup.spec.ts` | TC-US02-10、11、12、13、14；UT-07（焦点与 Esc）。TC-US02-04 改在 `tests/integration/media/storage-cleanup.test.ts`（E2E 共享数据，不能真实清理） | E2E |
| 3 | `tests/e2e/storage-live-fallback.spec.ts` | TC-US02-08（视频已清理的图片加 `#live`，预览与读者页降级） | E2E |

## DoD

实现类：
- [x] 确认框文案与 admin-storage.md 一致；清理成功后统计为 0、按钮禁用
- [x] 清理进行中只发出 1 个请求

测试类：
- [x] 测试清单 3 个文件由红变绿（E2E 跑 chromium，完成前补跑一次 webkit）
- [x] 影响范围回归：任务 3 的测试文件通过；`npm run lint`、`npm run check` 无报错

## 实现记录

见 [sprint-7-task-results](../../test/features/F-006-媒体存储清理/validation/sprint-7-task-results.md)。

## 回滚

`StoragePage.tsx`、`storage-client.ts` 恢复到任务 3 完成时的版本；删除本任务的测试文件。

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-storage.md | 标注已实现 |
| US-01 / US-02 stories/_index.md | 状态 → implemented |
| [sprint-7/_index.md](_index.md) | 状态 → completed |
