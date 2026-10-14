# add-live-photo-playback: 预览实况照片播放与 LiveBadge

**Sprint**: Sprint 3
**序号**: 9
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 新建 `LiveBadge`（`playing`）；`ArticleImage` 支持 `live`（`videoSrc` = 图片地址去扩展名 + `.live.mp4`），`<video>` 与 badge 作为 RefineFrame 的同级浮层、`complete` 后显示；桌面悬停静音播放一次、离开暂停并归零，手机长按播放、松手复原且不弹系统菜单；`error` 或 `canPlayType` 不支持时隐藏 badge、不再尝试播放。组图单元格经 ChromaGrid `renderOverlay`、手风琴展开项经 AccordionGallery `renderOverlay` 同样显示与播放
- **影响范围**: `src/components/article/LiveBadge.tsx`（新建）、`ArticleImage.tsx`、`ImageGallery.tsx`、`MarkdownPreview.tsx`（传入 `live`）
- **不变量**: 非实况图片显示不变；长按留给播放，不打开图片菜单（UI 决定 #7）
- **不在本任务**: 灯箱内播放（F-002）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC1、AC8；behaviors BH-10、BH-11 |
| 设计依据 | [components.md `ArticleImage` / `LiveBadge`](../../ui/components.md) · [design-tokens"图片浮层"](../../ui/design-tokens.md) · [ADR-006 第 6 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [markdown module-spec §3 `live`](../../engineering/frontend/modules/markdown/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-147](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `LiveBadge` 与播放：悬停 `play()`、离开 `pause()` + `currentTime = 0`；`error` 后隐藏 badge、不再播放 | 组件 |
| 2 | [TC-US11-23](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md)：桌面悬停播放、badge 变播放中样式，移出复原（单图与组图单元格） | E2E |
| 3 | TC-US11-24：手机长按播放、松手复原，不弹系统菜单 | E2E（webkit 手机） |
| 4 | TC-US11-25：视频无法解码时只显示静态图，隐藏 LIVE | E2E |

## DoD（完成定义）

### 实现类
- [ ] 测试环境 R2 预置一组实况照片夹具（jpg + `.live.mp4`）
- [ ] 视频 `muted`、`playsInline`、只播一次；`preload` 不在页面加载时下载视频
- [ ] components.md 中 `LiveBadge` 标注"已实现"

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/unit/components/article-image.test.tsx`、`image-gallery.test.tsx`、`tests/e2e/image-layout.spec.ts` 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-article-image-display](add-article-image-display.md)、[add-image-gallery-display](add-image-gallery-display.md)

## 影响的文件

- `src/components/article/LiveBadge.tsx`（新建）、`ArticleImage.tsx`、`ImageGallery.tsx`
- `src/components/admin/editor/MarkdownPreview.tsx`
- `tests/unit/components/live-badge.test.tsx`（新建）、`tests/e2e/live-photo-playback.spec.ts`（新建）

## 回滚策略

`ArticleImage` / `ImageGallery` 忽略 `live`，删除 `LiveBadge`；实况照片退回为静态图

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `LiveBadge`、`ArticleImage/Live` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
