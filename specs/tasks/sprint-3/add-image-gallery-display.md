# add-image-gallery-display: 预览组图 ImageGallery（网格、手风琴）

**Sprint**: Sprint 3
**序号**: 8
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 新建 `ImageGallery`（`variant`：`grid` / `accordion`；`images`；`caption?`）：grid 内部渲染 React Bits ChromaGrid、每个单元格用 RefineFrame 包图片；accordion 内部渲染 React Bits AccordionGallery（新增依赖 `gsap`）；两者参数与源码改动按 components.md"组图网格参数""组图手风琴参数"。`MarkdownPreview` 把 `[data-gallery]` 挂载为组件（复用 `reconcileIslands`）。完成后预览中多图段落显示为网格，首张 `#accordion` 且 3–7 张时显示为手风琴
- **影响范围**: `src/components/article/ImageGallery.tsx`（新建）、`src/components/vendor/react-bits/ChromaGrid.tsx`、`AccordionGallery.tsx`（新建）、`MarkdownPreview.tsx`、`package.json`（`gsap`）
- **不变量**: 单图显示不变；预览中点击组图不打开灯箱（`onItemClick` / `onActiveClick` 在预览中不传）；组件可构建时预渲染
- **不在本任务**: 组图内的实况照片播放（add-live-photo-playback）；组图菜单（add-gallery-menu）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) AC2；behaviors BH-02 – BH-05 |
| 设计依据 | [components.md"组图网格参数""组图手风琴参数"](../../ui/components.md) · [design-tokens"组图网格""组图手风琴"](../../ui/design-tokens.md) · [markdown module-spec §3](../../engineering/frontend/modules/markdown/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US12-02](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md)：2 / 3 / 9 张渲染为网格，列数按 components.md | E2E |
| 2 | TC-US12-03：首张 `#accordion` 且 3 / 7 张渲染为手风琴，默认展开中间一张 | E2E |
| 3 | TC-US12-04 + TC-US12-05：手风琴 2 / 8 张退回网格、10 张折行；图文同段或空行分隔不成组 | E2E |
| 4 | `ImageGallery` 组件：平时彩色、仅鼠标在组图内时灰度聚光，触屏 `pointerType` 不触发；`prefers-reduced-motion` 变化被订阅 | 组件（R） |

## DoD（完成定义）

### 实现类
- [ ] ChromaGrid、AccordionGallery 源码改动按 components.md 表格逐项完成，文件头记录对上游的改动
- [ ] 手风琴高度按断点传入（桌面 420；≤ 520px 640）
- [ ] components.md 中 `ImageGallery` 标注"已实现"

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/e2e/image-layout.spec.ts`（单图部分）、`tests/unit/editor/reconcile-islands.test.ts` 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-article-image-display](add-article-image-display.md)

## 影响的文件

- `src/components/article/ImageGallery.tsx`、`src/components/vendor/react-bits/ChromaGrid.tsx`、`AccordionGallery.tsx`（新建）
- `src/components/admin/editor/MarkdownPreview.tsx`、`package.json`
- `tests/unit/components/image-gallery.test.tsx`（新建）、`tests/e2e/image-layout.spec.ts`

## 回滚策略

`MarkdownPreview` 不挂载 `[data-gallery]`（退回为插件输出的多个 `figure`），删除新增组件与 `gsap`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `ImageGallery`、ChromaGrid、AccordionGallery 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
