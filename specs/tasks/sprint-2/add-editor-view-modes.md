# add-editor-view-modes: 写文章页视图切换与窄屏 Tab

**Sprint**: Sprint 2
**序号**: 13
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 宽屏（≥ 768px）顶栏 `SegmentedControl` 切换"编辑 / 并排 / 预览"，选择存 `localStorage['mh:editor:view']`；窄屏（< 768px）改为"编辑 / 预览" Tab
- **影响范围**: `PostEditorPage.tsx`、`EditorTopBar.tsx`、`src/components/ui/Tabs.tsx`（新建）
- **不变量**: 预览渲染、自动保存不受视图切换影响（隐藏的预览不卸载渲染状态）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04 Markdown 预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [admin-post-editor"布局""响应式"](../../ui/pages/admin-post-editor.md) · [components.md `SegmentedControl`、`Tabs`](../../ui/components.md) · feature-architecture §3.1（`mh:editor:view`） |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-52 / UT-55](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：三种视图模式渲染；Tab `role="tablist"`、←→ 切换、`aria-selected` | 单元 |
| 2 | [TC-US04-12](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md)：宽屏并排与视图切换（含 768 边界），刷新后保持 | E2E |
| 3 | TC-US04-13：窄屏 Tab 切换（含 767 边界） | E2E |

## DoD（完成定义）

### 实现类
- [x] 视图模式状态 + localStorage 读写（读写包 try/catch，不可用时默认"并排"）
- [x] `Tabs` 组件按 components.md 命名与变体
- [x] 窄屏工具栏固定在底部（键盘上方），承接 build-format-toolbar 未做的部分（admin-post-editor"响应式"）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `src/lib/editor/view-mode.ts`：`useEditorView()`——窄屏（`NARROW_QUERY` < 768px）用 Tab 状态（默认编辑，不记录）；宽屏取 本次选择 ?? `localStorage['mh:editor:view']` ?? 默认（≥ 1024px 并排、768–1023px 编辑，按 admin-post-editor"响应式"）。读存储用 `useSyncExternalStore`（服务端按并排输出），读写都包 try/catch
- `src/components/ui/Tabs.tsx`：`Tabs` + `Tabs.Item`（`tablist` / `tab`、`aria-selected`、`aria-controls`、roving tabindex、← / → 循环并选中）；样式按设计稿 `TabItem/Selected`（ink 600 + accent 2px 底线）/ `Default`
- 宽屏视图切换：`SegmentedControl`（`aria-label="视图"`，图标 `pen-line` / `columns-2` / `eye`，与设计稿一致；新登记 `columns-2`、`eye`），经 `EditorTopBar` 新增的 `viewSwitch` 放在"设置"左侧
- 两栏 `section` 加 `id`（`editor-pane` / `preview-pane`），隐藏的一栏只加 `hidden`，不卸载（预览渲染状态保留）；预览区不再在 < 1024px 时强制隐藏；分隔线只在并排时显示
- 窄屏工具栏：`EditorToolbar` 在 < 768px 时 `order-last` 通栏贴底（`EditorToolbar/Mobile`：surface 底、上边线、两端对齐，隐藏竖分隔线）。依赖 `h-dvh` 随键盘收缩；iOS Safari 键盘弹出时视觉视口变化不改变 `dvh`，真机上是否在键盘上方未验证（随 Sprint 3 / verify 真机检查）
- 顶栏主按钮的高光画布向外伸出 24px，在 375–1280px 都撑出约 16px 横向滚动（原有问题，本任务的"无横向滚动"断言暴露）；页面根加 `overflow-x-clip`
- 偏差：
  - TC-US04-12 在 768px 的默认视图按设计稿为"编辑"（用例原写并排）；按钮名按设计稿为"编辑 / 并排 / 预览"单选项（用例原写"仅编辑 / 仅预览"按钮，UT-55 原写 `aria-pressed`），已同步修改用例
  - 用例中的 `md-editor` testid 改为按区域（`region` "编辑" / "预览"）定位
- 测试：`tests/unit/admin/editor-view-mode.test.tsx`（宽屏三种视图与记忆、中等宽度默认编辑与存储不可用、窄屏 Tab）；`tests/e2e/editor-view-mode.spec.ts`（chromium + webkit：1280 / 768、767 / 375）
- 全量 E2E 首轮有 1 个无关失败（webkit `TC-US05-11` 混合拖入，第二张图未插入）；单独重复 3 轮 66/66 通过，再跑全量通过，判断为负载下的偶发

## 依赖

无

## 影响的文件

- `src/components/admin/editor/PostEditorPage.tsx`、`EditorTopBar.tsx`
- `src/components/ui/Tabs.tsx`（新建）
- `tests/unit/admin/editor-view-mode.test.tsx`、`tests/e2e/editor-view-mode.spec.ts`（新建）

## 回滚策略

回退修改的组件与新增文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| admin-post-editor"响应式" | 标注"已实现" |
