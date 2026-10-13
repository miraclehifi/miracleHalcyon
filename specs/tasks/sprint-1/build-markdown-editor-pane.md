# build-markdown-editor-pane: 实现编辑区（标题 + 源码区 + 底栏）

**Sprint**: Sprint 1
**序号**: 60
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现编辑区（标题 + 源码区 + 底栏）
- **影响范围**: `src/components/admin/editor/MarkdownEditor.tsx`, `tests/unit/admin/markdown-editor.test.tsx`
- **不变量**: 不改变依赖任务（build-editor-page-shell）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) · [adr4](../../engineering/features/F-001-文章写作/architecture/adr/ADR-004-textarea-editor.md) |

## 唯一测试（红 → 绿）

`tests/unit/admin/markdown-editor.test.tsx`：标题回车把焦点移到源码区；底栏字数随输入更新（tabular-nums）；占位"无标题"

## DoD（完成定义）

### 实现类
- [x] `src/components/admin/editor/MarkdownEditor.tsx`（textarea 等宽字体；工具栏留到 Sprint 2）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `MarkdownEditor`：标题为自动增高的 textarea（长标题换行，修正上一任务截图中的截断），去掉换行；回车移到正文，输入法组字中的回车不跳；正文等宽字体 textarea；`PostEditorPage` 改用该组件
- 底栏字数定义：不计空白的字符数（按码位），千分位格式"1,284 字"，`tabular-nums`（规格未定义计数口径，按此实现）
- 底栏左侧暂只显示"Markdown (GFM)"：粘贴 / 拖入图片与"图片写法"在 Sprint 2 / 3 接入，提前显示会误导；工具栏 Sprint 2
- 过程记录：一次 `npm test` 在 shell 工作目录被重置为小写盘符后 unit 项目 32 个文件加载失败，重跑 52/52 通过，与代码无关

## 依赖

[build-editor-page-shell](build-editor-page-shell.md)

## 影响的文件

- `src/components/admin/editor/MarkdownEditor.tsx`
- `tests/unit/admin/markdown-editor.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
