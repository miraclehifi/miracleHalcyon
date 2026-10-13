# build-markdown-preview-pane: 实现实时预览区

**Sprint**: Sprint 1
**序号**: 66
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现实时预览区
- **影响范围**: `src/components/admin/editor/MarkdownPreview.tsx`, `tests/e2e/editor-preview.spec.ts`
- **不变量**: 不改变依赖任务（implement-markdown-code-highlight、spike-markdown-browser-worker、build-editor-page-shell）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) · [md](../../engineering/frontend/modules/markdown/module-spec.md) |

## 唯一测试（红 → 绿）

[TC-US04 预览 300ms 内更新](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md)：输入 GFM 内容停止后 300ms 内预览显示渲染结果，代码块有高亮

## DoD（完成定义）

### 实现类
- [ ] `src/components/admin/editor/MarkdownPreview.tsx`（Web Worker、只采用最新 seq、读者端 H1 显示标题、`@tailwindcss/typography` 排版）
- [ ] 视图切换、同步滚动、窄屏 Tab 留到 Sprint 2

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-markdown-code-highlight](implement-markdown-code-highlight.md), [spike-markdown-browser-worker](spike-markdown-browser-worker.md), [build-editor-page-shell](build-editor-page-shell.md)

## 影响的文件

- `src/components/admin/editor/MarkdownPreview.tsx`
- `tests/e2e/editor-preview.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
