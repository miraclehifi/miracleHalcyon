# add-cover-field: 设置抽屉封面上传

**Sprint**: Sprint 4
**序号**: 17
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)（F-001 增量）

## 意图声明

- **改动意图**: 新建 `CoverField`（空态拖放区 / 选择图片；有封面时缩略图 + 更换 + 移除；上传中"上传中…"；校验与上传复用 `validateFile`、`fileToItem`（动态照片只取静态图）、`measureImage`、`uploadImage`；失败显示错误并保留原封面）；接入 `PostSettingsDrawer`（标签之后、摘要之前）
- **影响范围**: `src/components/admin/editor/CoverField.tsx`、`PostSettingsDrawer.tsx`
- **不变量**: 设置抽屉其他字段与删除 / 撤回行为不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-06](../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-06-post-cover/story.md) AC1、AC5 |
| 设计依据 | [admin-post-editor.md 设置抽屉](../../ui/pages/admin-post-editor.md) · [editor module-spec §4](../../engineering/frontend/modules/editor/module-spec.md) · admin.pen 03 |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US06-01](../../test/features/F-002-博客首页与阅读/acceptance/post-browsing/US-06-tests.md) + TC-US06-02：选择 / 拖入上传封面 | E2E |
| 2 | TC-US06-03：更换与移除 | E2E |
| 3 | TC-US06-04：上传失败保留原封面 | E2E |
| 4 | TC-US06-05：已发布文章改封面 → 有未发布修改（界面） | E2E |
| 5 | TC-US06-07 + UT-231–236：动态照片只传静态图；组件渲染、流程、无障碍 | E2E + 组件 |

## DoD（完成定义）

### 实现类
- [x] `CoverField` 名称与 components.md 一致
- [x] 抽屉内字段顺序与 admin.pen 03 一致

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/editor-settings*.spec.ts`、`tests/unit/components/post-settings-drawer*.test.tsx`——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-post-cover-api](add-post-cover-api.md)

## 影响的文件

- `src/components/admin/editor/CoverField.tsx`、`PostSettingsDrawer.tsx`
- `tests/unit/components/cover-field.test.tsx`、`tests/e2e/editor-cover.spec.ts`

## 回滚策略

从抽屉移除 `CoverField`（字段保持 null）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [admin-post-editor.md](../../ui/pages/admin-post-editor.md) | 封面标注已实现 |
| [components.md](../../ui/components.md) | `CoverField` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
