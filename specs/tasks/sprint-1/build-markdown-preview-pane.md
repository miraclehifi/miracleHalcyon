# build-markdown-preview-pane: 实现实时预览区

**Sprint**: Sprint 1
**序号**: 66
**状态**: completed
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
- [x] `src/components/admin/editor/MarkdownPreview.tsx`（Web Worker、只采用最新 seq、读者端 H1 显示标题、`@tailwindcss/typography` 排版）
- [x] 视图切换、同步滚动、窄屏 Tab 留到 Sprint 2

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现提示

- Expressive Code 在每次渲染的首个代码块内输出自带的 `<style>`（基础样式 + 主题变量）与复制按钮 `<script type="module">`（见 implement-markdown-sanitize 实现记录）。TC-US04-05 断言预览区无 `script`：需在本任务中处理（如样式 / 复制脚本提到页面级加载，预览区插入前去掉 `.expressive-code > style, .expressive-code > script`）

## 实现记录

- `MarkdownPreview` 挂载时创建 Worker（`worker.ts?worker`）并预热；正文变化即发送，渲染中又有输入时只保留最后一次（不排队），只采用最新 `seq`；正文为空（含仅空白）显示"在左侧开始写作，这里会显示预览"
- Expressive Code 每次渲染附带的 `<style>` 与复制按钮 `<script type="module">` 提到 `<head>`、按内容去重只加载一次，预览区内不留 style / script；复制脚本自行监听新插入的代码块，复制按钮可用
- 文章区排版：`global.css` 把 `@tailwindcss/typography` 的 `--tw-prose-*` 换成站点令牌（链接与正文同色、hover 强调色），正文 `font-prose`、行高 1.8、字间距 0.14px，H1–H4 `font-prose-heading`；读者端共用。亮 / 暗主题已截图核对
- WebKit 实测：Shiki 按需编译语法规则，首次遇到类型注解等写法时一次渲染近 1 秒（Chromium 约 120ms），之后约 110ms。预热样例因此覆盖常见 TS 写法与 GFM 结构，首次编辑降到 100–150ms
- jsdom 没有 Worker：`post-settings-drawer.test.tsx`（渲染整个写文章页）用空 Worker 替身
- 服务端产物不变（`dist/server` 1.5M，不含 Shiki 主题），Worker 只作为客户端 chunk

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
