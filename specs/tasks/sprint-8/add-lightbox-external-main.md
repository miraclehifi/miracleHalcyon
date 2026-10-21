# add-lightbox-external-main: 灯箱显示主图、组图主色

**Sprint**: Sprint 8
**序号**: 6
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/components/reader/Lightbox.tsx`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)（影响 F-002 读者页）
**来源 PBI**: [afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)

## 意图声明

- **改动意图**: `Lightbox` 的图片数据带 `external` 时先显示缩略图，`loadMainImage` 完成后换成主图（与正文共用缓存）；实况层沿用 `live`（含 range / codec）
- **影响范围**: `Lightbox.tsx`
- **不变量**: 站内图片灯箱行为不变（reader-lightbox E2E 通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) AC6；BH-08（组图主色）、BH-09 |
| 设计依据 | [reader-post-detail"图片与灯箱"](../../ui/pages/reader-post-detail.md) · [reader module-spec §4.2](../../engineering/frontend/modules/reader/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US13-09](../../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)：读者页网格主色、灯箱主图、不重复请求、切换时先缩略图 | E2E |

## DoD（完成定义）

- [x] 测试清单由红变绿

## 依赖

[add-external-photo-loading](add-external-photo-loading.md)

## 影响的文件

- `src/components/reader/Lightbox.tsx`、`tests/e2e/afilmory-photos.spec.ts`（读者页部分）

## 回滚策略

灯箱外链只显示缩略图

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader-post-detail"图片与灯箱" / reader module-spec | 标注已实现 |
| [sprint-8/_index.md](_index.md) | 状态 → completed |
