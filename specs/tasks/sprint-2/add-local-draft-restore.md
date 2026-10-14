# add-local-draft-restore: 本地暂存与恢复横幅

**Sprint**: Sprint 2
**序号**: 15
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/autosave/` + 组件）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 每次编辑（节流 500ms）写 `localStorage['mh:draft:{id|new}']`；服务端保存成功且内容一致时删除；加载时暂存比服务端新且内容不同 → 显示 `RestoreBanner`（"恢复" / "丢弃"）
- **影响范围**: `src/lib/autosave/local-draft.ts`（新建）、`useAutosave.ts`、`controller.ts`、`PostEditorPage.tsx`、`src/components/ui/RestoreBanner.tsx`（新建）
- **不变量**: 自动保存状态机已有转换不变（`tests/unit/admin/autosave.test.ts` 保持通过）；localStorage 不可用时自动保存照常

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-06 自动保存](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [editor module-spec §2"本地暂存""恢复判断"](../../engineering/frontend/modules/editor/module-spec.md) · [components.md `RestoreBanner`](../../ui/components.md) · [admin-post-editor"保存状态"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-76 / UT-78](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：失败时写暂存；`compareLocalStash` 判定（更新 / 更旧 / 相等 / 内容相同） | 单元 |
| 2 | UT-79：恢复提示条文案与"恢复" / "丢弃"回调 | 单元 |
| 3 | [TC-US06-11](../../test/features/F-001-文章写作/acceptance/post-editor/US-06-tests.md)：断网本地暂存，恢复网络后自动重试成功 | E2E |
| 4 | TC-US06-13、TC-US06-14：本地暂存更新 → 提示并恢复 / 丢弃 | E2E |
| 5 | TC-US06-15：本地暂存更旧 / 时间相等不提示 | E2E |

## DoD（完成定义）

### 实现类
- [ ] 暂存读写包 try/catch；新建页 `mh:draft:new` 在首次创建成功后迁到 `mh:draft:{id}`
- [ ] 恢复后内容进入 `dirty` 并按正常流程保存

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e`（含 `editor-autosave.spec.ts`）全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

无

## 影响的文件

- `src/lib/autosave/local-draft.ts`（新建）、`useAutosave.ts`、`controller.ts`
- `src/components/ui/RestoreBanner.tsx`（新建）、`src/components/admin/editor/PostEditorPage.tsx`
- `tests/unit/admin/local-draft.test.ts`、`tests/e2e/editor-local-draft.spec.ts`（新建）

## 回滚策略

回退新增 / 修改的文件；浏览器残留的 `mh:draft:*` 不影响旧版本

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| editor module-spec §2 | "Sprint 2 接入"注记更新为已实现 |
