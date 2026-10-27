# add-douban-import-dialog: 后台"从豆瓣导入"弹窗

**Sprint**: Sprint 9
**序号**: 20
**状态**: completed（2026-10-27）
**类别**: FRONTEND
**架构层级**: 表现层（admin：`src/components/admin/media/`、`src/lib/admin/shelf-client.ts`、`src/pages/admin/media/index.astro`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [douban-bulk-import](../../backlog/douban-bulk-import.md)

## 意图声明

- **改动意图**:
  - `DoubanImportDialog.tsx`（新建，components.md 同名）：模态弹窗；"导入类别"6 个勾选项（每次打开全勾，全部取消时"至少选择一个类别"并禁用按钮；每项旁显示该类别上次同步）；打开时读同步状态接口带出 ID，按有无同步记录显示"全量导入"或"同步新标记" + "全量导入"；改 ID 后 300ms 重查状态；按 `importPlan(勾选类别)` 逐页调用导入接口（带 `types`、`mode`，第 2 页起带回 `head`）直到 `nextStart` 为 `null`；进度、停止（当前页返回后不再请求）、汇总、失败列表（最多 50 条）、错误提示；结束（完成 / 停止 / 出错）且 `changed > 0` 时调用 finish 一次并 `Toast/Success`"读者页将在重建后更新"；关闭后刷新列表
  - 进度与文案拆为纯函数 `src/lib/admin/douban-import.ts`（UT-21）
  - `/admin/media` 标题行加 `Button/Outline`"从豆瓣导入"（`PageHeader` 操作区），挂载弹窗岛
  - `shelf-client.ts`：`getDoubanImportState`、`importDoubanPage`、`finishDoubanImport`
  - 手机：弹窗左右 16px 全宽、按钮各占一半
- **影响范围**: 后台书影音列表页标题行；其他页面不变
- **不变量**: 列表、隐藏、删除交互不变；`ConfirmDialog` 不改
- **不在本任务**: 接口（任务 19）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04](../../product/features/F-005-书影音/stories/media-shelf/US-04-douban-import/story.md) AC1、AC2、AC7–AC13；BH-01、02、12、13、15、17–19、22、25、27、28 |
| 设计依据 | [admin-media.md](../../ui/pages/admin-media.md)"从豆瓣导入" · [components.md](../../ui/components.md) `DoubanImportDialog` · admin.pen 10、11i、组件区业务区块 Row 8 |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-20 `isValidDoubanUid`（前端导入同一函数，补表单提示断言）、UT-21 进度与文案——`tests/unit/admin/douban-import.test.ts` | 单元 |
| 2 | UT-22 导入面板（jsdom，打桩 client）——`tests/unit/admin/douban-import-dialog.test.tsx` | 单元 |
| 3 | TC-US04-14–17、TC-US04-23、TC-US04-26（`page.route` 打桩导入 / finish 接口，记录调用次数）——`tests/e2e/admin-media-import.spec.ts` | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 10、11i（首次 / 已同步过 / 进行中 / 完成 / 错误 / 未选类别）一致；新建通用组件 `src/components/ui/Checkbox.tsx`（components.md `Checkbox`），UT-22 覆盖其选中 / 未选 / 禁用与点标签切换
- [x] 测试清单全部由红变绿；影响范围：`tests/e2e/admin-media-list.spec.ts`、`tests/unit/admin/*` 原有用例 chromium 通过，本任务 E2E 补跑 webkit
- [x] 本地用作者真实账号完整导入一次，再点一次"同步新标记"确认几秒内结束、无新增（`npm run dev:local`），核对汇总与列表、读者页构建，结果记入 validation
- [x] `npm run lint`、`npm run check` 通过

## 依赖

19（导入接口）、4（列表页）

## 影响的文件

- `src/components/admin/media/DoubanImportDialog.tsx`（新建）、`src/components/admin/media/MediaEntryList.tsx` 或 `src/pages/admin/media/index.astro`（改：按钮与挂载）
- `src/lib/admin/douban-import.ts`（新建）、`src/lib/admin/shelf-client.ts`（改）
- `tests/unit/admin/{douban-import.test.ts,douban-import-dialog.test.tsx}`、`tests/e2e/admin-media-import.spec.ts`（新建）

## 回滚策略

删除新组件与按钮；任务 19 的接口保留不影响其他功能。

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-media.md、components.md | `DoubanImportDialog` 标注已实现 |
| US-04 | stories/_index.md 状态 → done（verify 后） |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
