# setup-workers-test-pool: 配置 Workers 单元 / 集成测试环境

**Sprint**: Sprint 1
**序号**: 2
**状态**: pending
**类别**: SETUP
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 配置 Workers 单元 / 集成测试环境
- **影响范围**: `vitest.config.ts`, `vitest.workspace.ts`, `tests/integration/pool.test.ts`, `package.json`
- **不变量**: 不改变依赖任务（scaffold-project-skeleton）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [arch](../../engineering/features/F-001-文章写作/architecture/feature-architecture.md) |

## 唯一测试（红 → 绿）

`tests/integration/pool.test.ts`：在 `@cloudflare/vitest-pool-workers` 中执行 `env.DB.prepare("SELECT 1").first()` 返回 1，且 `env.MEDIA.put/get` 往返成功

## DoD（完成定义）

### 实现类
- [ ] Vitest 两个项目：`unit`（Node / jsdom）与 `workers`（vitest-pool-workers，读取 wrangler.jsonc）
- [ ] `npm test` 同时运行两个项目
- [ ] 测试用 D1 每个测试文件自动应用 `migrations/` 并隔离

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[scaffold-project-skeleton](scaffold-project-skeleton.md)

## 影响的文件

- `vitest.config.ts`
- `vitest.workspace.ts`
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
