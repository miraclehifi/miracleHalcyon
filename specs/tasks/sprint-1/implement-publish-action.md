# implement-publish-action: 实现"发布"操作

**Sprint**: Sprint 1
**序号**: 67
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现"发布"操作
- **影响范围**: `src/components/admin/editor/PublishActions.tsx`, `src/components/admin/editor/EditorTopBar.tsx`, `tests/e2e/editor-publish.spec.ts`
- **不变量**: 不改变依赖任务（wire-autosave-to-editor、implement-publish-endpoint、build-toast-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

[TC-US08 发布草稿](../../test/features/F-001-文章写作/acceptance/post-management/US-08-tests.md)：草稿点"发布"→ 先保存再发布 → 徽标变"已发布"、提示"已发布，几分钟后读者可见"；`GET /api/posts/:slug` 返回 200

## DoD（完成定义）

### 实现类
- [ ] 主按钮"发布"（加载中禁用）；发布前 flush 自动保存
- [ ] 422 → 打开抽屉、聚焦首个缺失字段、常驻错误"发布前请填写：…"

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[wire-autosave-to-editor](wire-autosave-to-editor.md), [implement-publish-endpoint](implement-publish-endpoint.md), [build-toast-component](build-toast-component.md)

## 影响的文件

- `src/components/admin/editor/PublishActions.tsx`
- `src/components/admin/editor/EditorTopBar.tsx`
- `tests/e2e/editor-publish.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
