# 页面水合完成前的输入被清空

| 字段 | 值 |
|------|-----|
| 状态 | idea |
| 类型 | Bug |
| 优先级 | 待 Triage |
| 来源 | Sprint 1 DoD 核对（stabilize-preview-timing-e2e 排查 E2E 偶发失败时发现） |
| 日期 | 2026-10-14 |
| 创建者 | miraclehifi |

## 描述

Astro 在调用 React `hydrateRoot` 后立即移除岛的 `ssr` 属性，但 React 19 的水合是并发的，提交可能晚于此。水合提交前在受控输入框（写文章页标题 / 正文、登录表单、列表搜索框）里输入的内容，会在提交时被重置为组件状态（空），作者看到字消失、需要重新输入。

证据（2026-10-14，WebKit 并行负载）：E2E trace 中 `fill` 标题后 DOM 值即变回空，随后自动保存请求体为 `{"title":"","slug":"",…,"body":"第一段正文"}`；探针 16 次中 2 次在 `ssr` 移除时 `HostRoot.memoizedState.isDehydrated === true`。

影响：慢设备 / 弱网下打开页面立即输入（粘贴、输入法、浏览器自动填充更易触发）。字是可见地消失，不会静默保存错误内容。

## 待 Triage 的问题

- 是否值得修：发生窗口通常 < 100ms，仅慢设备明显
- 可选方向：水合前禁用输入框（SSR 输出 `readonly`，水合后移除）；或水合提交后把 DOM 中已有的值同步回状态（需在提交前读取）

## 影响分析

- 测试侧已规避：E2E 改为等待 React 根真正完成水合（`tests/e2e/support/hydration.ts`），见 [stabilize-preview-timing-e2e](../tasks/sprint-1/stabilize-preview-timing-e2e.md)
