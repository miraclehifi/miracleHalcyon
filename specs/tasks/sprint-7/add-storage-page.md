# add-storage-page: 存储页（检测）

**Sprint**: Sprint 7
**序号**: 3
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-006 媒体存储清理](../../product/features/F-006-媒体存储清理/feature-scope.md)
**来源 PBI**: [media-orphan-cleanup](../../backlog/media-orphan-cleanup.md)

## 意图声明

- **改动意图**：后台顶栏增加"文章 / 存储"导航。新增 `/admin/storage` 页面，打开时自动检测，显示三张统计卡片和保护期提示，支持重新检测，并处理加载、无未引用资源、检测失败三种状态。清理按钮先只渲染，有候选时可点，交互放到任务 4
- **可演示**：点顶栏"存储"进入页面，看到统计数字；点"重新检测"，检测时间刷新
- **影响范围**：`AdminHeader.tsx`（文章列表页也用它，需要回归 02 列表页的 E2E）、`src/pages/admin/index.astro`（传 `current="posts"`）
- **不变量**：页面不渲染 `<img>` / `<video>`；组件名、变体按 [components.md](../../ui/components.md)

## 设计来源

- [admin-storage.md](../../ui/pages/admin-storage.md)：布局、StatCard、状态、响应式、可访问性
- [components.md](../../ui/components.md)：`AdminHeader`、`StatCard`、`StoragePage`
- [feature-architecture](../../engineering/features/F-006-媒体存储清理/architecture/feature-architecture.md) §4
- [shared-field-formats](../../engineering/shared-field-formats.md)："文件体积"
- admin.pen：09 / 09m / 09b、组件区 Row 6

## 实现步骤

1. `src/lib/format/bytes.ts`：`formatBytes`
2. `src/components/ui/StatCard.tsx`：`label`、`value`、`detail?`、`highlight?`、`loading?`，渲染为 `<dl>`
3. `src/components/admin/AdminHeader.tsx`：加 `current` prop 与导航（桌面显示文字，< 768px 显示图标）；`src/pages/admin/index.astro` 传 `current="posts"`
4. `src/lib/admin/storage-client.ts`：`fetchOrphans()`（沿用 `src/lib/api/http.ts`）
5. `src/components/admin/storage/StoragePage.tsx` 与 `src/pages/admin/storage.astro`（`prerender = false`）

## 测试清单

| # | 文件 | 覆盖 | 层 |
|---|------|------|----|
| 1 | `tests/unit/ui/format-bytes.test.ts` | F-006 UT-01 | 单元 |
| 2 | `tests/unit/admin/storage-page.test.tsx` | UT-02、03、04（StatCard 与统计区三种状态） | 组件（jsdom） |
| 3 | `tests/e2e/storage-page.spec.ts` | TC-US01-01、09、10、12、13、14、15 | E2E |

## DoD

实现类：
- [x] `/admin/storage` 可访问，顶栏当前项为"存储"；`/admin` 顶栏当前项为"文章"
- [x] 390 宽视口下导航为图标，统计卡片竖排，无横向滚动

测试类：
- [x] 测试清单 3 个文件由红变绿（E2E 跑 chromium，完成前补跑一次 webkit）
- [x] 影响范围回归：文章列表页现有 E2E（`tests/e2e` 中含 `/admin` 列表的文件）通过；`npm run lint`、`npm run check` 无报错

## 实现记录

见 [sprint-7-task-results](../../test/features/F-006-媒体存储清理/validation/sprint-7-task-results.md)。

## 回滚

删除新增文件；`AdminHeader.tsx`、`admin/index.astro` 用 `git show HEAD:<path>` 恢复。

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-storage.md、components.md（`AdminHeader`、`StatCard`） | 标注已实现与文件路径 |
| [sprint-7/_index.md](_index.md) | 状态 → completed |
