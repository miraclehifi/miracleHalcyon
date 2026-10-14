# handle-session-expired-save: 保存时会话过期的处理

**Sprint**: Sprint 2
**序号**: 16
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 自动保存收到 401 → 写本地暂存、进入 `authExpired`、不再重试；作者重新登录后回到写文章页，内容不丢并能保存成功
- **影响范围**: `controller.ts`、`useAutosave.ts`、`SaveIndicator.tsx`、`PostEditorPage.tsx`
- **不变量**: 网络错误 / 5xx 的退避重试与 409 处理不变

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-06 自动保存](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) |
| 设计依据 | [editor module-spec §2 状态机](../../engineering/frontend/modules/editor/module-spec.md) · [feature-ui-coverage UI 决定 #3](../../ui/features/F-001-文章写作/feature-ui-coverage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-77](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) + ED-UT-02（401 部分）：401 → 写暂存、不无限重试 | 单元 |
| 2 | UT-63：`authExpired` 时的登录提示 | 单元 |
| 3 | [TC-US06-18](../../test/features/F-001-文章写作/acceptance/post-editor/US-06-tests.md)：会话过期 → 提示重新登录、本地暂存、登录后保存成功 | E2E |
| 4 | TC-US06-25：401 → "登录已过期"状态与登录入口 | E2E |

## ⚠️ 前置确认项

- **401 后的去向两份文档不一致**：editor module-spec §2 与 UI 决定 #3 是"本地暂存 → 跳转 `/admin/login?next=当前地址`，回来走恢复流程"；TC-US06-25 / UT-63 是"显示登录已过期，登录链接 `target="_blank"` 新窗口打开"（留在原页）。实现前与作者确认，再同步另一方文档

## DoD（完成定义）

### 实现类
- [ ] 按确认后的方案实现 401 处理；落选方的文档同步修改
- [ ] `shouldWarnOnLeave` 在 `authExpired` 时为 true（UT-64）

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-local-draft-restore](add-local-draft-restore.md)

## 影响的文件

- `src/lib/autosave/controller.ts`、`useAutosave.ts`
- `src/components/ui/SaveIndicator.tsx`、`src/components/admin/editor/PostEditorPage.tsx`
- `tests/unit/admin/autosave.test.ts`、`tests/e2e/editor-session-expired.spec.ts`（新建）

## 回滚策略

回退修改的文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| editor module-spec §2 / US-06 验收用例 | 按确认方案统一 |
