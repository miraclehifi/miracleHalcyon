# add-list-delete-undo: 列表删除撤销与延迟提交

**Sprint**: Sprint 2
**序号**: 11
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [swipe-row-actions](../../backlog/swipe-row-actions.md)

## 意图声明

- **改动意图**: 列表删除后行折叠消失，提示"已删除《标题》"带"撤销"；6 秒内撤销则原位恢复且不发请求；到时才 `fetch(…, { method: 'DELETE', keepalive: true })`；撤销期内离开页面或再删一行时立即提交前一个；请求失败行原位恢复并给常驻错误提示；删除后分页与空状态联动
- **影响范围**: `PostListPage.tsx`、`Toast.tsx`（带撤销变体）、`src/lib/admin/pending-delete.ts`（新建）
- **不变量**: 写文章页删除仍走确认框（UI 决定 #5）；筛选、搜索、分页逻辑不变

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-09 删除文章](../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/story.md) |
| 设计依据 | [admin-post-list"行操作"](../../ui/pages/admin-post-list.md) · [feature-ui-coverage UI 决定 #5](../../ui/features/F-001-文章写作/feature-ui-coverage.md) · [post api-contract `DELETE`](../../engineering/backend/domains/post/api-contract.md) · [components.md `Toast`](../../ui/components.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | 延迟删除控制器（fake timers）：6s 到期提交、撤销不提交、新删除先提交上一个、`pagehide` 立即提交 | 单元 |
| 2 | [TC-US09-14](../../test/features/F-001-文章写作/acceptance/post-management/US-09-tests.md)：列表删除后撤销，原位恢复、不发请求 | E2E |
| 3 | TC-US09-15：撤销期内离开页面 / 连续删除时立即提交 | E2E |
| 4 | TC-US09-13：删除后分页与空状态联动（21 → 20 篇、1 → 0 篇） | E2E |
| 5 | TC-US09-05（列表）：删除请求失败时行原位恢复并给常驻错误提示 | E2E |

## DoD（完成定义）

### 实现类
- [ ] 待删除控制器 + 撤销提示；删除后重新拉当前页以补位
- [ ] 测试 1 写入前端单元测试规格（新增 UT 编号）

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-swipe-row-delete](add-swipe-row-delete.md)

## 影响的文件

- `src/components/admin/PostListPage.tsx`、`src/components/ui/Toast.tsx`
- `src/lib/admin/pending-delete.ts`（新建）
- `tests/unit/admin/pending-delete.test.ts`、`tests/e2e/post-list-delete-undo.spec.ts`（新建）

## 回滚策略

回退到 add-swipe-row-delete 的"立即删除"行为

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| [swipe-row-actions](../../backlog/swipe-row-actions.md) | 删除 / 撤销验收项勾选，全部完成后状态 → done |
| admin-post-list | 删除"行操作、删除与撤销、入场动效在 Sprint 2"注记更新为已实现 |
