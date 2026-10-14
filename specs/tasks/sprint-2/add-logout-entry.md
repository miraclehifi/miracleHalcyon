# add-logout-entry: 后台"登出"入口

**Sprint**: Sprint 2
**序号**: 18
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 后台顶栏"登出"：调用登出接口后跳登录页；写文章页有未保存修改时先弹确认框，取消留在原页；登出后浏览器"后退"看不到后台内容
- **影响范围**: `AdminHeader.tsx`、写文章页顶栏入口、`/admin/**` 页面响应头（`Cache-Control: no-store`）
- **不变量**: 自动保存与离开拦截（`beforeunload`）行为不变；登出确认用已有 `ConfirmDialog`

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-02 登出](../../product/features/F-001-文章写作/stories/admin-auth/US-02-admin-logout/story.md) |
| 设计依据 | [site-map 全局导航](../../ui/site-map.md) · [admin-post-list 顶栏](../../ui/pages/admin-post-list.md) · [admin-post-editor 顶栏](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US02-02](../../test/features/F-001-文章写作/acceptance/admin-auth/US-02-tests.md)：从列表页、写文章页点击"登出"回到登录页 | E2E |
| 2 | TC-US02-12：登出后浏览器"后退"不显示后台内容 | E2E（安全） |
| 3 | TC-US02-13、TC-US02-14：有未保存修改时弹确认，取消留在原页 / 确定完成登出 | E2E |
| 4 | TC-US02-15、TC-US02-16：无未保存修改或保存完成后不弹窗直接登出 | E2E |

## ⚠️ 前置确认项

- 写文章页顶栏规格中"登出"入口的位置（直接按钮或菜单）以 admin-post-editor.md / admin.pen 为准，实现前核对

## DoD（完成定义）

### 实现类
- [x] 登出按钮（列表页、写文章页）；接口返回 401 也按已登出处理并跳登录页
- [x] `/admin/**` 页面不被浏览器缓存（"后退"重新请求并被 302）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- 前置确认（2026-10-14 作者确认）：写文章页入口放在顶栏 `⋯` 更多菜单。先补设计（admin.pen 03 / 03m 顶栏、04"写文章页更多菜单"，提交 02e3bf4），再实现
- `src/components/ui/Menu.tsx`（新建，按 components.md）：`Menu` + `Menu.Item` + `Menu.Separator`；`role="menu"`，打开时焦点到第一项，↑ ↓ 循环、Home / End，Enter / 空格选择，Esc / Tab / 点外部关闭（`onClose` 负责还焦点）；禁用项 `aria-disabled` 仍可聚焦。checkbox / radio 项留给 Sprint 3 的 `ImageMenu`
- `src/lib/admin/logout.ts`：POST 登出后跳 `/admin/login`；401 / 网络失败也跳（会话若仍有效，登录页会送回后台）
- `AdminHeader`：桌面"登出"按钮与手机图标按钮启用
- `EditorTopBar`：主按钮右侧 `MoreMenu`（`IconButton` ellipsis，"更多操作"，`aria-haspopup` / `aria-expanded`，展开时 `surface-sunken` 底；桌面 34px、手机 44px）
- `PostEditorPage`：有未保存修改时 `ConfirmDialog`（default，log-out 图标）"有未保存的修改，确定登出吗？"/"未保存的内容会暂存在本机，下次打开这篇文章时可以恢复。"/"登出"；确认后写本地暂存、放行离开拦截再登出（确认中按钮加载）
- `middleware`：有会话的 `/admin/**` 页面响应加 `Cache-Control: no-store`（"后退"重新请求并被跳转）
- 测试：`tests/unit/ui/menu.test.tsx`、`tests/unit/admin/editor-logout.test.tsx`；`tests/e2e/logout.spec.ts`（TC-US02-02 / 12 / 13 / 14 / 15 / 16）。E2E 在实现之后编写，未单独跑红灯
- 回归（Sprint 末全量，按 `.claude/rules/tasks.md`"测试执行"）：`npm test` 81 文件 160 用例；`npm run test:e2e` 140 通过 1 跳过 1 失败（webkit mainline-journey 并行负载下超过 30 秒总超时），单独重跑 16/16 通过

## 依赖

[implement-logout-endpoint](implement-logout-endpoint.md)

## 影响的文件

- `src/components/admin/AdminHeader.tsx`、`src/components/admin/editor/EditorTopBar.tsx`
- `src/middleware.ts`（`no-store` 头）
- `tests/e2e/logout.spec.ts`（新建）

## 回滚策略

回退修改的组件与 middleware 响应头

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
