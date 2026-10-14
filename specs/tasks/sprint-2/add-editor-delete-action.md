# add-editor-delete-action: 写文章页"删除文章"

**Sprint**: Sprint 2
**序号**: 12
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 设置抽屉底部"删除文章" → 确认框（"删除「标题」？删除后无法恢复"，焦点默认在"取消"）→ `DELETE` → 关闭离开拦截并回到列表；失败时提示且文章保留
- **影响范围**: `PostSettingsDrawer.tsx`、`PostEditorPage.tsx`、`useAutosave.ts`（`disable()`）
- **不变量**: 撤回为草稿等抽屉内已有操作不变（`tests/e2e/editor-unpublish.spec.ts` 保持通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-09 删除文章](../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/story.md) |
| 设计依据 | [admin-post-editor"设置抽屉""弹层与提示"](../../ui/pages/admin-post-editor.md) · [feature-ui-coverage UI 决定 #4](../../ui/features/F-001-文章写作/feature-ui-coverage.md) · [components.md `ConfirmDialog`](../../ui/components.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US09-02](../../test/features/F-001-文章写作/acceptance/post-management/US-09-tests.md)：写文章页（含未保存修改）删除后回到列表，不弹离开确认 | E2E |
| 2 | TC-US09-10 / UT-110、UT-114：确认框文案、标题特殊字符按文本显示 | 单元 + E2E |
| 3 | TC-US09-11 / UT-112、UT-115、UT-116：取消 / Esc 关闭，焦点默认"取消"并还原，文章仍在 | 单元 + E2E |
| 4 | TC-US09-12 / UT-113：确认删除进行中防重复提交 | 单元 + E2E |
| 5 | TC-US09-05（写文章页）：删除接口 500 时提示且文章保留 | E2E |

## DoD（完成定义）

### 实现类
- [ ] 抽屉"删除文章"（新建未保存的文章不显示）+ 删除确认框
- [ ] 删除成功后 `disable()` 自动保存与 `beforeunload`，跳转 `/admin`

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[implement-delete-post-api](implement-delete-post-api.md)

## 影响的文件

- `src/components/admin/editor/PostSettingsDrawer.tsx`、`PostEditorPage.tsx`
- `src/lib/autosave/useAutosave.ts`
- `tests/unit/admin/delete-dialog.test.tsx`、`tests/e2e/editor-delete.spec.ts`（新建）

## 回滚策略

回退修改的组件与新增测试

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| admin-post-editor"设置抽屉" | 标注"已实现（删除）" |
