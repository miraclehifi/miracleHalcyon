# 任务粒度规则（项目覆盖）

> 覆盖 SDD 约定"TASK 粒度"中的"一个 TASK 恰好对应一个测试用例""每个 TASK 只涉及一个架构层级"，以及 plan-tasks Self-Check 中的对应检查项。TASK 排序、变更边界验证、DoD 分层仍按原约定。自 Sprint 2 起生效，Sprint 1 不追改。来源：[coarsen-task-granularity](../../specs/backlog/coarsen-task-granularity.md)

- 1 个 TASK = 1 个可演示的功能点：完成后作者能在页面或接口上看到一个完整的行为变化
- 可跨层：同一功能点的数据 / 领域 / 接口 / 表现层改动放在同一个 TASK
- 测试：TASK 文件用"测试清单"代替"唯一测试"，列出该功能点的全部测试（一般 2–5 个，覆盖各层变更点），完成时全部由红变绿
- 拆分信号：需要超过 5 个测试、跨 2 个以上 US，或改动量大到一次难以审查
- 合并信号：单独完成后无法演示（纯内部函数、没有使用方的组件）→ 并入使用它的功能点
- spike / 风险验证仍单独成 TASK，排在最前
- 参考量级：一个 US 拆 1–3 个 TASK

## 测试执行（自 Sprint 2 任务 17 起，来源：[targeted-task-testing](../../specs/backlog/targeted-task-testing.md)）

覆盖任务 DoD 中"影响范围回归：`npm test`、`npm run test:e2e` 全部通过"——任务内不跑全量：

- 红 / 绿 / 重构：只跑本任务测试清单里的测试文件（`npx vitest run <文件>`、`npx playwright test <文件> --project chromium`）
- 任务完成前：本任务改动直接波及的已有测试文件（被修改模块的调用方、同目录集成测试）+ 本任务 E2E 补跑 webkit 一次 + `npm run lint`、`npm run check`
- 全量 `npm test` + `npm run test:e2e`：只在 Sprint 末（进入 code-review 前）跑一次；改 middleware、共享组件等全局影响点时可提前跑一次
- 偶发失败：单独重跑该文件确认，不重跑全量
