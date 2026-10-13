# implement-login-endpoint: 实现 POST /api/admin/login

**Sprint**: Sprint 1
**序号**: 15
**状态**: completed
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 POST /api/admin/login
- **影响范围**: `src/pages/api/admin/login.ts`, `tests/integration/auth/login-endpoint.test.ts`
- **不变量**: 不改变依赖任务（implement-auth-middleware、implement-throttle-repo）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [authapi](../../engineering/backend/domains/auth/api-contract.md) |

## 唯一测试（红 → 绿）

`tests/integration/auth/login-endpoint.test.ts`（表驱动契约测试）：204 + Cookie 属性、400、401、429 + Retry-After、500 缺配置，与 auth api-contract 一致

## DoD（完成定义）

### 实现类
- [x] `src/pages/api/admin/login.ts`
- [x] 本地 http 环境 Cookie 去掉 `Secure`
- [x] 日志不含密码与 token

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `login` 的 `RATE_LIMITED` 结果带 `lockedUntil`（供 `Retry-After`），AUTH-UT-04 期望与 domain-model 签名同步\n- 空字符串账号 / 密码按缺字段返回 400；配置缺失只记录配置名\n- 新增 `src/lib/api/session-cookie.ts`（middleware 复用 `SESSION_COOKIE`）

## 依赖

[implement-auth-middleware](implement-auth-middleware.md), [implement-throttle-repo](implement-throttle-repo.md)

## 影响的文件

- `src/pages/api/admin/login.ts`
- `tests/integration/auth/login-endpoint.test.ts`

## 回滚策略

删除本任务新增的路由文件与测试；路由删除后对应接口返回 404，不影响已有数据

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
