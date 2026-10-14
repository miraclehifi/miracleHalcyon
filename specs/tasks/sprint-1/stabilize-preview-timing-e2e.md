# stabilize-preview-timing-e2e: 预览计时断言与并行用例隔离

**Sprint**: Sprint 1
**序号**: 71
**状态**: pending
**类别**: TEST
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 带计时断言的 E2E（TC-US04-09 的 300ms）在其余用例全部跑完后再单独执行，不与并行用例争抢 CPU
- **影响范围**: `playwright.config.ts`, `tests/e2e/editor-preview.spec.ts`
- **不变量**: 300ms 断言本身不放宽；其余 E2E 用例与浏览器矩阵（chromium + webkit）不变

> 追加原因（2026-10-14 Sprint 1 DoD 核对）：全量 E2E 30 个用例并行时，WebKit 下 TC-US04-09 偶发超过 300ms / 预热 5s 超时（单独重复运行 3 次失败 1 次）。计时断言受并行负载影响，结果不可信。

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) |
| 设计依据 | [US-04-tests TC-US04-09](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md) |

## 唯一测试（红 → 绿）

TC-US04-09 稳定：`npm run test:e2e` 连续 3 次全绿，且报告中 `editor-preview` 在 `chromium-timing` / `webkit-timing` 项目下、其余用例结束后执行

## DoD（完成定义）

### 实现类
- [ ] 计时用例打 `@timing` 标签；常规项目 `grepInvert` 排除，新增 `*-timing` 项目只跑该标签，`dependencies` 指向常规项目，`webkit-timing` 再依赖 `chromium-timing`（两者也不并发）

### 测试类
- [ ] 变更点测试：全量 E2E 连续 3 次全绿
- [ ] 影响范围回归：E2E 用例总数不变（30）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[build-markdown-preview-pane](build-markdown-preview-pane.md)

## 影响的文件

- `playwright.config.ts`
- `tests/e2e/editor-preview.spec.ts`

## 回滚策略

回退两个文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度；`test_command` 备注计时项目 |
