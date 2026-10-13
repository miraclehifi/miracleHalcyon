# implement-markdown-gfm-render: 实现 GFM 渲染

**Sprint**: Sprint 1
**序号**: 49
**状态**: pending
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 GFM 渲染
- **影响范围**: `src/lib/markdown/render.ts`, `tests/unit/markdown/gfm.test.ts`
- **不变量**: 不改变依赖任务（spike-markdown-workers-runtime）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [md](../../engineering/frontend/modules/markdown/module-spec.md) |

## 唯一测试（红 → 绿）

MD-UT-01：标题、列表、表格、任务列表、删除线、自动链接、脚注的输出快照

## DoD（完成定义）

### 实现类
- [ ] `renderMarkdown(source)` 完整处理链（不含图片插件与 sourceMap）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[spike-markdown-workers-runtime](spike-markdown-workers-runtime.md)

## 影响的文件

- `src/lib/markdown/render.ts`
- `tests/unit/markdown/gfm.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
