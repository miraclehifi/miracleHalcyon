# 存储（Admin Storage）

**路由**: `/admin/storage`
**状态**: draft（已实现：Sprint 7，`src/pages/admin/storage.astro`、`src/components/admin/storage/StoragePage.tsx`）
**关联**: F-006 · US-01、US-02 · [Backlog](../../backlog/media-orphan-cleanup.md)

## 页面用途

看已经没有文章在用的图片和实况视频占了多少存储，并一键清理。页面只显示数字，不加载任何图片或视频。

## 入口与出口

| 从哪来 | 去哪里 |
|--------|--------|
| 后台顶栏"存储"（任何使用 `AdminHeader` 的后台页） | 顶栏"文章" / 站点名 → `/admin` |
| 直接访问 `/admin/storage`（未登录 → `/admin/login?next=/admin/storage`） | "查看博客" → `/`（新标签页）；"登出" → `/admin/login` |

## 布局

```
┌ AdminHeader ─────────────────────────────────────────────────────────┐
│ miracleHalcyon 后台   文章  存储                     查看博客   登出 │
└──────────────────────────────────────────────────────────────────────┘
          ┌ 主体 896px ───────────────────────────────────────┐
          │ 存储                                [↻ 重新检测]   │  ← PageHeader
          │ 检测于 14:32 · 只统计没有文章在用的文件             │
          │                                                    │
          │ ┌ StatCard ─────┐ ┌ StatCard ─────┐ ┌ /Highlight ─┐│
          │ │ 未引用图片    │ │ 未引用实况视频│ │ 预计可释放  ││
          │ │ 12 张         │ │ 3 个          │ │ 25.3 MB     ││
          │ │ 17.6 MB       │ │ 7.7 MB        │ │             ││
          │ └───────────────┘ └───────────────┘ └─────────────┘│
          │ 近 24 小时上传的 2 项不参与清理                     │
          │                                                    │
          │ [🗑 一键清理未引用资源]                              │
          │ 清理后无法恢复。正在使用的文件、24 小时内上传的     │
          │ 文件不会被清理。                                    │
          └────────────────────────────────────────────────────┘
```

| 区域 | 内容 |
|------|------|
| 顶栏 | `AdminHeader`，当前项"存储"（见 [components.md](../components.md) `AdminHeader`） |
| 标题行 | `PageHeader`：衬线大标题"存储"；右侧 `Button/Secondary`"重新检测"（`refresh-cw` 图标） |
| 说明行 | 12px `ink-faint`："检测于 HH:mm · 只统计没有文章在用的文件"（检测时间按浏览器时区；跨天时显示"M月D日 HH:mm"） |
| 统计区 | 三张 `StatCard` 一行等宽排列、间距 16px：①"未引用图片"：主数字"N 张"、副行体积 ②"未引用实况视频"：主数字"N 个"、副行体积 ③ `StatCard/Highlight`"预计可释放"：主数字为体积，无副行。体积格式见 [shared-field-formats](../../engineering/shared-field-formats.md)"文件体积"；数字 `tabular-nums` |
| 保护期提示 | 统计区下方 12px `ink-muted`："近 24 小时上传的 N 项不参与清理"；N = 0 时不显示 |
| 操作区 | `Button/Danger`"一键清理未引用资源"（无图标，与 `ConfirmDialog` 确认按钮同形）；下方 12px `ink-faint` 说明"清理后无法恢复。正在使用的文件、24 小时内上传的文件不会被清理。" |

### StatCard

外框与文章列表卡片同一套（1px 虚线 `line-strong`、圆角 12px、`bg` 底），内边距 20px 24px，高 120px，无悬停效果（不可点）。

| 位置 | 样式 |
|------|------|
| 标签 | 14px `ink-muted` |
| 主数字 | `text-title`（24px）600 `ink`，`tabular-nums` |
| 副行 | 14px `ink-muted`（体积） |
| `/Highlight` | 边框改实线 1px `accent`，底 `accent-soft`，主数字 `accent` |

## 状态

| 状态 | 表现 | 来源 |
|------|------|------|
| 加载中（首次 / 重新检测） | 三张卡片主数字处显示骨架条（高 24，宽 80），统计区 `aria-busy="true"`；"重新检测"与"一键清理"禁用；说明行保留上次检测时间（首次为"检测中…"） | US-01 SC-DETECT-12 |
| 有未引用资源 | 如布局图；"一键清理"可用 | SC-DETECT-01 |
| 无未引用资源 | 三张卡片显示 `0 张` / `0 个` / `0 MB`，`/Highlight` 退回普通 `StatCard` 样式（无副行）；操作区按钮禁用，按钮上方显示 `circle-check` 图标 + "存储状态良好，无未引用文件"（14px `ink-muted`，`role="status"`） | SC-DETECT-10、SC-CLEANUP-05 |
| 检测失败 | 统计区替换为 `Alert/Error`"检测失败，请重试"（`role="alert"`）；"重新检测"可用，"一键清理"禁用；说明行"上次检测失败" | SC-DETECT-13 |
| 清理中 | 确认框确认按钮加载并禁用（`ConfirmDialog` 的 Promise 行为），不可取消、Esc 无效；页面按钮禁用 | SC-CLEANUP-04 |

## 交互

| 操作 | 结果 |
|------|------|
| 打开页面 | 自动检测一次（`GET /api/admin/storage/orphans`） |
| 重新检测 | 再次检测，统计与检测时间更新；检测期间按钮禁用防连点 |
| 一键清理 | 打开 `ConfirmDialog/Danger`（`trash-2`）：标题"清理未引用资源"；说明"将清理 {N 张图片}、{M 个实况视频}，释放 {体积}。清理后无法恢复。"（某项为 0 时省略该项与顿号）；按钮"取消"（`Button/Outline`，默认焦点）/"清理"（`Button/Danger`） |
| 确认清理成功 | 关闭确认框；`Toast/Success`"已清理 X 项，释放 Y"（X = 删除图片数 + 删除视频数，Y 按接口返回 `freedBytes`）；自动重新检测 |
| 确认清理失败 | 关闭确认框；`Toast/Error`"清理未完成，请重试"；自动重新检测（显示剩余） |
| 取消 / Esc | 关闭确认框，焦点回到"一键清理"，不发请求 |

## 响应式

| 断点 | 变化 |
|------|------|
| < 768px | 主体左右内边距 16px；`AdminHeader/Mobile`（"文章""存储"换成图标 `file-text`、`hard-drive`，44×44，当前项图标 `accent`）；三张 `StatCard` 竖向排列、宽 100%、高 96px；"重新检测"只留图标（`IconButton/Ghost` `refresh-cw`，`aria-label="重新检测"`，44×44）；"一键清理"宽 100%；确认框按 `ConfirmDialog` 现有手机形态 |

## 可访问性

- 统计区为 `<section aria-labelledby>`（标题"未引用资源"，视觉隐藏）；每张卡片 `<dl>`：标签为 `<dt>`、数字与体积为 `<dd>`
- 检测完成后统计区以 `aria-live="polite"` 播报"未引用 N 项，可释放 Y"
- 页面不渲染 `<img>`、`<video>`

## 组件清单

| 组件 | 类型 | 说明 |
|------|------|------|
| `AdminHeader` | 已有，改动 | 新增导航"文章""存储"，`current` prop 标当前项 |
| `PageHeader` | 已有 | 标题 + 右侧操作 |
| `StatCard` · `StatCard/Highlight` | **新增** | `label`、`value`、`detail?`、`highlight?` |
| `Button/Secondary` · `Button/Danger` · `IconButton/Ghost` | 已有 | — |
| `ConfirmDialog/Danger` | 已有 | 清理确认 |
| `Toast/Success` · `Toast/Error` | 已有 | 结果提示 |
| `Alert/Error` | 已有 | 检测失败 |
| `StoragePage` | 页面区块（单处使用） | 页面主体，组合以上组件 |

## 设计稿

[admin.pen](../admin.pen) `09 存储 /admin/storage`、`09m 存储（移动 <768px）`、`09b 存储页状态`（无未引用资源、检测失败、清理确认与结果提示）；组件区"业务区块" Row 6 `StatCard` / `StatCard/Highlight`；`AdminHeader` / `AdminHeader/Mobile` 新增导航项（手机端隐藏"后台"字样以容纳 4 个图标），02 / 02m 当前项为"文章"。

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-16 | 初始版本（F-006 design-ui） | miraclehifi |
