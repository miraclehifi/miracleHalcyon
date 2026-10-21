# render-external-photos: 渲染外链照片

**Sprint**: Sprint 8
**序号**: 2
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/markdown/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)

## 意图声明

- **改动意图**: 新建 `plugins/external-photo.ts`（`parseExternalPhoto`、`thumbnailFor`）；`rehypeImageFigures` 对登记前缀下的图片输出宽高、主色、`data-thumb`、`data-mp`，`img[src]` 为缩略图；`live` 对外链只在有 mp 时生效；`ImageRef` 加 `thumb` / `mp`。reader 构建夹具的 filler-23 正文改为 Afilmory 照片（不新增文章，避免按篇数、分页断言的读者用例受影响；同 Sprint 6 对 filler-20 的做法）
- **影响范围**: `image-figures.ts`、`image-key.ts`（若需导出片段工具）、`render.ts` 导出；读者构建夹具（新增一篇文章会影响按篇数断言的读者 E2E / 单元测试，需同步）
- **不变量**: 站内 `/img/` 图片与未登记外链的输出逐字节不变（现有图片插件单元测试、同构快照通过）
- **不在本任务**: 客户端加载（任务 3）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) AC6、AC8；BH-08、BH-11 |
| 设计依据 | [markdown module-spec §1、§3](../../engineering/frontend/modules/markdown/module-spec.md) · [ADR-010](../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-166、UT-167：片段解析、缩略图推导 | 单元 |
| 2 | UT-168：`renderMarkdown` 外链照片输出（单图、组图、未登记前缀） | 单元 |
| 3 | [TC-US13-12](../../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)：构建产物检查 | 构建 |

## DoD（完成定义）

- [x] 前缀比较基于 `new URL` 规范化后的 href，`..`、前缀子串伪装不通过
- [x] 输出属性值只来自解析出的数字 / 十六进制 / 推导地址
- [x] 测试清单全部由红变绿；现有 `tests/unit/markdown/` 通过

## 依赖

[add-afilmory-photo-api](add-afilmory-photo-api.md)（`site.afilmory` 配置）

## 影响的文件

- `src/lib/markdown/plugins/external-photo.ts`（新建）、`image-figures.ts`、`render.ts`
- `tests/unit/markdown/external-photo.test.ts`（新建）、`tests/fixtures/reader/`、`scripts/check-reader-build-output*`（构建检查）、`tests/build/`（如有）

## 回滚策略

`rehypeImageFigures` 去掉外链分支

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| markdown module-spec | 外链照片标注已实现 |
| [sprint-8/_index.md](_index.md) | 状态 → completed |
