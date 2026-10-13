# build-tag-input: 实现标签输入与补全

**Sprint**: Sprint 1
**序号**: 62
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现标签输入与补全
- **影响范围**: `src/components/ui/TagChip.tsx`, `src/components/admin/editor/TagInput.tsx`, `tests/e2e/editor-tags.spec.ts`
- **不变量**: 不改变依赖任务（build-post-settings-drawer、implement-tags-endpoint）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) · [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

[TC-US03 标签输入](../../test/features/F-001-文章写作/acceptance/post-editor/US-03-tests.md)：回车加入标签块、× 删除、输入时下拉显示已有标签并可选择

## DoD（完成定义）

### 实现类
- [ ] `src/components/ui/TagChip.tsx`、`src/components/admin/editor/TagInput.tsx`（debounce 200ms 请求补全）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[build-post-settings-drawer](build-post-settings-drawer.md), [implement-tags-endpoint](implement-tags-endpoint.md)

## 影响的文件

- `src/components/ui/TagChip.tsx`
- `src/components/admin/editor/TagInput.tsx`
- `tests/e2e/editor-tags.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
