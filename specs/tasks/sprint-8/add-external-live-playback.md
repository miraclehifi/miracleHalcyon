# add-external-live-playback: 外链实况播放与菜单实况项

**Sprint**: Sprint 8
**序号**: 5
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/components/article/live-photo.tsx`、`MarkdownPreview`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)

## 意图声明

- **改动意图**: `LiveSource` 加 `range` / `codec`；`LivePhotoLayer` 对 `codec: 'hevc'` 用 hvc1 判断，有 `range` 时首次播放才 `loadVideoRange` 并设置 `src`；预览由 `ImageRef.mp` 生成外链 `live`，图片菜单"实况"项对外链按 `mp` 判断（不发请求）
- **影响范围**: `live-photo.tsx`、`MarkdownPreview.tsx`（`liveOf`、`hasLiveVideo` 传参）、`article-images.ts`（读 live range，任务 3 已读字段则只接线）
- **不变量**: 站内实况照片行为不变（live-photo-playback、reader-images、image-menu E2E 通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) AC5、AC7；BH-06、BH-10 |
| 设计依据 | [components.md `ArticleImage` live、`LiveBadge`](../../ui/components.md) · [ADR-010 第 6 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-174：`LivePhotoLayer` 外链视频 | 单元（组件） |
| 2 | UT-172（视频部分）：`loadVideoRange` 只接受 206 | 单元 |
| 3 | [TC-US13-10](../../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)：Chromium 退回静态图 | E2E |
| 4 | TC-US13-11：WebKit 悬停读取视频范围 | E2E（webkit） |
| 5 | TC-US13-07（菜单部分）：外链照片菜单实况项 | E2E |

## DoD（完成定义）

- [x] 播放前不读取视频；读取失败 / 播放错误后不再尝试
- [x] 测试清单全部由红变绿

## 依赖

[add-external-photo-loading](add-external-photo-loading.md)

## 影响的文件

- `src/components/article/live-photo.tsx`、`external-media.ts`、`src/components/admin/editor/MarkdownPreview.tsx`
- `tests/unit/components/`、`tests/e2e/afilmory-photos.spec.ts`

## 回滚策略

外链不输出 `live`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| components.md `LiveBadge` / `ArticleImage` live | 标注已实现 |
| [sprint-8/_index.md](_index.md) | 状态 → completed |
