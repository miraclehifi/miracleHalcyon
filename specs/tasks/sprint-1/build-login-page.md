# build-login-page: 实现登录页

**Sprint**: Sprint 1
**序号**: 26
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现登录页
- **影响范围**: `src/pages/admin/login.astro`, `src/components/admin/LoginForm.tsx`, `tests/e2e/login.spec.ts`
- **不变量**: 不改变依赖任务（implement-login-endpoint、build-button-component、build-field-component、build-alert-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [login](../../ui/pages/admin-login.md) · [authapi](../../engineering/backend/domains/auth/api-contract.md) |

## 唯一测试（红 → 绿）

[TC-US01 正常登录](../../test/features/F-001-文章写作/acceptance/admin-auth/US-01-tests.md)：输入正确账号密码 → 跳转 `/admin`，浏览器得到 HttpOnly 会话 Cookie（Playwright）

## DoD（完成定义）

### 实现类
- [ ] `src/pages/admin/login.astro` + `src/components/admin/LoginForm.tsx`（字段、提交中、凭据错误 / 限流 / 网络错误 / 空字段文案按 admin-login.md）
- [ ] `next` 由 SSR 清洗后注入；成功后 `location.assign`
- [ ] 提交失败后焦点回到密码框，提示条 `role="alert"`

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-login-endpoint](implement-login-endpoint.md), [build-button-component](build-button-component.md), [build-field-component](build-field-component.md), [build-alert-component](build-alert-component.md)

## 影响的文件

- `src/pages/admin/login.astro`
- `src/components/admin/LoginForm.tsx`
- `tests/e2e/login.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
