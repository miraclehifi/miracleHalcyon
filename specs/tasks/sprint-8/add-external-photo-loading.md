# add-external-photo-loading: 先缩略图、进入视口换主图

**Sprint**: Sprint 8
**序号**: 3
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/components/article/`、`src/lib/reader/`、`MarkdownPreview`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)

## 意图声明

- **改动意图**: 新建 `src/components/article/external-media.ts`（`loadMainImage` / `loadVideoRange`，按地址缓存）；`ArticleImage` 与 `ImageGallery` 网格单元格支持 `external`：首屏缩略图，`IntersectionObserver` 进入视口后读取主图并替换（不重置加载状态，失败保留缩略图）；`collectArticleImages` 读 `data-thumb` / `data-mp`；`MarkdownPreview` 由 `ImageRef` 传入 `external`
- **影响范围**: `ArticleImage.tsx`、`ImageGallery.tsx`、`image-load.ts`、`article-images.ts`、`ArticleImagesIsland.tsx`、`MarkdownPreview.tsx`
- **不变量**: 不带 `external` 的图片行为不变（reader-images、image-layout、editor-preview E2E 通过）
- **不在本任务**: 实况视频（任务 5）、灯箱（任务 6）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) AC6；BH-08、BH-12 |
| 设计依据 | [components.md `ArticleImage`](../../ui/components.md) · [reader module-spec §4.2](../../engineering/frontend/modules/reader/module-spec.md) · [ADR-010 第 6 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-171：`collectArticleImages` 外链字段 | 单元 |
| 2 | UT-172：`loadMainImage` 请求头、缓存、失败重试 | 单元 |
| 3 | UT-173：`ArticleImage` 外链替换与失败保留 | 单元（组件） |
| 4 | [TC-US13-08](../../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)：预览中缩略图 → 进入视口 Range 请求 → 主图 | E2E |

## DoD（完成定义）

- [x] `rootMargin` 200px；同一地址在正文多处出现只读取一次
- [x] 测试清单全部由红变绿

## 依赖

[render-external-photos](render-external-photos.md)

## 影响的文件

- `src/components/article/external-media.ts`（新建）、`ArticleImage.tsx`、`ImageGallery.tsx`、`image-load.ts`
- `src/lib/reader/article-images.ts`、`src/components/reader/ArticleImagesIsland.tsx`、`src/components/admin/editor/MarkdownPreview.tsx`
- `tests/unit/components/`、`tests/unit/reader/article-images.test.ts`、`tests/e2e/afilmory-photos.spec.ts`（新建）、`tests/e2e/support/afilmory.ts`（新建：raw 打桩，按 Range 切片）

## 回滚策略

去掉 `external` prop 与读取模块

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| components.md `ArticleImage` / reader module-spec §4.2 | 标注已实现 |
| [sprint-8/_index.md](_index.md) | 状态 → completed |
