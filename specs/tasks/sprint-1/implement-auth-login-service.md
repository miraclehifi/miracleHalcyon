# implement-auth-login-service: 实现登录服务

**Sprint**: Sprint 1
**序号**: 12
**状态**: completed
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现登录服务
- **影响范围**: `src/domains/auth/service.ts`, `tests/unit/auth/login-service.test.ts`
- **不变量**: 不改变依赖任务（implement-password-hashing、implement-login-throttle-rules）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [auth](../../engineering/backend/domains/auth/domain-model.md) |

## 唯一测试（红 → 绿）

AUTH-UT-04：内存仓储下正确凭据 / 错误密码 / 错误账号 / 锁定中正确密码

## DoD（完成定义）

### 实现类
- [x] `src/domains/auth/service.ts`：`login`（限流 → 账号常量时间比较 → 总是执行 verifyPassword → 写会话 / 写限流）
- [x] token 32 字节 base64url；库中只存 sha256

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 服务以工厂 `createAuthService(deps)` 提供，`verify` 可注入（测试用 spy 断言锁定期不比对密码）\n- 超长凭据（username > 64 / password > 256）按失败计数，不做哈希

## 依赖

[implement-password-hashing](implement-password-hashing.md), [implement-login-throttle-rules](implement-login-throttle-rules.md)

## 影响的文件

- `src/domains/auth/service.ts`
- `tests/unit/auth/login-service.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
