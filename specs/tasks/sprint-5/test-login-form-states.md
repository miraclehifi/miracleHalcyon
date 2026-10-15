# test-login-form-states: 登录表单提交中与失败状态 E2E

**Sprint**: Sprint 5
**序号**: 2
**状态**: completed
**类别**: TEST
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [f001-p0-test-gaps](../../backlog/f001-p0-test-gaps.md)

## 意图声明

- **改动意图**: 登录表单的提交中状态与失败状态（`LoginForm.tsx` 已实现）补 E2E
- **影响范围**: `tests/e2e/login.spec.ts`
- **不变量**: 不改 `LoginForm`；测试暴露缺陷时按 Bug 最小修复并在实现记录中说明

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US01-31][SC-LOGIN-10] 登录请求延迟 2s：点击后按钮立即禁用并显示"登录中…"；返回前再点 3 次、按 Enter 1 次，登录请求只发 1 次；返回后到 `/admin` | E2E |
| 2 | [TC-US01-33][SC-LOGIN-04] 错误密码：表单上方 `role="alert"` 显示"账号或密码错误，请检查后重试"（以 admin-login.md、auth api-contract 为准；验收文档原写"账号或密码错误"，由任务 1 同步），密码框清空、账号保留，停留在登录页且无会话 Cookie，按钮回到禁用 | E2E |

## DoD

- [x] 测试清单 2 项 chromium + webkit 通过
- [x] 失败用例使用独立 IP 或测试后清除限流计数，不影响其他登录用例
- [x] `npm run lint` 本任务文件通过

## 实现记录

- `tests/e2e/login.spec.ts` 新增两个用例，两个浏览器 6 / 6 通过；未改 `LoginForm`
- 失败用例通过 `extraHTTPHeaders` 设 `CF-Connecting-IP`（服务端按它限流）使用独立 IP，结尾正确登录一次清零计数（本地 D1 状态跨运行保留）
- 按钮禁用后 `locator.click` 会等待可用，连击改用 `page.mouse.click` 在原位置真实点击

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-5/_index.md](_index.md) | 本任务状态 → completed |
