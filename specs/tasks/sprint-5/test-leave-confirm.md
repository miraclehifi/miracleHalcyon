# test-leave-confirm: 未保存 / 保存中离开确认 E2E

**Sprint**: Sprint 5
**序号**: 4
**状态**: completed
**类别**: TEST
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [f001-p0-test-gaps](../../backlog/f001-p0-test-gaps.md)

## 意图声明

- **改动意图**: 写文章页"未保存""保存中…"时离开触发 `beforeunload` 确认（`PostEditorPage.tsx` 已实现）补 E2E
- **影响范围**: `tests/e2e/editor-autosave.spec.ts`
- **不变量**: 不改业务代码；测试暴露缺陷时按 Bug 最小修复

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US06-26][SC-AUTOSAVE-09] a. 未保存时 `page.close({ runBeforeUnload: true })` 触发 `beforeunload`，取消后页面与内容保留 | E2E |
| 2 | [TC-US06-26][SC-AUTOSAVE-09] b. 未保存时后退触发 `beforeunload`，取消后仍在写文章页 | E2E |
| 3 | [TC-US06-26][SC-AUTOSAVE-09] c. 保存请求挂起（"保存中…"）时关闭触发 `beforeunload` | E2E |

"未保存"状态要在防抖 2 秒内制造（输入后立即离开），或用 `page.clock` 控制，避免自动保存先完成。

## DoD

- [x] 测试清单 3 项 chromium + webkit 通过（WebKit 若不支持某种离开方式触发对话框，记录原因并在该浏览器跳过）
- [x] `npm run lint` 本任务文件通过

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-5/_index.md](_index.md) | 本任务状态 → completed |
