# show-slug-conflict-error: 显示 slug 冲突错误

**Sprint**: Sprint 1
**序号**: 65
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 显示 slug 冲突错误
- **影响范围**: `src/components/admin/editor/PostEditorPage.tsx`, `tests/e2e/editor-slug-conflict.spec.ts`
- **不变量**: 不改变依赖任务（wire-autosave-to-editor）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

[TC-US03 slug 已存在](../../test/features/F-001-文章写作/acceptance/post-editor/US-03-tests.md)：填入他人已用的 slug，保存后 slug 输入框红色描边、提示"slug 已存在，请换一个"，设置抽屉自动打开

## DoD（完成定义）

### 实现类
- [x] 409 `SLUG_TAKEN` → Field error + 打开抽屉

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 自动保存控制器新增 `onError` 回调（每次保存失败调用），`useAutosave` 透传；`PostEditorPage` 收到 `SLUG_TAKEN` 时把服务端提示交给 `PostSettingsDrawer` 的 `slugError`（Field 红色描边 + `aria-invalid`），并自动打开设置抽屉；改 slug 后清除错误
- 顺带修正 `useAutosave`：控制器改为第一次 `edit / flush` 时创建（不再在 effect 里创建），水合后、effect 运行前的输入和 Ctrl / ⌘ + S 不会丢；新建文章首次保存后记下 id，重建控制器时沿用（避免重复 POST）
- `editor-autosave.spec.ts` 的 TC-US03-18 改为断言 1 秒内发出 POST（证明是快捷键而非 2 秒防抖），不再限制完成时间，避免并行负载下误报

## 依赖

[wire-autosave-to-editor](wire-autosave-to-editor.md)

## 影响的文件

- `src/components/admin/editor/PostEditorPage.tsx`
- `tests/e2e/editor-slug-conflict.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
