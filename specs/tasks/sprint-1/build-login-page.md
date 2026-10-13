# build-login-page: 实现登录页

**Sprint**: Sprint 1
**序号**: 26
**状态**: completed
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
- [x] `src/pages/admin/login.astro` + `src/components/admin/LoginForm.tsx`（字段、提交中、凭据错误 / 限流 / 网络错误 / 空字段文案按 admin-login.md）
- [x] `next` 由 SSR 清洗后注入；成功后 `location.assign`
- [x] 提交失败后焦点回到密码框，提示条 `role="alert"`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- E2E 环境：`wrangler.jsonc` 新增 `env.e2e`（测试账号 test-admin，仅本地），Playwright 以 `CLOUDFLARE_ENV=e2e` 构建并先迁移本地 D1\n- 与 behaviors BH-05 / TC-US01-29 对齐：空字段时按钮禁用（admin-login.md 已同步）；站点名按设计稿 32px\n- 挂载时从 DOM 同步已有输入值：水合前输入 / 浏览器自动填充否则会让按钮一直禁用（WebKit E2E 暴露）\n- Cookie 属性以 Set-Cookie 响应头断言：Windows 版 WebKit 不支持 SameSite\n- UI 用例 TC-US01-29～34 已生成 `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js` + `.sh`（未执行，verify 阶段运行）；TC-34 用模拟 429，避免真实锁定本机 IP

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
