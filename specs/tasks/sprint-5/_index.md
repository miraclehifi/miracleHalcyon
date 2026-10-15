# Sprint 5：F-001 P0 验收测试补齐

**状态**: completed
**创建**: 2026-10-15
**Feature**: F-001 文章写作（[Backlog: f001-p0-test-gaps](../../backlog/f001-p0-test-gaps.md)）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：补齐 verify 发现的 4 个无测试 P0 验收用例，并把验收文档里与设计不一致的期望值改为现行契约；完成后重新 verify，F-001 与 F-002 一起发布。
> 粒度按 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)。4 项行为均已实现，任务只补测试；测试若暴露缺陷，在同一任务内按 Bug 最小修复并记录。
> 测试执行：任务内只跑本任务的测试文件（chromium + webkit）；Sprint 末跑全量 `npm test`、`npm run test:e2e`。

## 任务索引

| # | Task | 名称 | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|------|---------|----|------|---------|---------|------|
| 1 | [sync-f001-acceptance-expectations](sync-f001-acceptance-expectations.md) | 验收文档期望值同步现行契约 | DOC | 文档 | US-03、06、07、08 | — | 0 | 低 | completed |
| 2 | [test-login-form-states](test-login-form-states.md) | 登录表单：提交中与失败状态 E2E | TEST | 表现层 | US-01 | — | 0 | 低 | completed |
| 3 | [test-slug-inline-error](test-slug-inline-error.md) | 非法 slug 行内提示 E2E | TEST | 表现层 | US-03 | — | 0 | 低 | completed |
| 4 | [test-leave-confirm](test-leave-confirm.md) | 未保存 / 保存中离开确认 E2E | TEST | 表现层 | US-06 | — | 0 | 中 | completed |

共 4 个任务，互相独立。任务 4 不确定性为中：WebKit 对 `beforeunload` 对话框和 `goBack` 的处理与 Chromium 不同。

> **verify 补跑**：Sprint 1 生成的 3 个 playwright-skill 脚本（`specs/test/features/F-001-文章写作/e2e/playwright-test-{login,editor,post-list}-ui.js`）任务记录写明"verify 阶段运行"，2026-10-15 verify 时漏跑，本 Sprint 补跑：请求体补 `cover: null`（F-002 起 `DraftInput` 七字段必填，缺字段 400 导致造数据失败）、列表行改按 `[role="listitem"]` 计数（Sprint 2 起列表行不是 `<li>`）后，7 / 7、6 / 6、8 / 8 通过。

## DoD（Sprint 级）

- [x] 所有任务 completed
- [x] `npm run lint`、`npm run check`、`npm test`、`npm run test:e2e` 通过（WebKit 负载超时单独重跑通过即可）：lint 0、check 0、`npm test` 331 / 331；E2E 315 通过 / 6 失败（全为 WebKit 负载超时，2 个 worker 重跑 6 / 6）/ 5 跳过，计时 4 / 4
- [x] F-001 重新 verify：validation-report、traceability 更新，validation → done（2026-10-16）
