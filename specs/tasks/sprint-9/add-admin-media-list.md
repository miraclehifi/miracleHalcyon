# add-admin-media-list: 后台书影音条目列表

**Sprint**: Sprint 9
**序号**: 4
**状态**: completed（2026-10-22）
**类别**: FRONTEND
**架构层级**: 表现层（`src/pages/admin/media/index.astro`、`src/components/admin/`、`src/components/reader/MediaTypeTabs.tsx`、`src/components/vendor/react-bits/GooeyNav.tsx`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: `AdminHeader` 加导航"书影音"（`library`）与 `current="media"`，手机站点名 18px、图标间距 0；`/admin/media` 页面（SSR 调 `ShelfService.list(type)`）：`PageHeader`（计数 + 新增条目）、`MediaTypeTabs client:load`（React 岛，内部渲染 vendor GooeyNav，`items` 由页面按 `?type=` 算好传入；参数与源码改动见 components.md"分类导航参数"，[gooey-media-tabs](../../backlog/gooey-media-tabs.md)）、`MediaEntryList client:load`（`MediaEntryRow` / `/Mobile` + ⋯ `Menu`、隐藏 / 取消隐藏、删除确认、Toast、`EmptyState`）；`src/lib/admin/shelf-client.ts`（hide / unhide / delete）
- **影响范围**: `AdminHeader` 被文章列表、写文章页、存储页使用（导航多一项，`current` 新取值）
- **不变量**: 现有 `current="posts"` / `"storage"` 的显示不变；`MediaTypeTabs` 无 JS 时每项仍是可用链接；GooeyNav 只供 `MediaTypeTabs` 使用
- **不在本任务**: 表单页（任务 5）；读者页使用 `MediaTypeTabs`（任务 8 复用）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md) AC1、AC7、AC8、AC10；BH-01–BH-03、BH-14–BH-16、BH-21 |
| 设计依据 | [admin-media.md §一](../../ui/pages/admin-media.md) · [components.md](../../ui/components.md) `AdminHeader`、`MediaEntryRow`、`MediaTypeTab`、"分类导航参数" · admin.pen 10 / 10m / 11b · [feature-architecture §4](../../engineering/features/F-005-书影音/architecture/feature-architecture.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `AdminHeader`：三项导航与 `current="media"` 的 `aria-current`；手机图标 `aria-label`（扩展 `tests/unit/components/admin-header.test.tsx`） | 单元 |
| 2 | `MediaEntryRow`：进行中 / 隐藏徽标、无评分留空、按钮 `aria-label` 含标题、隐藏态图标切换；删除确认框键盘（UT-14）（`tests/unit/admin/media-entry-row.test.tsx`） | 单元 |
| 3 | TC-US01-01、14、17（`tests/e2e/admin-media-list.spec.ts`） | E2E |
| 4 | TC-US01-22、23（同文件；条目用 `e2e-{随机}` 前缀经接口创建，结束删除；Deploy Hook 在 E2E 环境为空实现） | E2E |
| 5 | `MediaTypeTabs`：7 个链接与当前项 `aria-current`；就绪前当前项有反色底；普通左键点击其他项 → 700ms 后 `navigate(href)`（fake timers，替换 `src/lib/dom/navigate.ts`）；Ctrl / 中键点击不拦截；减弱动效时立即跳转（`tests/unit/components/media-type-tabs.test.tsx`；jsdom 无 WebGL2，走 DOM 胶囊兜底） | 单元 |

## DoD（完成定义）

- [x] 页面与 admin.pen 10 / 10m 一致（列宽、徽标、手机 ⋯ 菜单；标题区说明行改到标题下方并补读者页地址）。未一致两处归其他任务：表情星（任务 5 `StarRating`）、6 个分类（drop-anime-type）
- [x] 测试清单全部由红变绿（另补 `tests/unit/admin/media-entry-list.test.tsx`）；webkit 补跑通过（修 `ConfirmDialog` 焦点归还）；影响范围：`tests/e2e/` 中存储页、文章列表相关 spec（`AdminHeader` 使用方）chromium 通过

## 依赖

2

## 影响的文件

- `src/components/admin/AdminHeader.tsx`
- `src/pages/admin/media/index.astro`（新建）
- `src/components/admin/media/{MediaEntryList,MediaEntryRow}.tsx`（新建）、`src/components/reader/MediaTypeTabs.tsx`、`src/components/vendor/react-bits/GooeyNav.tsx`（新建，上游源码见 Backlog gooey-media-tabs，改动清单写文件头）
- `src/lib/admin/shelf-client.ts`（新建）
- `tests/unit/...`、`tests/e2e/admin-media-list.spec.ts`（新建）

## 回滚策略

删除新文件；`AdminHeader` git 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-media.md、components.md（`AdminHeader`、`MediaEntryRow`、`MediaTypeTab`、"分类导航参数"） | 标注已实现 |
| [gooey-media-tabs](../../backlog/gooey-media-tabs.md) | 勾选已完成的验收条件（读者页部分随任务 8） |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
