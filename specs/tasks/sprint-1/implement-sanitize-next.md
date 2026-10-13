# implement-sanitize-next: 实现登录回跳地址清洗

**Sprint**: Sprint 1
**序号**: 9
**状态**: pending
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现登录回跳地址清洗
- **影响范围**: `src/domains/auth/next.ts`, `tests/unit/auth/next.test.ts`
- **不变量**: 不改变依赖任务（setup-workers-test-pool）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [auth](../../engineering/backend/domains/auth/domain-model.md) |

## 唯一测试（红 → 绿）

AUTH-UT-03：`sanitizeNext` 7 个输入的输出

## DoD（完成定义）

### 实现类
- [ ] `src/domains/auth/next.ts`：`sanitizeNext`

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[setup-workers-test-pool](setup-workers-test-pool.md)

## 影响的文件

- `src/domains/auth/next.ts`
- `tests/unit/auth/next.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
