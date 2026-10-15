# add-theme-toggle: 主题切换与首屏主题

**Sprint**: Sprint 4
**序号**: 8
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: `BaseLayout` `<head>` 加内联主题脚本（读 `localStorage.theme`，设置 `data-theme`）；`ThemeToggle.astro` + 原生脚本（`src/lib/reader/theme-toggle.ts`：三态轮换、存储失败忽略、`aria-label` 与图标同步）；接入 `SiteNav` 桌面与手机
- **影响范围**: `src/layouts/BaseLayout.astro`、`src/components/reader/ThemeToggle.astro`、`src/lib/reader/theme-toggle.ts`、`SiteNav.astro`
- **不变量**: 后台页面默认仍跟随系统（未存储时不设置 `data-theme`）
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-01-reader-shell/story.md) AC2 |
| 设计依据 | [reader-shell.md 主题切换](../../ui/pages/reader-shell.md) · [ADR-008](../../engineering/features/F-002-博客首页与阅读/architecture/adr/ADR-008-reader-interactivity.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US01-02](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-01-tests.md)：三态轮换并跨页保持 | E2E |
| 2 | TC-US01-03：首屏即为已选主题 | E2E |
| 3 | TC-US01-04：跟随系统时随系统切换 | E2E |
| 4 | READER-UT-12 + UT-201–204：`next`、存储抛错、名称 | 单元 |

## DoD（完成定义）

### 实现类
- [ ] 内联脚本不依赖模块加载（`is:inline`）
- [ ] ThemeToggle 不引入 React

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：F-001 中涉及暗色主题的 E2E（如 `tests/e2e/*theme*`、按钮质感用例）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-reader-layout](add-reader-layout.md)

## 影响的文件

- `src/layouts/BaseLayout.astro`
- `src/components/reader/ThemeToggle.astro`、`SiteNav.astro`
- `src/lib/reader/theme-toggle.ts`
- `tests/e2e/reader-theme.spec.ts`、`tests/unit/reader/theme-toggle.test.ts`

## 回滚策略

移除内联脚本与 ThemeToggle

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `ThemeToggle` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
