# 本地一键启动脚本

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P1-High |
| 来源 | 作者需求（手动测试时上传图片返回 `SERVER_MISCONFIGURED`） |
| 日期 | 2026-10-15 |
| 创建者 | miraclehifi |

## 描述

本地只有 `.dev.vars.example`，没有 `.dev.vars`，`npm run dev` 读不到 `SITE_ORIGIN`，中间件拒绝所有后台写操作（保存文章、上传图片都返回 500 `SERVER_MISCONFIGURED`）。手动准备 `.dev.vars`、跑迁移、确认端口空闲，步骤多且容易漏。作者要求提供一个本地启动脚本，启动后可以正常登录、写作、上传。

## 目标与验收

**验收条件**:
- [x] `npm run dev:local` 一条命令完成：补齐 `.dev.vars` → 应用本地 D1 迁移 → 启动 `astro dev`
- [x] `.dev.vars` 不存在或缺项时补齐：`ADMIN_USERNAME` 默认 `admin`；缺 `ADMIN_PASSWORD_HASH` 时在终端提示输入密码（不回显）并写入哈希；`SITE_ORIGIN` 与启动端口一致（不一致时改写）；已有的其他行原样保留
- [x] 非终端环境缺密码哈希时报错退出，提示先运行 `npm run hash-password`
- [x] 端口已被占用时报错退出，不复用旧进程（旧的 preview 进程会占着 4321）
- [x] 支持 `--port <n>`，默认 4321
- [x] README"开发"一节、CLAUDE.md 命令表同步

## 影响分析

- **影响范围**: 新增 `scripts/dev-local.ts`、`tests/unit/scripts/dev-local.test.ts`；`scripts/hash-password.ts` 导出不回显输入函数供复用；`package.json` 新增 `dev:local`；README、CLAUDE.md
- **不变**: 业务代码、中间件来源校验、`npm run dev` 本身；E2E 与 dev 共用 `.wrangler/state` 的问题不在本条目处理

## 路由

SDD-Lite（开发工具，无 User Story / 领域 / 架构变更，按 [targeted-task-testing](targeted-task-testing.md) 等工具类条目先例不建 Feature 文档）。排入 Sprint 4 任务 [add-local-dev-script](../tasks/sprint-4/add-local-dev-script.md)，随 Sprint 4 一起 code-review。

## 估算

- **规模**: S

## 完成记录

2026-10-15 完成（Sprint 4 任务 [add-local-dev-script](../tasks/sprint-4/add-local-dev-script.md)）。手动验证：`dev:local` 启动后登录 204、新建文章 201、上传图片 201；端口占用时报错退出。

**已知**：miniflare 偶发 `fetch failed / bad port`（其 inspector 端口随机选到 fetch 禁用端口），与脚本无关，重新运行即可。
