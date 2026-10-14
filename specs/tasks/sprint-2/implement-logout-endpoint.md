# implement-logout-endpoint: 实现登出接口

**Sprint**: Sprint 2
**序号**: 17
**状态**: completed
**类别**: API
**架构层级**: 领域层 + 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: `auth.logout(token)` 删除会话；`POST /api/admin/logout` 返回 204 并清 Cookie；`GET` 返回 405 不改会话；Origin 不符 403
- **影响范围**: `src/domains/auth/service.ts`、`session-repo.ts`、`src/pages/api/admin/logout.ts`（新建）
- **不变量**: 登录、会话校验、middleware 行为不变（`tests/integration/auth/*` 保持通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-02 登出](../../product/features/F-001-文章写作/stories/admin-auth/US-02-admin-logout/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-02-admin-logout/behaviors.md) |
| 设计依据 | [auth api-contract `POST /api/admin/logout`](../../engineering/backend/domains/auth/api-contract.md) · [auth domain-model](../../engineering/backend/domains/auth/domain-model.md) · [ADR-003](../../engineering/features/F-001-文章写作/architecture/adr/ADR-003-d1-session.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US02-01、TC-US02-05](../../test/features/F-001-文章写作/acceptance/admin-auth/US-02-tests.md)：有效会话登出 204、Cookie 清除；有效 → 登出 → 重新登录 | 集成 |
| 2 | TC-US02-03、TC-US02-04、TC-US02-06：旧 Cookie 对写接口与后台页面均被拒；多会话只失效当前会话 | 集成（安全） |
| 3 | TC-US02-07、TC-US02-08、TC-US02-09：无 / 伪造 / 过期 / 已登出 Cookie 与重复登出的行为符合契约 | 集成 |
| 4 | TC-US02-10、TC-US02-11：外域 / 缺失 Origin 403；GET 405 且会话仍有效 | 集成（安全） |
| 5 | TC-US02-17：响应与日志不含 Token，清除 Cookie 属性正确 | 集成（安全） |

## ⚠️ 前置确认项

- 契约写"无会话或已失效 → 401"，TC-US02-07 / 08 / 09 写"返回成功并指向登录页、不报错"。实现前核对两者（前端可把 401 也当作登出成功处理），以契约为准并同步验收用例

## DoD（完成定义）

### 实现类
- [x] `auth.logout`、`SessionRepo.delete`；`POST /api/admin/logout` 与 GET 405
- [x] 清除 Cookie：`mh_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：按新规则只跑 auth、post 集成测试（全量移到 Sprint 末，见 `.claude/rules/tasks.md`"测试执行"）
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- 前置确认（2026-10-14 作者确认）：无效会话登出返回成功。契约 401 改为 204；middleware 对 `/api/admin/logout` 不要求会话（仍校验 Origin）
- `auth.logout(token)`：有 token 就按哈希删除（`SessionRepo.delete` 已有），只删当前会话；`clearedSessionCookie(url)` 属性与签发一致（http 无 Secure）；`methodNotAllowed`（405 + `Allow`）
- 测试：`tests/integration/auth/logout-endpoint.test.ts`（TC-US02-01 / 05 / 17：204、两种 Cookie、会话失效、日志无 token；TC-US02-06 / 07 / 08 / 09：无 / 已登出 / 伪造 / 过期 / 空 / 超长 / 注入值与重复登出都 204，其他会话不受影响；TC-US02-11：GET 405、无 Cookie、会话仍有效；TC-US02-03 / 04 / 10：经 middleware 旧会话页面 302、5 个写接口 401，登出接口无会话放行、外域与缺失 Origin 403）
- 回归：auth + post 集成 19 文件 25 用例；lint 0、astro check 0（首次 3 个测试类型错误已修）。全量回归按新规则在 Sprint 末跑

## 依赖

无

## 影响的文件

- `src/domains/auth/service.ts`、`session-repo.ts`
- `src/pages/api/admin/logout.ts`（新建）、`src/lib/api/session-cookie.ts`
- `tests/integration/auth/logout-endpoint.test.ts`（新建）

## 回滚策略

回退新增接口与服务方法（无数据结构变更）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| auth api-contract | 标注"已实现" |
