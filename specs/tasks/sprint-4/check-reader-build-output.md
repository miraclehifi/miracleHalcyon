# check-reader-build-output: 读者页构建产物检查

**Sprint**: Sprint 4
**序号**: 19
**状态**: completed
**类别**: TEST
**架构层级**: 构建
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 用夹具构建一次，检查产物：全部读者路由为静态 HTML、不在 Worker 按需路由中；运行时 Worker 包不含 `virtual:reader-data` 内容与 Shiki；首页 / 404 不含 React 运行时；产物中无草稿 / 撤回标识。写成可重复执行的构建测试（`npm run test:build`），Sprint 末统一回归时一起跑
- **影响范围**: `tests/build/reader-output.test.ts`、`package.json`（`test:build` 脚本）、`vitest.config.ts`（如需新项目）
- **不变量**: 不改业务代码
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-03-static-rebuild/story.md) AC1、AC5；[US-01](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-01-reader-shell/story.md)（JS 体积 NFR） |
| 设计依据 | [全局 NFR](../../product/nfr.md) · [ADR-007、ADR-008](../../engineering/features/F-002-博客首页与阅读/architecture/adr/) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US03-01](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-03-tests.md)：读者路由全部预渲染 | 构建 |
| 2 | TC-US03-09：草稿与已撤回内容不进入产物 | 构建 |
| 3 | TC-US01-09：首页 / 404 不加载 React 运行时 | 构建 |
| 4 | Worker 包不含虚拟模块数据与 Shiki 语法 | 构建 |

## DoD（完成定义）

### 实现类
- [x] `npm run test:build` 可单独执行
- [x] CLAUDE.md 命令表补 `test:build`

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：无（只读产物）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-home-intro](add-home-intro.md)、[add-tag-pages](add-tag-pages.md)、[add-reading-progress-toc](add-reading-progress-toc.md)、[refine-lightbox](refine-lightbox.md)、[add-post-card-details](add-post-card-details.md)、[add-article-typography](add-article-typography.md)、[add-theme-toggle](add-theme-toggle.md)

## 影响的文件

- `tests/build/reader-output.test.ts`
- `package.json`、`CLAUDE.md`

## 回滚策略

删除测试与脚本

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [CLAUDE.md](../../../CLAUDE.md) | 命令表 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
