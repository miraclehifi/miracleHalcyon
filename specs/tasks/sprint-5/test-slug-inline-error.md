# test-slug-inline-error: 非法 slug 行内提示 E2E

**Sprint**: Sprint 5
**序号**: 3
**状态**: completed
**类别**: TEST
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [f001-p0-test-gaps](../../backlog/f001-p0-test-gaps.md)

## 意图声明

- **改动意图**: 设置抽屉中 slug 格式错误的行内提示（`PostSettingsDrawer.tsx` 已实现）补 E2E，并验证非法 slug 不会被保存
- **影响范围**: `tests/e2e/editor-slug-conflict.spec.ts`（与 slug 冲突用例同文件）
- **不变量**: 不改业务代码；测试暴露缺陷时按 Bug 最小修复

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US03-22][SC-POSTINFO-07] 已有文章 slug 改为 `Hello World!`：显示"仅允许小写字母、数字和连字符"；按 Ctrl/Cmd+S 并等过自动保存窗口后，接口读回的 slug 仍为原值；改回合法 slug 后提示消失 | E2E |

## DoD

- [x] 测试 chromium + webkit 通过
- [x] `npm run lint` 本任务文件通过

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-5/_index.md](_index.md) | 本任务状态 → completed |
