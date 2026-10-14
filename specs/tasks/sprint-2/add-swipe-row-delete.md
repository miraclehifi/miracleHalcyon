# add-swipe-row-delete: 列表行左滑操作抽屉

**Sprint**: Sprint 2
**序号**: 10
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [swipe-row-actions](../../backlog/swipe-row-actions.md)

## 意图声明

- **改动意图**: `PostListItem` 底层改用 React Bits SwipeRow：鼠标拖动 / 触摸左滑露出"编辑 / 删除"；拖过 60% 行宽红色块跃出、松手即删除；`⋯` 按钮与键盘也能打开抽屉；同一时间只开一行；拖动后不触发卡片跳转
- **影响范围**: `PostListItem.tsx`、`PostList.tsx`、`src/components/vendor/react-bits/SwipeRow.tsx`（新建）
- **不变量**: 卡片外观与链接结构不变；本任务删除后直接调用删除接口并移除行，撤销由下一个任务加

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-09 删除文章](../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/story.md) |
| 设计依据 | [admin-post-list"行操作"](../../ui/pages/admin-post-list.md) · [components.md"行滑动参数"](../../ui/components.md) · [design-tokens"焦点与交互"](../../ui/design-tokens.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US09-01](../../test/features/F-001-文章写作/acceptance/post-management/US-09-tests.md)：从列表左滑删除（全滑 / 抽屉"删除"） | E2E |
| 2 | TC-US09-16：拖动不误跳转、同一时间一行、`⋯` 与键盘打开、减弱动效时无回弹 | E2E |
| 3 | 抽屉状态：打开一行时其他行收起；抽屉打开时点卡片只收起 | 单元 |

## DoD（完成定义）

### 实现类
- [ ] `SwipeRow.tsx` 按 components.md 改源码，许可证随文件保留
- [ ] 删除旧的桌面悬停图标按钮（如有）

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[implement-delete-post-api](implement-delete-post-api.md)、[add-post-list-animated-entry](add-post-list-animated-entry.md)（同改 `PostList.tsx`）

## 影响的文件

- `src/components/admin/PostListItem.tsx`、`PostList.tsx`
- `src/components/vendor/react-bits/SwipeRow.tsx`（新建）
- `tests/unit/admin/post-list-item.test.tsx`、`tests/e2e/post-list-swipe.spec.ts`（新建）

## 回滚策略

回退 `PostListItem` 与新增 vendor 文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| [swipe-row-actions](../../backlog/swipe-row-actions.md) | 滑动相关验收项勾选 |
