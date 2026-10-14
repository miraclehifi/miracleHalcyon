# add-post-list-animated-entry: 文章列表入场动效与方向键选择

**Sprint**: Sprint 2
**序号**: 9
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [animated-list](../../backlog/animated-list.md)

## 意图声明

- **改动意图**: 列表底层改用 React Bits AnimatedList：进入、筛选、搜索、翻页后卡片逐行弹入（错开 50ms）；悬停、键盘聚焦、方向键只改同一个选中行（`PostCard/Hover`）；焦点在列表内时 ↑ / ↓ / Home / End 移动焦点；减弱动效时只渐显
- **影响范围**: `PostListPage.tsx`、`src/components/admin/PostList.tsx`（新建）、`src/components/vendor/react-bits/AnimatedList.tsx`（新建）
- **不变量**: 卡片外观、Tab 顺序、`<a>` + 并列 `<button>` 结构与读屏名称不变；不出现内部滚动条

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-07 文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) |
| 设计依据 | [admin-post-list"入场与选中"](../../ui/pages/admin-post-list.md) · [components.md"列表动效参数"](../../ui/components.md) · [design-tokens"焦点与交互"](../../ui/design-tokens.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | 入场：进入页面与翻页后卡片依次出现（错开）；`prefers-reduced-motion` 时只渐显、无位移（来自 animated-list 验收条件） | E2E |
| 2 | 方向键：焦点在列表内 ↑ / ↓ / Home / End 移到对应卡片标题链接；列表外方向键照常滚动 | E2E |
| 3 | 单一选中态：悬停、键盘聚焦、方向键同一时间只有一行处于 `PostCard/Hover` | 单元 |
| 4 | 回归：[TC-US07-12、TC-US07-13](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md) 与 UT-10 / UT-21 列表结构与语义不变 | 单元 + E2E |

## DoD（完成定义）

### 实现类
- [ ] `AnimatedList.tsx` 按 components.md 改源码（去掉磨砂底板、行块、选中框，不用 `listbox` / `option`），许可证随文件保留
- [ ] 测试 1–3 写入 US-07 验收用例（新增 TC 编号）

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e`（`post-list*.spec.ts`）全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

无

## 影响的文件

- `src/components/admin/PostListPage.tsx`、`src/components/admin/PostList.tsx`（新建）
- `src/components/vendor/react-bits/AnimatedList.tsx`（新建）
- `tests/unit/admin/post-list.test.tsx`、`tests/e2e/post-list-motion.spec.ts`（新建）

## 回滚策略

回退到直接渲染卡片列表；移除 vendor 文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| [animated-list](../../backlog/animated-list.md) | 后台列表相关验收项勾选（`HomePosts` 属 F-002） |
| US-07 验收用例 | 补入场 / 方向键用例 |
