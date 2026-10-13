# scaffold-project-skeleton: 搭建 Astro + Cloudflare 项目骨架

**Sprint**: Sprint 1
**序号**: 1
**状态**: completed
**类别**: SETUP
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 搭建 Astro + Cloudflare 项目骨架
- **影响范围**: `package.json`, `astro.config.mjs`, `wrangler.jsonc`, `tsconfig.json`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `src/pages/admin/login.astro（占位）`, `CLAUDE.md`
- **不变量**: 新建代码，无已有行为

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [arch](../../engineering/features/F-001-文章写作/architecture/feature-architecture.md) |

## 唯一测试（红 → 绿）

E2E 冒烟 `tests/e2e/smoke.spec.ts`：`npm run build && npm run preview`（`astro preview`，workerd 运行构建产物）后 `GET /admin/login` 返回 200

## DoD（完成定义）

### 实现类
- [x] Astro 7 + `@astrojs/react` + `@astrojs/cloudflare`（`output: "server"`）+ TypeScript strict 已初始化
- [x] Tailwind CSS 4 + `@tailwindcss/typography` 已接入
- [x] `wrangler.jsonc` 声明 D1 绑定 `DB`、R2 绑定 `MEDIA`（本地模拟）
- [x] Playwright 已配置（chromium、webkit 两个项目），`npm run test:e2e` 可运行
- [x] CLAUDE.md 命令表"测试 / Lint"已填写

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：无（新建代码，影响范围为空集）
- [x] `npm run lint` 与 `astro check` 无错误

## 依赖

无（基础任务）

## 影响的文件

- `package.json`
- `astro.config.mjs`
- `wrangler.jsonc`
- `tsconfig.json`
- `playwright.config.ts`
- `tests/e2e/smoke.spec.ts`
- `src/pages/admin/login.astro（占位）`
- `CLAUDE.md`

## 回滚策略

回退本任务新增的配置与脚本；骨架类任务 `git revert` 对应提交

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |

## 实现记录（2026-10-13）

- 框架按作者决定改为 **Astro 7.3**（原规划 Astro 5），配套 `@astrojs/cloudflare` 14、`@astrojs/react` 7、wrangler 4.149、TypeScript 6.0（typescript-eslint 上限 < 6.1）、ESLint 10
- 新版适配器基于 `@cloudflare/vite-plugin`，构建产物自带 `dist/server/wrangler.json`，预览改用 `astro preview`（替代 `wrangler dev`）
- 关闭适配器默认的 KV 会话（`session: false`，会话按 ADR-003 存 D1）和 Cloudflare Images 绑定（`imageService: "passthrough"`，图片按 ADR-005 原样输出）
- D1 迁移目录定为 `src/db/migrations`（与架构 §6.2 一致）；`database_id` 暂为本地占位值，接入生产时替换
- 测试结果：e2e 2/2 通过（chromium、webkit）；`npm run lint` 0 问题；`astro check` 0 错误 / 0 警告 / 0 提示；`npm run dev` 访问 `/admin/login` 200
- 环境提示：开发时 Node 22.18.0 低于部分依赖的引擎要求；2026-10-13 已升级到 Node 24.21.0 LTS，全量测试通过
