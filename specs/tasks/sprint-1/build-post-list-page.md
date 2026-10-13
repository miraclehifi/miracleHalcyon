# build-post-list-page: 实现文章列表页（主干）

**Sprint**: Sprint 1
**序号**: 54
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现文章列表页（主干）
- **影响范围**: `src/pages/admin/index.astro`, `src/components/admin/PostListPage.tsx`, `src/components/admin/AdminHeader.tsx`, `tests/e2e/post-list.spec.ts`
- **不变量**: 不改变依赖任务（build-post-list-item、implement-list-posts-endpoint、build-button-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) |

## 唯一测试（红 → 绿）

[TC-US07 列表按更新时间倒序](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md)：登录后进入 `/admin` 看到全部文章（含草稿）按更新时间倒序；点"新建文章"进入 `/admin/posts/new`

## DoD（完成定义）

### 实现类
- [x] `src/pages/admin/index.astro`（SSR 首屏数据）+ `src/components/admin/PostListPage.tsx` + `AdminHeader`（"登出"按钮占位，Sprint 2 接线）+ `PageHeader`
- [x] 加载中骨架、加载失败"重试"

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `src/pages/admin/index.astro` 服务端直接调用 `PostService.list` 取首屏（不经 HTTP）；读取失败时页面显示"加载失败 / 重试"，重试经 `GET /api/admin/posts` 拉取
- 相对时间水合一致：首次渲染（SSR + 水合）用 SSR 时刻与固定时区 Asia/Shanghai，水合后切到当前时间与浏览器时区；新增 `useHydrated()`（`src/lib/dom/hydration.ts`，useSyncExternalStore，避免 effect 里 setState）
- `AdminHeader`：桌面 `Button/Ghost`（图标 external-link / log-out，已登记到 icons.ts），手机 `IconButton` touch 44px；"查看博客"新标签打开 `/`；"登出"禁用，Sprint 2（US-02）接线
- `PageHeader`：标题 `text-display` +"共 N 篇"（tabular-nums）+ 右侧主操作；"新建文章"是 `Button`（点击跳转 `/admin/posts/new`）
- 列表为 `<ul><li>` 包 `PostListItem`；加载中 5 行骨架（`aria-busy`），失败 `role=alert`
- E2E：新增 `tests/e2e/support/admin.ts`（测试账号、UI 登录、经接口造数据），`login.spec.ts` 改用其中常量；用例以唯一标题前缀隔离并行数据
- UI 用例脚本：`specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js` + `.sh`（TC-US07-12/13/14/20，未执行，verify 阶段运行；TC-20 依赖 add-post-list-status-filter）
- US-07-tests.md 与 design-ui 对齐（v1.1）：状态文案、卡片列表、路由、按钮、TC-20 拦截时机
- 目视检查：桌面 1440 与手机 390 截图与设计稿 02 / 02m 一致，控制台无水合错误

## 依赖

[build-post-list-item](build-post-list-item.md), [implement-list-posts-endpoint](implement-list-posts-endpoint.md), [build-button-component](build-button-component.md)

## 影响的文件

- `src/pages/admin/index.astro`
- `src/components/admin/PostListPage.tsx`
- `src/components/admin/AdminHeader.tsx`
- `tests/e2e/post-list.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
