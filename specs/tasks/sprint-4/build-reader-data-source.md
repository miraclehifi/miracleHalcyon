# build-reader-data-source: 构建数据源与读者夹具

**Sprint**: Sprint 4
**序号**: 2
**状态**: completed
**类别**: SETUP
**架构层级**: 配置 + 领域层（reader 纯函数）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 正式实现 Vite 插件 `readerData()`（reader module-spec §1.2：`READER_FIXTURE` / `READER_API_ORIGIN` 翻页 + 并发 6 取详情 / dev 默认夹具 / `READER_BOOTSTRAP`、失败报错含 URL 与状态、字段校验、排序、单次取数）与类型声明；`sortPublished` / `paginate` / `pagePaths`；按 _fixtures.md 生成夹具 `tests/fixtures/reader/reader-fixture.json`（41 篇，`hello` 正文含 12 张图片）与 `reader-fixture-empty.json`；Playwright webServer 构建注入 `READER_FIXTURE=reader-fixture`
- **影响范围**: `src/integrations/reader-data.ts`、`src/lib/reader/{types,sort}.ts`、`src/env.d.ts`、`astro.config.mjs`、`playwright.config.ts`、`tests/fixtures/reader/*`、E2E 种子（`hello` 用到的图片与 `.live.mp4`）
- **不变量**: F-001 E2E 构建与运行不受影响（只多一个环境变量）
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-03-static-rebuild/story.md) AC4、AC5 |
| 设计依据 | [reader module-spec §1、§2](../../engineering/frontend/modules/reader/module-spec.md) · [_fixtures.md](../../test/features/F-002-博客首页与阅读/acceptance/_fixtures.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | READER-UT-09：插件取数（`fetch` 替身：翻页 + 详情、500、非 JSON、`READER_BOOTSTRAP`、夹具不存在） | 单元 |
| 2 | READER-UT-01：`sortPublished` / `paginate` / `pagePaths` | 单元 |
| 3 | [TC-US03-08](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-03-tests.md)：数据源返回 500 时构建失败并报出地址与状态 | 构建 |
| 4 | 夹具自检：`reader-fixture.json` 符合 `ReaderPost` 校验、41 篇、标签与日期满足 _fixtures.md 基准值 | 单元 |

## DoD（完成定义）

### 实现类
- [x] 插件按 module-spec §1.2 表格逐项实现
- [x] `virtual:reader-data` 有类型声明，`npm run check` 不报未知模块
- [x] 夹具与 _fixtures.md 一致（篇数、标签计数、`hello` 的图片顺序）
- [x] README 增加读者数据变量说明（`READER_API_ORIGIN`、`READER_FIXTURE`、`READER_BOOTSTRAP`）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/support/*` 种子脚本；`playwright.config.ts` 变更后跑任意一个 F-001 E2E 文件确认能启动——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[spike-reader-prerender](spike-reader-prerender.md)

## 影响的文件

- `src/integrations/reader-data.ts`
- `src/lib/reader/types.ts`、`sort.ts`
- `src/env.d.ts`、`astro.config.mjs`、`playwright.config.ts`、`README.md`
- `tests/fixtures/reader/*.json`
- `tests/unit/reader/{data-source,sort,fixture}.test.ts`

## 回滚策略

移除插件注册与夹具；`playwright.config.ts` 去掉环境变量

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader module-spec](../../engineering/frontend/modules/reader/module-spec.md) §1 | 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
