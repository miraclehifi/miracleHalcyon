# stabilize-preview-timing-e2e: 并行负载下 E2E 稳定（计时用例隔离、等待水合完成）

**Sprint**: Sprint 1
**序号**: 71
**状态**: completed
**类别**: TEST
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: ① 带计时断言的 E2E（TC-US04-09 的 300ms）在其余用例全部跑完后再单独执行；② 与页面交互前等待 React 真正完成水合（不只是 `ssr` 属性移除）；③ Ctrl/⌘+S 用例改用 `page.clock` 暂停页面计时器来证明是快捷键触发，不再依赖 1 秒时间窗
- **影响范围**: `playwright.config.ts`, `tests/e2e/support/`（新增 `hydration.ts`，`login` 等待水合）, `tests/e2e/*.spec.ts`（替换 `astro-island:not([ssr])` 等待）
- **不变量**: 300ms 断言本身不放宽；不改产品代码；其余 E2E 用例与浏览器矩阵（chromium + webkit）不变

> 追加原因（2026-10-14 Sprint 1 DoD 核对）：全量 E2E 30 个用例并行时，WebKit 下 TC-US04-09 偶发超过 300ms / 预热 5s 超时（单独重复运行 3 次失败 1 次）。计时断言受并行负载影响，结果不可信。
>
> 范围扩展（同日排查）：负载下（`--repeat-each=3`）WebKit 另有 TC-US06 / TC-US03-18 / TC-US08-05 / TC-US07-16 偶发失败。trace 证实两类根因：Astro 在 `hydrateRoot` 后立即移除 `ssr`，React 并发水合尚未提交，`fill` 的内容在提交时被重置（自动保存请求体标题为空）；Ctrl+S 用例在负载下按键派发本身超过 1 秒时间窗。产品侧"水合前输入被清空"另记 [pre-hydration-input-loss](../../backlog/pre-hydration-input-loss.md)。

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) |
| 设计依据 | [US-04-tests TC-US04-09](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md) |

## 唯一测试（红 → 绿）

E2E 并行稳定：`npm run test:e2e` 连续 3 次全绿，且报告中 `editor-preview` 在 `chromium-timing` / `webkit-timing` 项目下、其余用例结束后执行；加压（常规项目 `--repeat-each=3`）无失败

## DoD（完成定义）

### 实现类
- [x] 计时用例打 `@timing` 标签；常规项目 `grepInvert` 排除，新增 `*-timing` 项目只跑该标签，`dependencies` 指向常规项目，`webkit-timing` 再依赖 `chromium-timing`（两者也不并发）
- [x] `waitForHydration(page)`：所有岛无 `ssr` 且 React 根 `isDehydrated === false`；替换全部 `astro-island:not([ssr])` 等待，`login` 填表前调用
- [x] TC-US03-18 用 `page.clock` 暂停计时器后按 Ctrl/⌘+S，断言发出 POST

### 测试类
- [x] 变更点测试：全量 E2E 连续 3 次全绿；加压无失败
- [x] 影响范围回归：E2E 用例总数不变（30）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `playwright.config.ts`：常规项目 `grepInvert: /@timing/`；`chromium-timing` 依赖两个常规项目，`webkit-timing` 依赖 `chromium-timing`。代价：常规项目有失败时计时项目被跳过
- `tests/e2e/support/hydration.ts`：`waitForHydration` 判据为岛无 `ssr` 且 `HostRoot.memoizedState.isDehydrated === false`（依赖 React 内部字段）。探针：WebKit 8 并发下 16 次中 2 次 `ssr` 已移除但仍未提交
- 所有 `goto` / 需交互的 `reload` 之后改为 `waitForHydration`；`login()` 填表前等待
- TC-US03-18：`page.clock.install()` + 水合后 `pauseAt(+1s)`，先断言"未保存"再按快捷键，等待 POST 不设短超时
- 结果：加压（常规项目 `--repeat-each=3`）修复前每轮 1–4 个 WebKit 失败（TC-US06 / TC-US03-18 / TC-US08-05 / TC-US07-16），修复后两轮 168/168；`npm run test:e2e` 连续 3 次 30/30

## 依赖

[build-markdown-preview-pane](build-markdown-preview-pane.md)

## 影响的文件

- `playwright.config.ts`
- `tests/e2e/support/hydration.ts`（新增）、`tests/e2e/support/admin.ts`
- `tests/e2e/*.spec.ts`

## 回滚策略

回退上述测试文件与配置（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度；`test_command` 备注计时项目 |
