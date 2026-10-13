# build-post-settings-drawer: 实现设置抽屉（slug 跟随、摘要、日期）

**Sprint**: Sprint 1
**序号**: 61
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现设置抽屉（slug 跟随、摘要、日期）
- **影响范围**: `src/components/admin/editor/PostSettingsDrawer.tsx`, `tests/unit/admin/settings-drawer.test.tsx`
- **不变量**: 不改变依赖任务（build-editor-page-shell、build-field-component、implement-slugify）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) · [editor](../../engineering/frontend/modules/editor/module-spec.md) |

## 唯一测试（红 → 绿）

UT（frontend-unit-tests §4）：未改过 slug 时随标题生成；手动改过后不再跟随；中文标题 slug 留空并提示"请填写英文 slug"；摘要计数 `N / 200` 超出变红

## DoD（完成定义）

### 实现类
- [ ] `src/components/admin/editor/PostSettingsDrawer.tsx`（slug、摘要、发布日期默认当天）
- [ ] `slugTouched` 规则按 editor module-spec §4

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[build-editor-page-shell](build-editor-page-shell.md), [build-field-component](build-field-component.md), [implement-slugify](implement-slugify.md)

## 影响的文件

- `src/components/admin/editor/PostSettingsDrawer.tsx`
- `tests/unit/admin/settings-drawer.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
