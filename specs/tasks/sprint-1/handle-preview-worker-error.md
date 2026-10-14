# handle-preview-worker-error: 预览渲染出错时恢复

**Sprint**: Sprint 1
**序号**: 70
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: Worker 渲染出错时回错误响应，主线程复位"渲染中"并继续发排队的输入，预览保留上次结果并显示错误提示
- **影响范围**: `src/lib/markdown/worker.ts`, `src/components/admin/editor/MarkdownPreview.tsx`, `tests/unit/`（新增预览组件测试）
- **不变量**: 预览 E2E（TC-US04-09）与 markdown 单元测试结果不变；成功路径的 seq / 合并逻辑不变

> 追加原因（2026-10-14 Sprint 1 DoD 核对）：`renderMarkdown` 抛错时 Worker 不回消息，`busy` 永久为 true，此后所有输入只进队列，预览静默卡死。属需求遗漏，已先补 Spec（US-04 BH-09 / TC-US04-15、页面规格预览区、markdown module-spec §4）。

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors BH-09](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [editpage 预览区](../../ui/pages/admin-post-editor.md)、[markdown module-spec §4](../../engineering/frontend/modules/markdown/module-spec.md) |

## 唯一测试（红 → 绿）

[TC-US04-15 渲染失败保留上次预览并提示，下次成功后恢复](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md)：替身 Worker 回 `{ seq, error }` 后预览仍显示上次内容并出现"预览渲染失败，继续编辑会自动重试"，再输入时请求照常发出，成功后提示消失

## DoD（完成定义）

### 实现类
- [x] `worker.ts` 捕获渲染异常，回 `{ seq, error: true }`
- [x] `MarkdownPreview` 收到错误响应时复位 busy、发出排队输入、保留上次 HTML 并显示 `Alert/Error`；成功后清除

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过；`editor-preview.spec.ts` 通过
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `RenderResponse` 改为联合类型 `{ seq, html } | { seq, error: true }`；`worker.ts` 捕获渲染异常（`console.error` 留痕）后回错误响应
- `usePreviewHtml` 返回 `{ html, failed }`：错误响应只置 `failed`，`html` 保留上次结果；成功后清除。正文为空时不显示提示（占位优先）
- 受联合类型影响：`src/pages/admin/_spike-markdown.astro` 出错时按空结果计时（`astro check` 发现）
- 预览 E2E 单独运行首轮 webkit 偶发超时（chromium 并行 + 冷启动），webkit 重复 4 轮 4/4，属 stabilize-preview-timing-e2e 范围

## 依赖

[build-markdown-preview-pane](build-markdown-preview-pane.md), [build-alert-component](build-alert-component.md)

## 影响的文件

- `src/lib/markdown/worker.ts`
- `src/components/admin/editor/MarkdownPreview.tsx`
- `src/pages/admin/_spike-markdown.astro`
- `tests/unit/admin/markdown-preview.test.tsx`（新增）

## 回滚策略

回退本任务修改的两个源文件与新增测试（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 页面规格预览区 / module-spec §4 | 标注"已实现" |
