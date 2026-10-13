# setup-workers-test-pool: 配置 Workers 单元 / 集成测试环境

**Sprint**: Sprint 1
**序号**: 2
**状态**: completed
**类别**: SETUP
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 配置 Workers 单元 / 集成测试环境
- **影响范围**: `vitest.config.ts`, `tests/setup/apply-migrations.ts`, `tests/env.d.ts`, `tests/integration/pool.test.ts`, `package.json`, `tsconfig.json`
- **不变量**: 不改变依赖任务（scaffold-project-skeleton）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [arch](../../engineering/features/F-001-文章写作/architecture/feature-architecture.md) |

## 唯一测试（红 → 绿）

`tests/integration/pool.test.ts`：在 `@cloudflare/vitest-plugin`（workerd）中执行 `env.DB.prepare("SELECT 1").first()` 返回 1，且 `env.MEDIA.put/get` 往返成功

## DoD（完成定义）

### 实现类
- [x] Vitest 两个项目：`unit`（Node / jsdom）与 `workers`（`@cloudflare/vitest-plugin`，读取 wrangler.jsonc）
- [x] `npm test` 同时运行两个项目
- [x] 测试用 D1 每个测试文件自动应用 `src/db/migrations/` 并隔离

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 依赖

[scaffold-project-skeleton](scaffold-project-skeleton.md)

## 影响的文件

- `vitest.config.ts`
- `tests/setup/apply-migrations.ts`、`tests/env.d.ts`
- `tests/integration/pool.test.ts`
- `package.json`

## 回滚策略

回退本任务新增的配置与脚本；骨架类任务 `git revert` 对应提交

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |

## 实现记录（2026-10-13）

- `@cloudflare/vitest-pool-workers` 已废弃并改名为 **`@cloudflare/vitest-plugin`**（1.4），改用新包的 `cloudflareTest()` 插件
- Vitest 4 起不再支持 `vitest.workspace.ts`，两个项目（`unit`：jsdom；`workers`：workerd）写在 `vitest.config.ts` 的 `test.projects` 里
- **Vitest 锁定 4.1.x**：Vitest 5.0.4 配 vitest-plugin 1.4 在 Windows 上报 `File path must be a file: URL`，4.1.11 正常；等上游修复后再升级
- 迁移：Node 侧 `readD1Migrations("src/db/migrations")` 注入为 `TEST_MIGRATIONS` 绑定，`tests/setup/apply-migrations.ts` 在每个测试文件前 `applyD1Migrations`；存储按测试文件隔离（插件默认行为）
- 测试中用 `import { env } from "cloudflare:workers"`（`cloudflare:test` 的 `env` 已标为 deprecated）
- 安装依赖时 npm 10.9 在解析 vite 8 → `@vitejs/devtools-vitest` → `vitest@*` 的可选 peer 链时崩溃（`edgesOut`），改用 `npx npm@11 i` 安装；已有 lockfile 时 `npm install` 正常
- 测试结果：`npm test` 1/1 通过；`npm run test:e2e` 2/2 通过（回归）；lint 0 问题；astro check 0 错误
