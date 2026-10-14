# 任务级测试改为按影响范围，全量回归移到 Sprint 末

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P1-High |
| 来源 | 作者需求 |
| 日期 | 2026-10-14 |
| 创建者 | miraclehifi |

## 描述

Sprint 2 每个任务都跑全量 `npm test` + 全量 E2E（chromium + webkit，每轮 2.5–3 分钟），偶发失败还要重跑，单个任务的测试耗时十几分钟，作者认为太慢。改为：任务内只跑受影响的测试，全量回归在 Sprint 末（进入 code-review 前）跑一次。

## 目标与验收

**验收条件**:
- [x] [`.claude/rules/tasks.md`](../../.claude/rules/tasks.md) 新增"测试执行"条款，覆盖 SDD 约定"变更边界验证"中每个任务跑全量回归的做法与任务 DoD 的"影响范围回归"项

## 影响分析

- **影响范围**: `.claude/rules/tasks.md`；不涉及代码
- **依赖项 / 被依赖**: 自 Sprint 2 任务 17（implement-logout-endpoint）起生效；Sprint 2 DoD"`npm test` 与 `npm run test:e2e` 全部通过"保留，作为 Sprint 末的全量回归

## 估算

- **规模**: XS
