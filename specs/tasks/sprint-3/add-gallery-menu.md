# add-gallery-menu: 组图菜单（网格、手风琴、拆成单图）与手机点按

**Sprint**: Sprint 3
**序号**: 11
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（编辑器源码改写 + 预览组件）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 组图右上角触发按钮（"组图选项"）打开 `ImageMenu kind="gallery"`：`menuitemradio`"网格 / 手风琴" → 分隔线 → `menuitem`"拆成单图"；张数不在 3–7 时"手风琴" `aria-disabled` 并提示"手风琴需要 3–7 张图片"。`setGalleryMode(source, range, mode)`：accordion 首张加 `#accordion`、grid 去掉、split 在图片之间插入空行（之后菜单关闭），同样双重定位、可撤销。手机：点按单图或组图直接展开菜单（菜单项 44px），点外部关闭
- **影响范围**: `src/lib/editor/image-marks.ts`（`setGalleryMode`）、`ImageMenu.tsx`（`gallery` 形态、`/Mobile` 触屏形态）、`MarkdownPreview.tsx`（组图挂触发按钮、手机点按）
- **不变量**: 单图菜单行为不变；手机长按仍留给实况照片播放
- **不在本任务**: "合并为组图"（不提供菜单项，靠手写）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) AC5；behaviors BH-08、BH-09 |
| 设计依据 | [admin-post-editor"图片菜单"](../../ui/pages/admin-post-editor.md) · [components.md `ImageMenu`](../../ui/components.md) · [feature-ui-coverage 决定 #7](../../ui/features/F-001-文章写作/feature-ui-coverage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-135](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `setGalleryMode` 三种模式，其他文本不变 | 单元 |
| 2 | UT-137（组图部分）：`menuitemradio` + `menuitem`；张数不在 3–7 时"手风琴" `aria-disabled` | 组件（R） |
| 3 | [TC-US12-11](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md) + TC-US12-12：网格 ↔ 手风琴 ↔ 拆成单图并可撤销；手风琴不可用时提示 | E2E |
| 4 | TC-US12-13：手机点按单图 / 组图出现菜单、可点区域 ≥ 44px、点外部关闭 | E2E（手机视口） |

## DoD（完成定义）

### 实现类
- [x] "拆成单图"后菜单关闭、焦点回到预览区
- [x] components.md 中 `ImageMenu/Gallery`、`ImageMenu/Mobile` 标注"已实现"

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归（可做任务全部完成后统一跑；`image-menu.spec.ts` 两浏览器、TC-US11-24 长按不开菜单已在本任务跑过）：`tests/unit/editor/image-marks.test.ts`、`tests/unit/components/image-menu.test.tsx`、`tests/e2e/image-menu.spec.ts`、`tests/e2e/live-photo-playback.spec.ts`（长按不开菜单）通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误（统一跑；本任务 tsc、eslint 已过）

## 依赖

[add-image-gallery-display](add-image-gallery-display.md)、[add-single-image-menu](add-single-image-menu.md)（共用 `ImageMenu.tsx`、`image-marks.ts`）

## 影响的文件

- `src/lib/editor/image-marks.ts`、`src/components/admin/editor/ImageMenu.tsx`、`MarkdownPreview.tsx`
- `tests/unit/editor/image-marks.test.ts`、`tests/unit/components/image-menu.test.tsx`、`tests/e2e/image-menu.spec.ts`

## 回滚策略

组图不渲染触发按钮，回退 `setGalleryMode` 与 `gallery` 形态；单图菜单不受影响

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `ImageMenu/Gallery`、`/Mobile` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
