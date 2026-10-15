# F-001 P0 验收测试补齐

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P0-Critical |
| 来源 | F-001 verify（[validation-report](../test/features/F-001-文章写作/validation/validation-report.md)） |
| 日期 | 2026-10-15 |
| 创建者 | miraclehifi |

## 描述

verify 追溯发现 F-001 的 256 个验收用例中 18 个没有测试、54 个只部分覆盖，并且有一批验收期望值在 design-domain 之后没有同步。作者决定：**只补 4 个 P0 用例并同步验收文档，其余缺口记为已知风险，然后与 F-002 一起发布**。

## 目标与验收

**验收条件**:
- [x] US-03 / US-06 / US-07 / US-08 验收文档中与设计不一致的期望值改为现行契约：TC-US03-01、02、03、04、05、07、11，TC-US06-24，TC-US07-02，TC-US08-04
- [x] TC-US01-31（提交中禁用 + 加载指示，连击只发 1 次请求）有 E2E 并通过
- [x] TC-US01-33（错误提示、清空密码、保留账号、按钮回到禁用）有 E2E 并通过
- [x] TC-US03-22（非法 slug 行内提示、不被保存、改回后提示消失）有 E2E 并通过
- [x] TC-US06-26（未保存 / 保存中离开触发 beforeunload，取消后内容保留）有 E2E 并通过
- [x] 其余缺口在 F-001 验证报告中记为已知风险（重新追溯后：无测试 10 个、部分覆盖 49 个）
- [x] 重新 verify：F-001 validation → done

## 影响分析

- **影响范围**: `tests/e2e/` 新增或扩充 4 个用例；`specs/test/features/F-001-文章写作/acceptance/` 下 US-03、06、07、08 验收文档；F-001 验证 / 追溯报告
- **不变**: 业务代码（4 项行为均已实现；如果测试暴露缺陷，按 Bug 走最小修复）

## 路由

SDD-Lite（只补测试与同步文档，无新 User Story、领域或架构变更）。排入 [Sprint 5](../tasks/sprint-5/_index.md)。

## 估算

- **规模**: S

## 完成记录

2026-10-16 完成（[Sprint 5](../tasks/sprint-5/_index.md)）。4 个 P0 用例补了 E2E 并通过，没有发现缺陷；5 份验收文档同步现行契约。另外补跑了首次 verify 漏跑的 3 个 playwright-skill 脚本（修正过时的请求体与列表选择器后 21 / 21 通过）。重新追溯：已覆盖 189、部分覆盖 49、无测试 10（无 P0）、线上 / 人工 8，剩余缺口记入 F-001 验证报告"已知风险"。

**知识吸收去向**：
- 验收期望值 → `specs/test/features/F-001-文章写作/acceptance/`（US-01、03、06、07、08，v1.1）
- 已知风险与重新验证结果 → `specs/test/features/F-001-文章写作/validation/validation-report.md`、`traceability.md`
- 测试 → `tests/e2e/login.spec.ts`、`editor-slug-conflict.spec.ts`、`editor-autosave.spec.ts`

