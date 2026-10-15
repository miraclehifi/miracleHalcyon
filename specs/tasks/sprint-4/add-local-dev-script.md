# add-local-dev-script: 本地一键启动脚本

**Sprint**: Sprint 4（Sprint 外追加，开发工具）
**序号**: 21
**状态**: completed
**类别**: SETUP
**架构层级**: 工具脚本
**所属 Feature**: —（开发工具）
**来源 PBI**: [local-dev-script](../../backlog/local-dev-script.md)

## 意图声明

- **改动意图**: `npm run dev:local` 补齐 `.dev.vars`（账号、密码哈希、与端口一致的 `SITE_ORIGIN`）、检查端口空闲、应用本地 D1 迁移，然后启动 `astro dev`，启动后后台写操作不再返回 `SERVER_MISCONFIGURED`
- **影响范围**: `scripts/dev-local.ts`、`scripts/hash-password.ts`（导出 `readHidden`）、`package.json`、README、CLAUDE.md
- **不变量**: 不改业务代码；`.dev.vars` 中已有的其他行保留
- **不在本任务**: dev 与 E2E 数据隔离

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | 空 `.dev.vars` + 密码哈希 → 生成三项，`SITE_ORIGIN` 为 `http://localhost:{port}` | 单元 |
| 2 | 已有完整配置且端口一致 → 内容不变，不需要密码 | 单元 |
| 3 | `SITE_ORIGIN` 与端口不一致 → 只改写该行，其他行与注释保留 | 单元 |
| 4 | 缺 `ADMIN_PASSWORD_HASH` 且未提供哈希 → 报告需要密码 | 单元 |
| 5 | 手动：`npm run dev:local` 启动后登录、保存文章、上传图片成功 | 手动 |

## DoD（完成定义）

- [x] 测试清单 1–4 由红变绿，5 手动通过
- [x] `npm run lint`（本任务文件）通过；`npm run check` 本任务文件无错误（另有 2 个错误来自并行进行中的改动：`src/domains/post/repo.ts`、`tests/integration/media/upload-memory.test.ts`）
- [x] README、CLAUDE.md 命令表补 `dev:local`

## 影响的文件

- `scripts/dev-local.ts`、`scripts/hash-password.ts`、`tests/unit/scripts/dev-local.test.ts`
- `package.json`、`README.md`、`CLAUDE.md`

## 回滚策略

删除脚本、测试与 `dev:local` 命令

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
| [local-dev-script](../../backlog/local-dev-script.md) | 状态 → done |
