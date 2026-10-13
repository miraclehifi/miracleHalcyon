# implement-password-hashing: 实现 PBKDF2 密码哈希与校验

**Sprint**: Sprint 1
**序号**: 7
**状态**: completed
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 PBKDF2 密码哈希与校验
- **影响范围**: `src/domains/auth/password.ts`, `tests/unit/auth/password.test.ts`
- **不变量**: 不改变依赖任务（setup-workers-test-pool）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [auth](../../engineering/backend/domains/auth/domain-model.md) |

## 唯一测试（红 → 绿）

AUTH-UT-01：`hashPassword` / `verifyPassword` 往返、错误密码、篡改 salt、iterations 非数字

## DoD（完成定义）

### 实现类
- [x] `src/domains/auth/password.ts`：`hashPassword`、`verifyPassword`（WebCrypto PBKDF2-SHA256，100000 次，常量时间比较）
- [x] 格式 `pbkdf2$<iterations>$<saltB64>$<hashB64>`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 常量时间比较手写（XOR 累加），Node 与 Workers 通用；格式错误、base64 损坏、iterations 超过 100000（Workers PBKDF2 上限）一律返回 false

## 依赖

[setup-workers-test-pool](setup-workers-test-pool.md)

## 影响的文件

- `src/domains/auth/password.ts`
- `tests/unit/auth/password.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
