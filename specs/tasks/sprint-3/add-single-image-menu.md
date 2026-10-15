# add-single-image-menu: 单图菜单切换宽图

**Sprint**: Sprint 3
**序号**: 10
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（编辑器源码改写 + 预览组件）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 预览单图右上角显示触发按钮（`OverlayButton` size 32，`ellipsis`，"图片选项"），悬停或焦点进入时出现；点开 `ImageMenu kind="image"`（`Menu` 的 `menuitemcheckbox`"宽图"）。`toggleMark(source, range, 'wide')` 按图片的源码偏移与渲染时 URL 双重定位改写（合并 `#live,wide`，无剩余标记时去掉 `#`），定位不到返回 `null` 不改写；改写经 `applyEdit` 进入原生撤销栈。菜单执行后保持打开；源码变化导致该图片消失时关闭
- **影响范围**: `src/lib/editor/image-marks.ts`（新建：`toggleMark`、定位校验）、`src/components/ui/Menu.tsx`（补 checkbox / radio 菜单项，Sprint 2 遗留）、`src/components/ui/OverlayButton.tsx`、`src/components/admin/editor/ImageMenu.tsx`（新建）、`MarkdownPreview.tsx`、`PostEditorPage.tsx`（预览 → 源码改写回调）
- **不变量**: 已有 `Menu` 用法（写文章页 `⋯` 菜单）不变；组图内的单张图片不单独出菜单
- **不在本任务**: 组图菜单（add-gallery-menu）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) AC4；behaviors BH-07、BH-11 |
| 设计依据 | [admin-post-editor"图片菜单"](../../ui/pages/admin-post-editor.md) · [components.md `ImageMenu` / `OverlayButton` / `Menu`](../../ui/components.md) · [markdown module-spec §1 `ImageRef`](../../engineering/frontend/modules/markdown/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-134](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `toggleMark` 合并矩阵 + UT-136 定位校验不一致返回 `null` | 单元 |
| 2 | UT-137（单图部分）+ UT-138：`menuitemcheckbox`"宽图"；Enter 打开、↑ / ↓ 循环、Esc 关闭焦点回到触发按钮 | 组件（R / A） |
| 3 | [TC-US12-09](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md) + TC-US12-10：切换宽图改写源码、⌘Z / Ctrl+Z 撤销；已有 `#live` 时合并正确 | E2E |
| 4 | TC-US12-14 + TC-US12-15：菜单打开期间删除该图 → 菜单关闭、源码不改写；同一 URL 出现两次只改被操作的那张 | E2E |
| 5 | TC-US12-18：Tab 到图片、Enter 打开、方向键、Esc | E2E |

## DoD（完成定义）

### 实现类
- [x] `Menu` 新增 `menuitemcheckbox` / `menuitemradio`（选中显示 ✓），components.md 同步
- [x] 触发按钮位置：图片右上角内侧 8px；滚动预览区时菜单关闭
- [x] components.md 中 `ImageMenu`（单图）、`OverlayButton` 标注"已实现"

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归（可做任务全部完成后统一跑）：`Menu` 现有单元测试、`add-logout-entry` 的 E2E、`tests/e2e/image-layout.spec.ts` 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误（同上；本任务 tsc 已过）

## 依赖

[add-article-image-display](add-article-image-display.md)

## 影响的文件

- `src/lib/editor/image-marks.ts`（新建）、`src/components/ui/Menu.tsx`、`OverlayButton.tsx`（新建）
- `src/components/admin/editor/ImageMenu.tsx`（新建）、`MarkdownPreview.tsx`、`PostEditorPage.tsx`
- `tests/unit/editor/image-marks.test.ts`、`tests/unit/components/image-menu.test.tsx`（新建）、`tests/e2e/image-menu.spec.ts`（新建）

## 回滚策略

预览不渲染触发按钮，删除 `ImageMenu` 与 `image-marks.ts`；`Menu` 新增的菜单项类型保留（向后兼容）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `Menu` 菜单项类型、`ImageMenu`、`OverlayButton` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
