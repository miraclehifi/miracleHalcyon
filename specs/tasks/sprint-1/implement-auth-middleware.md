# implement-auth-middleware: 实现认证与 Origin 校验中间件

**Sprint**: Sprint 1
**序号**: 14
**状态**: pending
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现认证与 Origin 校验中间件
- **影响范围**: `src/middleware.ts`, `src/env.d.ts`, `tests/integration/auth/middleware.test.ts`
- **不变量**: 不改变依赖任务（implement-auth-session-check、implement-session-repo、implement-sanitize-next）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [auth](../../engineering/backend/domains/auth/domain-model.md) |

## 唯一测试（红 → 绿）

AUTH-UT-07（workers 集成）：4 类请求 × 有 / 无会话 × Origin 同源 / 异源 / 缺失，结果与 auth domain-model §7 表一致

## DoD（完成定义）

### 实现类
- [ ] `src/middleware.ts`：页面 302、接口 401、非 GET 校验 Origin（缺失时用 Referer）、已登录访问登录页 302 到 `sanitizeNext(next)`
- [ ] `Astro.locals.session` 类型声明

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-auth-session-check](implement-auth-session-check.md), [implement-session-repo](implement-session-repo.md), [implement-sanitize-next](implement-sanitize-next.md)

## 影响的文件

- `src/middleware.ts`
- `src/env.d.ts`
- `tests/integration/auth/middleware.test.ts`

## 回滚策略

删除本任务新增的路由文件与测试；路由删除后对应接口返回 404，不影响已有数据

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
