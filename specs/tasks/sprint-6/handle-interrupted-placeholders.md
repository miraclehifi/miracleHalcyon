# handle-interrupted-placeholders: 孤立占位：上传已中断

**Sprint**: Sprint 6
**序号**: 5
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/editor/`、`src/components/admin/editor/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: 编辑器改为占位槽位模型：页面加载时已有占位为空槽位；编辑中按改动区间识别删除的槽位和新出现的占位（撤销"移除"、粘贴占位文本）；对不上时全部转为空槽位、不改写源码。空槽位在预览中显示 `UploadCard state="interrupted"`，只有"移除"
- **影响范围**: 占位槽位逻辑（`use-image-uploads.ts` 及其占位定位函数）、`UploadCard.tsx`（interrupted 态）、`MarkdownPreview.tsx`
- **不变量**: 有任务的占位定位行为不变（ED-UT-03、TC-US05-24 仍通过）
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC9；BH-19 |
| 设计依据 | [editor module-spec §1 占位槽位](../../engineering/frontend/modules/editor/module-spec.md) · [admin-post-editor"上传进度卡片"已中断](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | editor 单元：槽位模型——加载时全空槽位、插入批次、删除 / 新增占位的识别、对不上时全部转空且不改写（扩展 ED-UT-03） | 单元 |
| 2 | [UT-159](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)（interrupted 态：只有"移除"、无缩略图和进度条） | 单元 |
| 3 | [TC-US05-37](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：经 API 写入含占位的正文，打开后显示"上传已中断"，移除只删对应占位 | E2E |
| 4 | TC-US05-27 步骤 3：撤销"移除"后恢复的占位显示"上传已中断" | E2E |
| 5 | TC-US05-24（回归）：上传期间在占位前输入，引用仍替换到原位置 | E2E |

## DoD（完成定义）

### 实现类
- [x] 空槽位"移除"按该占位的序号删除，经 `applyEdit`（可撤销）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-upload-failure-actions](add-upload-failure-actions.md)

## 影响的文件

- `src/lib/upload/use-image-uploads.ts`（或拆出的占位槽位模块）
- `src/components/admin/editor/UploadCard.tsx`、`MarkdownPreview.tsx`
- `tests/unit/editor/`（占位相关测试）、`tests/e2e/editor-upload-card.spec.ts`、`tests/e2e/editor-image-paste.spec.ts`

## 回滚策略

恢复"任务列表与占位一一对应"的旧模型，去掉 interrupted 态

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [editor module-spec](../../engineering/frontend/modules/editor/module-spec.md) | 占位槽位标注"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
