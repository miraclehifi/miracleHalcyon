# add-home-intro: 首页自我介绍

**Sprint**: Sprint 4
**序号**: 9
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 新建 `src/pages/index.astro` 与 `HomeIntro`（头像、问候语、多段简介、GitHub / 摄影 / 邮箱链接行），内容全部经 `normalizeSiteConfig` 读取 `site.ts`；补齐 `normalizeSiteConfig` 的 email、bio 校验；放置占位头像 `public/avatar.png`
- **影响范围**: `src/pages/index.astro`、`src/components/reader/HomeIntro.astro`、`src/lib/reader/site-config.ts`、`src/config/site.ts`、`public/avatar.png`
- **不变量**: 首页不加载 React
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-02](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-02-home-intro/story.md) |
| 设计依据 | [reader-home.md](../../ui/pages/reader-home.md) · admin.pen 06 / 06m |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US02-01](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-02-tests.md)：首页内容来自配置且不列文章 | E2E |
| 2 | TC-US02-02：社交链接新标签页、邮箱 mailto | E2E |
| 3 | TC-US02-03 + TC-US02-04（READER-UT-08）：空配置项不渲染；非法配置报错 | 单元 |

## DoD（完成定义）

### 实现类
- [ ] `site.ts` 字段与 reader-home.md"内容来源"一致
- [ ] 占位头像带宽高

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/reader-shell.spec.ts`（顶栏外链按配置显示）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-reader-layout](add-reader-layout.md)

## 影响的文件

- `src/pages/index.astro`
- `src/components/reader/HomeIntro.astro`
- `src/lib/reader/site-config.ts`、`src/config/site.ts`、`public/avatar.png`
- `tests/e2e/reader-home.spec.ts`、`tests/unit/reader/site-config.test.ts`

## 回滚策略

删除首页与组件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader-home.md](../../ui/pages/reader-home.md) | 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
