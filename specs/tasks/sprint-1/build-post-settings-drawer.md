# build-post-settings-drawer: 实现设置抽屉（slug 跟随、摘要、日期）

**Sprint**: Sprint 1
**序号**: 61
**状态**: completed
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
- [x] `src/components/admin/editor/PostSettingsDrawer.tsx`（slug、摘要、发布日期默认当天）
- [x] `slugTouched` 规则按 editor module-spec §4

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `PostSettingsDrawer`（受控）：Slug（等宽，提示 `/posts/{slug} · 仅小写字母、数字、连字符`；非法时"仅允许小写字母、数字和连字符"；中文标题生成不出时"请填写英文 slug"；预留 `slugError` 给服务端冲突）、标签插槽、摘要（计数 `N / 200` `aria-live=polite`，超限变红 + "摘要不能超过 200 字"并经 `aria-describedby` 关联）、发布日期（`type=date`）
- slug 跟随：`slugTouched` 在 `PostEditorPage`，已有文章 `slug ≠ slugify(标题)` 视为改过；手动改过后清空也不恢复跟随（UT-34 留给 design-ui 的问题，按页面规格"改过后不再跟随"）
- 摘要计数按码位（与服务端校验一致），未按 UT-38 的 grapheme：避免前端放行而保存时被拒；超过 200 后不能再变长，粘贴超出部分截掉，已有超长内容可删减
- 发布日期默认浏览器本地今天（`src/lib/format/local-date.ts`），水合后计算，避免服务端 UTC 与作者时区不一致
- 撤回为草稿 / 删除文章不在本任务：撤回由 implement-unpublish-action 接入，删除在 Sprint 2（US-09）

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
