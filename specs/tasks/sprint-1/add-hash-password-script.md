# add-hash-password-script: 提供生成管理员密码哈希的脚本

**Sprint**: Sprint 1
**序号**: 16
**状态**: completed
**类别**: SETUP
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 提供生成管理员密码哈希的脚本
- **影响范围**: `scripts/hash-password.ts`, `tests/unit/scripts/hash-password.test.ts`, `README.md`, `.dev.vars.example`
- **不变量**: 不改变依赖任务（implement-password-hashing）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [auth](../../engineering/backend/domains/auth/domain-model.md) |

## 唯一测试（红 → 绿）

`tests/unit/scripts/hash-password.test.ts`：脚本对输入密码输出的字符串可被 `verifyPassword` 校验通过

## DoD（完成定义）

### 实现类
- [x] `scripts/hash-password.ts` + `npm run hash-password`（从 stdin 读取，不回显）
- [x] README 写明设置 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH`、`SITE_ORIGIN` 的步骤（`wrangler secret put`、`.dev.vars`）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- Node 24 原生类型剥离直接运行 `.ts`（`node scripts/hash-password.ts`），无需额外运行器\n- 终端中原始模式逐字读取、不回显；管道输入同样支持（终端交互模式未自动化测试）\n- 新建 `README.md`（项目原先没有）

## 依赖

[implement-password-hashing](implement-password-hashing.md)

## 影响的文件

- `scripts/hash-password.ts`
- `tests/unit/scripts/hash-password.test.ts`
- `README.md`
- `.dev.vars.example`

## 回滚策略

回退本任务新增的配置与脚本；骨架类任务 `git revert` 对应提交

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
