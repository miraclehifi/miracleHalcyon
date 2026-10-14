# 组件清单（设计稿 ↔ 前端）

**最后更新**: 2026-10-12
**状态**: draft

> 设计稿组件与前端 React 组件**同名**。来源：[admin.pen](admin.pen) 顶部的"组件区 Components"；颜色、字号、圆角等令牌见 [design-tokens.md](design-tokens.md)。
> 本表是组件命名的唯一来源：新增或改名组件时，先改本表，再同步设计稿和代码。

## 命名规则

| 设计稿名称 | 前端写法 | 说明 |
|-----------|---------|------|
| `Button/Primary` | `<Button variant="primary">` | 斜杠前是组件名（PascalCase，与 React 组件同名），斜杠后是 `variant` 取值（代码里用小写短横线：`GhostDanger` → `"ghost-danger"`） |
| `StatusBadge/Draft` | `<StatusBadge status="draft">` | 斜杠后对应的 prop 不叫 variant 时，在下表"Props"列注明 |
| `PostListItem/Mobile` | `<PostListItem>`（同一组件） | `/Mobile` 表示同一组件在 `< 768px` 下的形态，**不是 prop**，由响应式样式实现 |
| `SegmentedItem/Selected` | `<SegmentedControl.Item selected>` | 子项组件；容器 `SegmentedControl` 在设计稿中是普通 frame |

- 设计稿实例的图层名可以写用途（如 `Seg 草稿`、`Delete`），但它引用的组件必须在本表里
- 没有做成 Pencil 组件、只在一个页面出现的区块，图层名也直接用 React 组件名（见"页面区块"）

## 基础组件

| 设计稿组件 | React 组件 | Props / variant | 使用位置 |
|-----------|-----------|----------------|---------|
| `Button/Primary` · `Secondary` · `Outline` · `Ghost` · `Danger` · `GhostDanger` | `Button` | `variant`；`icon?`（图标名，lucide）；`children`；底层为 `SpecularButton`，参数见"按钮质感参数" | 全部页面。Outline = 弹窗"取消"；GhostDanger = 设置抽屉"删除文章" |
| `IconButton/Ghost` · `Outline` | `IconButton` | `variant`；`icon`；`aria-label`（必填）；`size`：`sm` 28px（桌面）/ `touch` 44px（手机） | 工具栏按钮、关闭、列表行"更多操作"（`⋯`）、顶栏图标、轻提示关闭。已实现：`src/components/ui/IconButton.tsx`（图标 `ink-muted`，悬停 `surface-sunken` 底 + `ink`；Outline 1px `line-strong`；父元素可设 `--icon-button-ink` 改图标色，Toast 设为 `currentColor`） |
| `StatusBadge/Draft` · `Published` · `Modified` | `StatusBadge` | `status`：`draft` / `published` / `modified`（已发布 · 有未发布修改）；配色见 design-tokens"文章状态配色" | 文章列表、写文章页顶栏、04 主按钮变体。已实现：`src/components/ui/StatusBadge.tsx`（含 `badgeStatus(status, hasUnpublishedChanges)`） |
| `TagChip` | `TagChip` | `label`（`onRemove` 时带 × "删除标签 X"）。已实现：`src/components/ui/TagChip.tsx`；设置抽屉的 `TagInput` 在 `src/components/admin/editor/TagInput.tsx` | 首页标签入口、设置抽屉标签输入 |
| `Field` | `Field` | `label`；`hint?`；`error?`；`children`（输入控件） | 登录表单、设置抽屉（slug、日期）、04 校验。已实现：`src/components/ui/Field.tsx`（给唯一子控件补 id / `aria-invalid` / `aria-describedby` 与输入框样式 `FIELD_CONTROL_CLASS`；手机 16px 断点用 `md`（768px），与全站移动端定义一致） |
| `SearchInput` | `SearchInput` | `placeholder`；`value`；`onChange`；手机端字号 16px。已实现：`src/components/ui/SearchInput.tsx`（防抖由使用方处理） | 文章列表 |
| `SegmentedItem/Selected` · `Default` | `SegmentedControl` + `SegmentedControl.Item` | 容器：`value`；`onChange`；`aria-label`（单选组 `radiogroup`，← / → 切换）。Item：`value`；`icon?`；`count?`（`tabular-nums`）；`children`；`selected` 由容器 `value` 推导（对应设计稿 `/Selected`） | 文章列表状态筛选（带数量）、写文章页视图切换（带图标）。已实现：`src/components/ui/SegmentedControl.tsx` |
| `TabItem/Selected` · `Default` | `Tabs` + `Tabs.Item` | Item：`selected`；`children`；`role="tab"` | 写文章页（移动）编辑 / 预览 |
| `SaveIndicator/Saved` · `Saving` · `Unsaved` · `Failed` | `SaveIndicator` | `state`：`saved` / `saving` / `unsaved` / `failed`；`savedAt?` | 写文章页顶栏（桌面、移动）、04 保存状态。已实现：`src/components/ui/SaveIndicator.tsx`（`role="status"`；保存中图标旋转，减弱动效时停止） |
| `Pagination` | `Pagination` | `page`；`pageSize`；`total`；手机端页码可点区域 44px。已实现：`src/components/ui/Pagination.tsx`（另有 `href`、`onNavigate`；页码全部显示、可换行） | 文章列表 |
| `Menu` · `MenuItem/Default` · `/Checked` · `/Disabled` | `Menu` + `Menu.Item` + `Menu.Separator` | Item：`type`：`action` / `checkbox` / `radio`（对应 `menuitem` / `menuitemcheckbox` / `menuitemradio`）；`checked?`；`disabled?`（`aria-disabled`，仍可聚焦，配 `Tooltip` 说明原因）；`children`。容器 `surface` 底、1px `line` 边、`radius`、阴影同悬停提示，内边距 4px；Item 高 32px（触屏 44px），左右内边距 12px，`text-ui`，选中时 ✓ 在右侧（`ink-muted`），悬停 / 键盘高亮底 `surface-sunken`，禁用 `ink-faint`。`/Checked`、`/Disabled` 对应 `checked`、`disabled`，**不是 variant** | 写文章页 `ImageMenu` |
| `Popover` | `Popover` | `anchor`；`side`：`top` / `bottom`；`title`；`children`；非模态 `role="dialog"`，Esc / 点外部关闭，焦点回到触发元素；`surface` 底、1px `line` 边、12px 圆角、阴影同弹窗 | 写文章页"图片写法"说明 |
| `Tooltip` · `Tooltip/Shortcut` | `Tooltip` + `TooltipGroup` | Tooltip：`content`；`shortcut?`（按键数组，如 `['Mod', 'B']`，`Mod` 按平台显示 `⌘` 或 `Ctrl`）；`side`：`top` / `bottom`；`children`（触发按钮，一个元素）。`/Shortcut` 对应传了 `shortcut`，**不是 variant**。`TooltipGroup` 包住一组按钮，组内共用一个提示框。底层为 WarmTooltip，参数见"悬停提示参数"。已实现：`src/components/ui/Tooltip.tsx`（另有 `className` 加在触发包裹层） | 写文章页：`EditorToolbar`、手机顶栏返回 / 设置、设置抽屉关闭 |

### 按钮质感参数

`Button` 内部渲染 React Bits `SpecularButton`（文件 `SpecularButton.tsx`，只供 `Button` 使用，页面不直接引用）。**已实现**：`src/components/ui/Button.tsx`、`src/components/vendor/react-bits/SpecularButton.tsx`（对上游的改动见文件头）；尺寸取设计稿：内边距 8 × 16、高 34、图标 16px、间距 6、`text-ui` 字重 500。`lineColor` / `baseColor` 运行时由令牌解析，随主题切换。尺寸、圆角、焦点环沿用本表与 design-tokens，不用 SpecularButton 自带的 `size` 和焦点样式。图标按钮 `IconButton`、`OverlayButton` 不使用。

6 个变体同一套参数，按主题切换（变体只在设计稿中区分用途与是否带图标，不再区分颜色）：

| 主题 | `tint` | `tintOpacity` | `textColor` | `lineColor` | `baseColor` |
|------|--------|---------------|-------------|-------------|-------------|
| 亮色 | `#18181b` | 1 | `#fafafa` | `#ffffff` | `#3f3f46` |
| 暗色 | `#ffffff` | 0.04 | `#f5f5f5` | `#ffffff` | `#525252` |

对应令牌 `button-fill` / `button-ink` / `specular-line` / `button-base`（见 design-tokens"颜色"）。

**按下态**（开关类按钮，如写文章页"设置"，`aria-pressed="true"`）：底色与文字不变，边缘光整圈常亮（`idleIntensity` 1、`shineSize` 180），去掉投影。不要用改底色表示按下，否则与 `textColor` 冲突。

其余参数：`radius` 8、`thickness` 1.2、`intensity` 1、`idleIntensity` 0.35、`shineSize` 10、`shineFade` 34、`glow` 1、`followMouse`、`proximity` 250、`blur` 0。

### 悬停提示参数

`Tooltip` / `TooltipGroup` 内部渲染 React Bits WarmTooltip / WarmTooltipGroup（TypeScript + Tailwind 版，文件 `WarmTooltip.tsx`，依赖 `motion`，只供 `Tooltip` 使用，页面不直接引用）。视觉规则见 [design-tokens.md](design-tokens.md)"悬停提示"（[Backlog](../backlog/editor-warm-tooltip.md)）。

单独使用的 `Tooltip`（不在 `TooltipGroup` 里）自带一个只有它自己的组，行为与组内第一次悬停相同。

**`TooltipGroup` → WarmTooltipGroup**：

| Prop | 取值 | 说明 |
|------|------|------|
| `delay` | `400` | 冷启动等待 |
| `warmWindow` | `300` | 提示关闭后 300ms 内移到组内其他按钮，直接显示 |
| `travel` | `320` | 提示框从一个按钮滑到下一个按钮的时长 |
| `lean` | `0` | 滑动时不倾斜 |

**`Tooltip` → WarmTooltip**：

| Prop | 取值 | 说明 |
|------|------|------|
| `content` | 与触发按钮的 `aria-label` 相同 | 见 admin-post-editor.md 的名称表 |
| `shortcut` | 由 `shortcut` 数组生成：Mac 为 `⌘B`、`⇧⌘8`；其他系统为 `Ctrl B`、`Ctrl Shift 8`；触屏（`pointer: coarse`）不传 | 平台判断优先 `navigator.userAgentData.platform`，没有时用 `navigator.platform` |
| `side` | 桌面工具栏、顶栏、抽屉 `"bottom"`；手机底部工具栏 `"top"` | 组件只在左右方向防出界，上下方向要选对朝向 |
| `surfaceColor` / `inkColor` | `ink` / `bg` 令牌对应的 CSS 变量 | 组件把两者写进 CSS 变量再用，可以传 `var(--…)`，随主题切换 |
| `size` | `"md"`（字号按源码改动改为 12px） | — |
| `radius` / `gap` / `arrow` | `8` / `8` / `true` | `radius` 令牌 |
| `popDuration` / `popScale` / `popBlur` | `160` / `0.94` / `4` | 默认值 |
| `showFuse` | `false` | — |
| `longPress` | `500` | 默认值；长按后的那次点击被吞掉，不执行按钮操作 |
| `disabled` | 不传 | 置灰按钮也显示提示 |

触发按钮另加 `aria-keyshortcuts`（如 `Meta+B` / `Control+B`），由 `Tooltip` 根据 `shortcut` 写入。

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为；已实现：`src/components/vendor/react-bits/WarmTooltip.tsx`，上游路径为 `src/ts-tailwind/Micro/WarmTooltip`，另补 SSR 无 `window` 的保护）：

| 改动 | 原因 |
|------|------|
| `SIZES.md` 字号 12.5 改为 12，`sm` / `lg` 删除 | 对齐 `text-caption`，不使用表外字号 |
| 提示层加 `font-family: var(--font-body)` | 提示挂在 `document.body` 下，不一定继承写文章页的字体 |
| 键帽外框在 `shortcut` 为数组时逐键渲染 `kbd`（`⌘` 与字母之间不留空） | 原组件只收一个 ReactNode |
| 去掉 `'use client'` | Astro 项目不需要 |

## 反馈组件

| 设计稿组件 | React 组件 | Props / variant | 使用位置 |
|-----------|-----------|----------------|---------|
| `Alert/Error` | `Alert` | `tone`：`error`；`children` | 登录页"凭据错误"。已实现：`src/components/ui/Alert.tsx` |
| `Toast/Error` · `Success` · `Warning` · `Undo` | `Toast` | `tone`：`error`（常驻、可关闭）/ `warning`（常驻、可关闭，`warn-soft` 底 + `warn` 图标与字，`role="status"`）/ `success`（4 秒自动消失）；`action?`（`{ label, onClick }`，传了即 `/Undo` 形态：文字后一个文字按钮"撤销"，6 秒消失）；规则见 design-tokens"轻提示" | 04 校验与错误提示；实况照片降级提示（warning）；文章列表删除后的"已删除《标题》· 撤销"。已实现（不含 `action`，Sprint 2）：`src/components/ui/Toast.tsx`（`ToastProvider` + `useToast().show()`，页面底部居中堆叠） |
| `ConfirmDialog/Danger` · `Default` | `ConfirmDialog` | `tone`：`danger`（删除）/ `default`（撤回）；`icon`；`title`；`description`；`confirmLabel` | 04 删除确认、撤回确认。已实现：`src/components/ui/ConfirmDialog.tsx`（`open`、`onConfirm`、`onCancel`） |
| `EmptyState` | `EmptyState` | `icon`；`title`；`description`；`action?`。已实现：`src/components/ui/EmptyState.tsx`（文案在 `role="status"` 区域） | 文章列表空状态 |
| `RestoreBanner` | `RestoreBanner` | `savedAt`；`onRestore`；`onDiscard` | 写文章页顶栏下方 |

## 业务区块

| 设计稿组件 | React 组件 | Props | 使用位置 |
|-----------|-----------|-------|---------|
| `AdminHeader` · `AdminHeader/Mobile` | `AdminHeader` | —（站点名、"查看博客"、"登出"）；手机端两个操作只留图标。已实现：`src/components/admin/AdminHeader.tsx`（"登出"Sprint 2 接线前禁用）；同目录 `PageHeader.tsx` | 文章列表 |
| `PostListItem` · `PostListItem/Mobile` · `/Open` · `/Mobile/Open` · `/Mobile/Commit` | `PostListItem` | `post`（`title`、`status`、`updatedAt`）；`onDelete`；`active`（由 `PostList` 传入，为真时显示悬停态，见"列表动效参数"）；`open` / `onOpenChange`（抽屉开合，由 `PostList` 控制，同一时间只开一行）；外框与 `PostCard` 一致（悬停同 `PostCard/Hover`），内容只有标题、状态徽标 + 更新时间和右侧 `IconButton/Ghost`（`⋯` 更多操作）。卡片本身是 SwipeRow 的拖动面，左滑露出抽屉"编辑 / 删除"，参数见"行滑动参数"。`/Open`（抽屉展开）、`/Mobile/Commit`（全滑、删除块铺满）是运行时状态，**不是 prop**；规则见 [admin-post-list.md](pages/admin-post-list.md)"行操作"。已实现（Sprint 1 静态卡片）：`src/components/admin/PostListItem.tsx`——外框、`active` 双层错位、标题链接、徽标 + 相对时间；SwipeRow 抽屉与 `⋯` 在 Sprint 2 接入 | 文章列表 |
| `ImageMenu` · `ImageMenu/Gallery` · `ImageMenu/Mobile` | `ImageMenu` | `kind`：`image` / `gallery`；`wide?`（单图）；`mode?`：`grid` / `accordion`，`count`（组图）；`onToggleWide` / `onModeChange` / `onSplit`。由触发按钮 `OverlayButton`（`size` 32）+ `Menu` 组成；`/Gallery` 对应 `kind="gallery"`，`/Mobile` 为触屏形态（菜单项 44px），**都不是 variant**；规则见 [admin-post-editor.md](pages/admin-post-editor.md)"图片菜单" | 写文章页 `MarkdownPreview` |
| `EditorToolbar` · `EditorToolbar/Mobile` | `EditorToolbar` | `onCommand`；桌面 8 个格式按钮 + 插入图片（9 个都是 `IconButton/Ghost`，插入图片前加竖分隔线）；手机 7 个、固定在键盘上方；全部按钮包在一个 `TooltipGroup` 里，每个按钮一个 `Tooltip`（桌面 `side="bottom"`，手机 `side="top"`），名称与快捷键见 [admin-post-editor.md](pages/admin-post-editor.md)"工具栏与悬停提示" | 写文章页 |

## 读者端区块

| 设计稿组件 | React 组件 | Props | 使用位置 |
|-----------|-----------|-------|---------|
| `SiteNav` · `SiteNav/Mobile` | `SiteNav` | `current?`（`posts` / `media`，首页不传）；桌面：文字项 文章 / 书影音（当前项 `accent` + 600）+ 图标 摄影（外链）/ GitHub / RSS / 主题切换（`IconButton/Ghost`，图标 18px）；手机：全部为 44px 图标按钮 文章 / 书影音 / 摄影 / 主题切换，GitHub / RSS 不显示，当前项图标 `accent`；文章详情、标签页传 `posts`（见 [site-map.md](site-map.md)"全局导航"） | `SiteHeader` 内 |
| `SiteHeader` · `SiteHeader/Mobile` | `SiteHeader` | `current?`（透传给 `SiteNav`）；左侧站点名（回首页），右侧 `SiteNav` / `SiteNav/Mobile` | 读者端全部页面 |
| `PostPager` | `PostPager` | `prev?`、`next?`（`title`、`slug`）；缺一侧时该侧留空 | 文章详情页文末 |
| `PostCard` · `PostCard/Hover` · `PostCard/Mobile` | `PostCard` | `post`（`title`、`excerpt`、`publishedAt`、`tags`、`cover?`）；整卡可点进入详情；`excerpt` 由正文渲染后取纯文本前约 120 字，最多 3 行；没有 `cover` 时不显示右侧图片；`/Hover` 是悬停与键盘聚焦态（上层左上移 4px、下层右下移 4px，边框不换色，保持 `line-strong`），在列表中由 `active` 控制（见"列表动效参数"）；手机端标题与 72px 封面同行，摘要在下 | 文章列表页 `/posts` |
| `SiteFooter` | `SiteFooter` | —（站点名、签名一句话、版权、RSS / GitHub 链接） | 读者端全部页面 |

### 列表动效参数

`PostList`（后台）、`HomePosts`（读者端 `/posts`）内部渲染 React Bits AnimatedList（TypeScript + Tailwind 版，文件 `AnimatedList.tsx`，只供这两个区块使用，页面不直接引用）。**只借动效和交互**：每行用 `renderItem` 渲染 `PostListItem` / `PostCard`，卡片外观不变；AnimatedList 自带的磨砂底板、行块、选中框都不用（[Backlog](../backlog/animated-list.md)）。

"选中行"就是 `PostCard/Hover` 状态：`renderItem(post, index, selected)` 把 `selected` 传给卡片的 `active`，卡片不再自己响应 `:hover` / `:focus-within`，保证同一时间只有一行处于该状态。

| Prop | 取值 | 说明 |
|------|------|------|
| `items` | 当前页文章（带 `id`） | — |
| `renderItem` | `(post, i, selected) => <PostListItem post={post} active={selected} />`（读者端换成 `PostCard`） | — |
| `onItemSelect` | 不传 | 跳转由卡片内的链接完成，避免重复跳转 |
| `initialSelectedIndex` | `-1` | — |
| `selectOnHover` / `enableArrowNavigation` / `loop` | `true` / `true` / `false` | 方向键规则见下方源码改动 |
| `animation` / `animateOnce` / `stagger` | `"pop"` / `true` / `0.05` | — |
| `frame` / `showGradients` / `displayScrollbar` | `false` / `false` / `false` | 随页面滚动，没有内部滚动 |
| `maxHeight` / `width` | `"none"` / `"100%"` | 宽度由外层 896px 主体决定 |
| `gap` / `radius` | `20` / `12` | 与卡片间距、圆角一致 |
| `key`（外层） | 筛选条件 + 页码 | 筛选、搜索、翻页后重新挂载，整页重新入场 |

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为）：

| 改动 | 原因 |
|------|------|
| 新增 `bare`：行不加底色、阴影、内描边和 `filter`，不渲染选中框（indicator / ring），也不注入主题变量 | 外观交给卡片 |
| 去掉 `listbox` / `option` / `aria-activedescendant` / `aria-selected`，容器改为 `role="list"`、行 `role="listitem"`，容器不再 `tabIndex=0` | 行内有链接和按钮，选项里不能放可交互元素；Tab 顺序保持"标题 → 更多操作"（抽屉打开时再到"编辑 → 删除"） |
| 方向键只在焦点位于列表内时响应（去掉"鼠标悬停 + 焦点在 body"分支）；↑ / ↓ / Home / End 选中后把焦点移到该行第一个链接 | 鼠标停在列表上时方向键要能滚动页面 |
| 行内元素获得焦点（`focusin`）时选中该行；指针离开列表且焦点不在列表内时选中清为 `-1` | 键盘聚焦与悬停共用 `PostCard/Hover`，离开后卡片复原 |
| `prefers-reduced-motion` 时只渐显透明度（原 `fade` 仍有 4px 位移），不错开 | 对齐 design-tokens"焦点与交互" |
| 删除 `DEFAULT_ITEMS`，`items` 改为必填，去掉 `@hugeicons/*` 依赖 | 项目图标统一用 lucide |
| 行的 `exit` 动画不用；删除的行由 SwipeRow 自己折叠后再从 `items` 移除，撤销时按原下标插回并播放单行入场 | 避免折叠与退场叠加两次 |

### 行滑动参数

`PostListItem` 内部渲染 React Bits SwipeRow（TypeScript + Tailwind 版，文件 `SwipeRow.tsx`，只供 `PostListItem` 使用，页面不直接引用）：卡片即拖动面，向左拖露出操作抽屉（[Backlog](../backlog/swipe-row-actions.md)）。桌面、手机同一套参数，只有 `height` 随断点变化。

| Prop | 取值 | 说明 |
|------|------|------|
| `children` | 卡片内容：标题链接、状态徽标 + 更新时间 | 卡片外框（虚线边框、圆角）画在拖动面上，见下方源码改动 |
| `actions` | `[{ id: 'delete', label: '删除', icon: <Trash2 /> }, { id: 'edit', label: '编辑', icon: <SquarePen />, href: '/admin/posts/:id' }]` | 第一项在最外侧，是全滑动作；图标 lucide 20px |
| `onCommit` | `delete` → 交给 `PostList` 移除该行并显示撤销提示（见 admin-post-list"删除与撤销"） | 行折叠完成后才调用 |
| `open` / `onOpenChange` | 由 `PostList` 控制 | 打开一行时收起其他行；筛选、翻页、滚动列表时全部收起 |
| `direction` | `"left"` | 抽屉在右侧 |
| `actionWidth` | `80` | 抽屉宽 160px；手机也不缩，保证可点区域 ≥ 44px |
| `height` | 卡片实际高度：桌面 `96`、手机 `85` | 标题单行，超出省略；高度变了要同步 |
| `radius` | `12` | 与卡片圆角一致 |
| `actionColor` / 删除文字 | `danger` / `danger-ink` | — |
| `drawerColor` / 编辑底色与文字 | `surface-sunken` / `ink` | — |
| `rowColor` / `textColor` | `bg` / `ink` | 与 `PostCard` 底色一致 |
| `commitAt` / `fullSwipe` | `0.6` / `true` | 拖过 60% 行宽删除块跃出，松手即删 |
| `snapBounce` / `resistance` / `collapseMs` | `0.2` / `0.55` / `200` | 默认值 |
| `closeOnAction` / `haptic` | `true` / `true` | — |
| `label` | `《{标题}》` | 行的读屏名称 |

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为）：

| 改动 | 原因 |
|------|------|
| 颜色 prop 接受 CSS 变量；去掉 `onColor()` 按 hex 推算文字色，改为显式 `actionInk` / 每个 action 的 `ink` | 令牌是 CSS 变量，且要随亮暗主题切换 |
| 拖动面加卡片外框：1px 虚线 `line-strong`、圆角 12px、内边距 20px 28px（手机 16px 20px）；`active` 时渲染 `PostCard/Hover` 的双层错位 | 外观仍是纸质卡片 |
| 关闭且不在拖动时，裁剪容器 `overflow: visible`、抽屉 `visibility: hidden`；开始拖动或抽屉打开时才裁剪，此时 `active` 视为假（双层错位收回） | 否则双层错位的 4px 被裁掉 |
| 根节点的 `overflow: hidden` 只在 `phase=collapsing` 时生效 | 同上 |
| 拖动过（`moved`）的这次 pointerup 之后吞掉一次 `click`；抽屉打开时点卡片只收起，不跳转；标题链接设 `draggable="false"` | 拖完不能误进写文章页，也不出现浏览器拖链接的残影 |
| action 支持 `href`：渲染为 `<a>`（"编辑"），其余仍是 `<button>` | 编辑是导航，用链接语义 |
| 内置切换按钮改为 `IconButton/Ghost`（`ellipsis` 图标，`aria-label="《{标题}》的操作"`）：桌面卡片 `active` 或自身聚焦时显示，手机只在聚焦时显示；去掉 `e.detail !== 0` 判断，鼠标点击也能开合 | 桌面鼠标用户的入口；原组件只认键盘 |
| 键盘打开抽屉后焦点移到"编辑"；Esc 收起并把焦点还给 `⋯`；抽屉内 Tab 顺序"编辑 → 删除" | 原组件打开后焦点不动 |
| 播报文案中文化：`Release to 删除` → "松手删除"，`n actions revealed` → "已展开 2 个操作" | 界面语言 |
| 去掉 `@hugeicons/*`，默认图标改 lucide `Trash2` | 项目图标统一用 lucide |

## 文章图片

> 先行稿（[Backlog](../backlog/article-image-display.md)），规则写在 admin.pen 组件区「文章图片」每个组件右侧的说明里，F-002 design-ui 时整理进 `pages/post-detail.md`。图片上的浮层亮暗主题一致，颜色用 `overlay` / `scrim` 令牌（见 [design-tokens.md](design-tokens.md)"图片浮层"）。Markdown 写法（动态照片、宽图、组图）待 F-001 design-arch 定。

| 设计稿组件 | React 组件 | Props / variant | 使用位置 |
|-----------|-----------|----------------|---------|
| `ArticleImage` · `/Loading` · `/Live` · `/LivePlaying` · `/Wide` | `ArticleImage` | `src`；`alt`；`caption?`（Markdown title）；`width`、`height`（原图尺寸，用来预留宽高比）；`placeholder?`（模糊缩略图）；`live?`（`{ videoSrc }`）；`wide?`。图片外层渲染 React Bits RefineFrame，负责加载中、马赛克渐显和失败重试（见下方"图片加载参数"）。`/Loading`、`/LivePlaying` 是运行时状态，**不是 prop**；`/Live` 对应传了 `live`，`/Wide` 对应 `wide` | 文章详情正文（05 / 05m）、后台 `MarkdownPreview` |
| `LiveBadge` · `LiveBadge/Playing` | `LiveBadge` | `playing`；图标 + `LIVE`，`overlay` 底 + 背景模糊，播放中换成 `overlay-ink` 底 | `ArticleImage`、`ImageGallery` 单元格、`Lightbox` |
| `ImageGallery/Grid` · `/Grid/Hover` · `/Accordion` · `/Accordion/Mobile` | `ImageGallery` | `variant`：`grid` / `accordion`；`images`（每项同 `ArticleImage` 的数据，另带 `accent` 主色）；`caption?`。grid 按张数自动定列数（2–9 张），内部渲染 React Bits ChromaGrid（见下方"组图网格参数"）；accordion 适合 3–7 张，内部渲染 React Bits AccordionGallery（见下方"组图手风琴参数"）。`/Grid/Hover` 是鼠标在组图内的运行时状态，`/Accordion/Mobile` 为 ≤ 520px 形态（竖向条带），都不是 prop | 文章详情正文 |
| `OverlayButton` | `OverlayButton` | `icon`；`aria-label`（必填）；`size`：48（灯箱桌面）/ 44（灯箱手机、`ImageMenu` 手机）/ 32（`ImageMenu` 桌面，图标 16px） | `Lightbox` 关闭按钮（左右切换用 DepthCarousel 自带箭头）；`ImageMenu` 触发按钮 |
| `Lightbox` · `Lightbox/Mobile` | `Lightbox` | `images`（文中全部图片，按出现顺序）；`index`；`onClose`；中间内容区内部渲染 React Bits DepthCarousel（见下方"灯箱层叠参数"），`Lightbox` 自己负责 scrim 底、计数、关闭、图注、下滑关闭；`/Mobile` 为 `< 768px` 形态（拖动切换、下滑关闭，不显示左右箭头） | 文章详情页（点击任意图片打开） |

### 图片加载参数

`ArticleImage` 和 `ImageGallery variant="grid"` 的每个单元格，都在 `<img>` 外包一层 React Bits RefineFrame（TypeScript + Tailwind 版，文件 `RefineFrame.tsx`，只供这两个组件使用，页面不直接引用）。视觉规则见 [design-tokens.md](design-tokens.md)"图片加载"（[Backlog](../backlog/image-refine-loading.md)）。

| Prop | 取值 | 说明 |
|------|------|------|
| `status` | `<img>` 未加载 `generating`；`load` 后 `complete`；`error` 后 `error` | 不用 `queued`、`refining`。`load` 时直接切到 `complete`，马赛克从最粗一层一路变到清晰 |
| `children` | 只放静态图 `<img>`（`loading="lazy"`、`decoding="async"`，带 `alt`） | 动态照片的 `<video>` 和 `LiveBadge` 是 `ArticleImage` 里与 RefineFrame 同级的浮层，`complete` 后才显示；组件按 `img` 标签取图，不能放进 `children` |
| `aspectRatio` | `ArticleImage`：`` `${width} / ${height}` ``；组图网格：`"1 / 1"` | 预留空间，加载前后不跳动 |
| `width` | 不传（源码改为不传时撑满父级） | 正文宽度、宽图宽度、网格单元格宽度都由父级决定 |
| `radius` | `8`（`radius` 令牌） | 组图网格单元格 = 卡片圆角 16 − 内边距 8 |
| `background` / `color` | `surface-sunken` / `ink` 令牌对应的 CSS 变量 | 两者只用在 CSS 里（画布上的扫光线是写死的白色），可以传变量，随主题切换 |
| `stageDuration` | `120` | 马赛克 9 层，从最粗到清晰约 1 秒 |
| `sweep` / `showStatus` | `true` / `true` | — |
| `hideAfter` | `1200` | 默认值 |
| `labels` | `{ generating: '加载中', complete: '已加载', error: '加载失败' }` | — |
| `retryLabel` / `onRetry` | `'重试'` / 状态回到 `generating`，给 `src` 加 `?retry=n` 重新请求 | 加载失败时点击图片不打开 `Lightbox` |

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为）：

| 改动 | 原因 |
|------|------|
| 图标改用 lucide：`LoaderCircle`、`Check`、`TriangleAlert`、`RotateCw` | 项目只用 lucide，不引入 `@hugeicons/*` |
| `width` 改为可选，不传时宽度 100% | 原组件固定像素宽，正文图需要跟随版心 |
| 去掉外层 `role="img"` / `aria-label`，图片层不再 `aria-hidden`（画布、扫光仍 `aria-hidden`） | 原实现把 `<img alt>` 对读屏隐藏，只读出"加载中" |
| `role="status"` 文本只在 `error` 时输出 | 长文每张图都播报"已加载"太吵 |
| 重试按钮去掉 `outline-none`，用全站焦点环；触屏下高 44px | 对齐 design-tokens"焦点与交互" |
| `<style>` 里的 4 个 `@keyframes` 移到全局样式 | 原实现每个实例插一份 |
| 去掉 `'use client'` | Astro 项目不需要 |

### 组图网格参数

`ImageGallery variant="grid"` 内部渲染 React Bits ChromaGrid（TypeScript + Tailwind 版，文件 `ChromaGrid.tsx`，无额外依赖，只供 `ImageGallery` 使用，页面不直接引用）。视觉规则见 [design-tokens.md](design-tokens.md)"组图网格"。

| Prop | 取值 | 说明 |
|------|------|------|
| `items` | 由 `images` 映射：`image` = `src`，`alt` = `alt`，`accent` = 图片主色；**不传 `url`、`title`、`subtitle`** | 点击行为由 `ImageGallery` 接管（见下）；组图共用一行图注 |
| `columns` | 按张数：2 张 2；3 张 3；4 张 2；5–9 张 3（手机 2–4 张 2，5 张以上 3） | — |
| `minCardWidth` | `100` | 保证手机 350px 下 3 列不被折成 1 列 |
| `gap` / `cardRadius` | `8` / `16` | 卡片内边距 8，图片圆角 = 16 − 8 = `radius` |
| `aspectRatio` | `"1 / 1"` | 正方形裁切 |
| `reveal` | `"spotlight"` | — |
| `radius` / `softness` / `damping` / `fadeOut` | `260` / `0.6` / `0.45` / `0.6` | 默认值 |
| `grayscale` / `dim` / `glow` / `borderGlow` | `1` / `0.12` / `0.5` / `1` | 默认值（悬停时才生效，见源码改动） |
| `showInfo` / `frame` | `false` / `false` | 不显示标题，不加外层毛玻璃框 |
| `theme` | 跟随站点主题（`light` / `dark`） | — |

**需要在源码上补的改动**（implement 阶段）：

| 改动 | 原因 |
|------|------|
| 底图滤镜改为 `grayscale(calc(var(--chroma-gray) * var(--chroma-power)))`、`brightness(calc(1 - var(--chroma-dim) * var(--chroma-power)))` | 平时彩色，只有鼠标在组图内时才灰度 + 聚光（原组件平时也是灰的） |
| `pointermove` / `pointerdown` 只响应 `pointerType === "mouse"` | 触屏轻触会先闪一下灰再打开灯箱 |
| 新增 `onItemClick(index)`，卡片渲染为 `button`（可聚焦、Enter 打开） | 打开 `Lightbox`；原组件无 `url` 时卡片不可点、不可聚焦 |
| 新增 `renderOverlay(item, index)`，渲染在图片区内 | 动态照片显示 `LiveBadge`、悬停播放 |
| 新增 `renderMedia(item, index)`，替换卡片内的 `<img>` | `ImageGallery` 传入 RefineFrame 包裹的图片（见"图片加载参数"） |
| `prefers-reduced-motion` 订阅变化 | 原实现只在挂载时读一次 |

### 组图手风琴参数

`ImageGallery variant="accordion"` 内部渲染 React Bits AccordionGallery（TypeScript + Tailwind 版，文件 `AccordionGallery.tsx`，依赖 `gsap`，只供 `ImageGallery` 使用，页面不直接引用）。视觉规则见 [design-tokens.md](design-tokens.md)"组图手风琴"。

| Prop | 取值 | 说明 |
|------|------|------|
| `items` | 由 `images` 映射：`image` = `src`，`label` = 该图图注（无则不显示），`alt` = `alt`；**不传 `link`** | 点击行为由 `ImageGallery` 接管（见下） |
| `defaultIndex` | `Math.floor(n / 2)` | 默认展开中间一张 |
| `trigger` | `"hover"` | 聚焦、轻触始终可展开 |
| `expandRatio` | `0.52` | — |
| `height` | 桌面 `420`；≤ 520px `640` | 组件只收一个数值，由 `ImageGallery` 按断点传入 |
| `gap` / `radius` | `8` / `8` | 对齐 `radius` 令牌 |
| `accentColor` / `textColor` | `#FFFFFF`（`overlay-ink`） | 组件要求传颜色字符串，不能传 CSS 变量名 |
| `overlayColor` | `#0D0D0D`（`scrim` 底色） | — |
| `grayscale` / `tilt` / `parallax` | `true` / `8` / `0.5` | 默认值 |
| `duration` / `ease` / `stagger` | `0.6` / `"power3.out"` / `0.06` | 默认值 |
| `showLabels` | 有任一图注时 `true` | — |

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为）：

| 改动 | 原因 |
|------|------|
| 新增 `onActiveClick(index)`：点击已展开的面板时调用 | 打开 `Lightbox`（原组件只支持跳转 `link`） |
| 新增 `renderOverlay(item, index, active)`：在面板内渲染额外内容 | 展开项显示 `LiveBadge`，并挂动态照片播放（悬停 / 长按） |
| `prefersReduced` 改为订阅 `matchMedia` 变化 | 原实现只在渲染时读一次 |
| 外层 `aria-label` 改为由 `ImageGallery` 传入（如"组图：京都三日"） | 原文案写死为英文 |

### 灯箱层叠参数

`Lightbox` 内部渲染 React Bits DepthCarousel（TypeScript + Tailwind 版，文件 `DepthCarousel.tsx`，依赖 `gsap`，只供 `Lightbox` 使用，页面不直接引用）。视觉规则见 [design-tokens.md](design-tokens.md)"灯箱层叠"。

| Prop | 桌面 | ≤ 767px | 说明 |
|------|------|---------|------|
| `items` | 由 `images` 映射：`image` = `src`，`alt` = `alt` | 同左 | — |
| `cardWidth` / `cardHeight` | `540` / `720`（高 = 视口高 − 180，最高 760；宽按 3:4 兜底） | `屏宽 − 60` / `宽 × 4 / 3`（390 屏为 330 / 440） | 由 `Lightbox` 按视口计算后传入；每张实际宽度按图片比例覆盖（见下方源码改动） |
| `edgePadding`（新增） | `120` | `16` | 组件缩放时预留的左右余量，原写死 120；手机用 16，卡片不再被缩小 |
| `radius` | `8` | `8` | 对齐 `radius` 令牌 |
| `tint` | `#0D0D0D`（`scrim` 底色） | 同左 | — |
| `depth` / `spread` | `220` / `90` | `160` / `12` | 手机收窄，后面的卡片只露出边缘，把宽度留给当前图 |
| `tilt` / `tiltDirection` / `perspective` | `22` / `"right"` / `1400` | 同左 | 默认值 |
| `visibleCards` / `falloff` / `blur` | `4` / `0.2` / `6` | 同左 | 默认值 |
| `duration` / `ease` | `700` / `"power3.out"` | 同左 | 默认值 |
| `autoplay` / `loop` | `false` / `false` | 同左 | 看图不自动翻页；不循环，计数 `当前 / 总数` 才有意义 |
| `showControls` / `showIndicators` | `true` / `false` | `false` / `false` | 顶栏已有计数，不用圆点 |
| `onChange` | 更新 `Lightbox` 的计数和图注 | 同左 | — |

**需要在源码上补的改动**（implement 阶段）：

| 改动 | 原因 |
|------|------|
| 新增 `initialIndex`：首次渲染直接定位到该张、不播放动画 | 从文中点哪张就打开哪张（原组件固定从第 0 张开始） |
| `items` 每项可带 `width` / `height`，卡片宽 = `cardHeight` × 宽高比 | 灯箱要看完整原图，原组件所有卡片同尺寸 + `object-cover` 会裁切 |
| 新增 `renderOverlay(item, index, focused)` | 最前的卡片显示 `LiveBadge`、挂动态照片播放 |
| `aria-label`、`aria-roledescription` 等文案改为中文并可传入 | 原文案写死为英文 |
| `prefers-reduced-motion` 在挂载时就读取，并订阅变化 | 原实现只在 autoplay 的 effect 里读取一次 |
| 缩放余量 `120` 改为 `edgePadding` prop（默认 120） | 原余量写死，手机上当前图只有屏宽的 60% |

## 页面区块（单处使用，未做 Pencil 组件）

| 图层名 | React 组件 | 所在画板 |
|-------|-----------|---------|
| `TagPostsNav` | `TagPostsNav` | 05 文章详情（左栏：同标签文章，当前篇高亮） |
| `ArticleHeader` | `ArticleHeader` | 05 / 05m（标题、日期、字数与阅读时长、标签） |
| `ArticleContent` | `ArticleContent` | 05 / 05m（Markdown 渲染：段首缩进、首字下沉、引用署名） |
| `HomeIntro` | `HomeIntro` | 06 / 06m（头像、问候语、一句话简介、GitHub / RSS / 关于我） |
| `HomeTags` | `HomeTags` | 06 / 06m（标签入口，`TagChip` 带文章数） |
| `HomePosts` | `HomePosts` | 06 / 06m（标题 + 篇数、`PostCard` 列表、`Pagination`；列表底层 AnimatedList，见"列表动效参数"） |
| `TableOfContents` | `TableOfContents` | 05（右栏：阅读进度 + 目录，当前章节高亮） |
| `LoginForm` | `LoginForm` | 01 / 01m |
| `PageHeader` | `PageHeader` | 02 / 02m |
| `PostList` | `PostList` | 02 / 02m（底层 AnimatedList，见"列表动效参数"） |
| `EditorTopBar` | `EditorTopBar` | 03 / 03m |
| `MarkdownEditor` | `MarkdownEditor` | 03 / 03m |
| `MarkdownPreview` | `MarkdownPreview` | 03 |
| `ImageSyntaxHelp` | `ImageSyntaxHelp` | 03b（`Popover` 的内容：写法示例 + iPhone 实况照片导出方法） |
| `PostSettingsDrawer` | `PostSettingsDrawer` | 03 |

预览区里的代码块、任务列表、上传中图片是 Markdown 渲染结果（代码块由 Expressive Code 输出），不作为独立组件。

## 已知差异

| 项 | 现状 | 建议 |
|----|------|------|
| `IconButton` 圆角 | 编辑器工具栏、轻提示关闭按钮的实例覆盖为 4px，其余为 `radius`（8px） | 实现时统一为 `radius` |
| `ConfirmDialog` 遮罩 | 设计稿为 `#2A251F` 35%（未用令牌） | 实现用 `scrim` 令牌 37%（`bg-scrim/37`），亮暗主题通用 |
| 轻提示关闭按钮尺寸 | 设计稿为 24×24、图标 14px | 实现用 `IconButton` `sm`（28×28、图标 16px），满足桌面可点区域 ≥ 28px（design-tokens"焦点与交互"） |
| 06 首页稿 | 网站地图已改为参考 pseudoyu（首页自我介绍、文章列表在 `/posts`），06 稿仍是"简介 + 标签 + 文章列表"；顶栏已换成新 `SiteNav` | F-002 design-ui 时拆为首页（自我介绍）与 `/posts`（`HomeTags` / `HomePosts` 随之改名） |
| `PostCard` 边框 | 参考站是 1px 虚线，Pencil 不支持虚线描边，设计稿画成实线 | 实现时用 `border-dashed`，颜色 `line-strong` |
| 视图切换选中项字重 | 套用 `SegmentedItem/Selected` 后从 400 变为 500，与文章列表筛选一致 | 保持统一 |

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-10 | 初始版本：admin.pen 分为组件区 / 页面区；7 个组件校正命名，新增 29 个组件，页面改为引用实例 | miraclehifi |
| 2026-10-10 | 组件区版式整理：按"区 → 组件 → 变体"分组，变体下标 variant 名；组件与命名不变 | miraclehifi |
| 2026-10-10 | 新增 `MenuItem`（`DropdownMenu` 子项）；`PostListItem/Mobile` 改为长按弹出菜单，去掉左滑 | miraclehifi |
| 2026-10-10 | `PostListItem` 新增编辑按钮 | miraclehifi |
| 2026-10-10 | `PostListItem` 加回状态徽标 | miraclehifi |
| 2026-10-10 | `PostListItem` 精简为标题 + 更新时间 + 删除按钮 | miraclehifi |
| 2026-10-10 | `PostListItem` 改为与 `PostCard` 相同的卡片样式（摘要、封面、状态徽标并入元信息行） | miraclehifi |
| 2026-10-10 | `SiteHeader` 去掉"文章"导航项，默认高亮"首页" | miraclehifi |
| 2026-10-10 | 新增 `PostCard`（含 `/Hover`、`/Mobile`）；页面区块新增 06 首页的 3 个区块 | miraclehifi |
| 2026-10-10 | 新增"读者端区块"：`SiteHeader`（含 `/Mobile`）、`PostPager`、`SiteFooter`；页面区块新增 05 文章详情的 4 个区块 | miraclehifi |
| 2026-10-12 | `PostCard/Hover` 上层边框不再换 `accent`，保持 `line-strong`；02 / 02m 悬停与长按行同步（[Backlog](../backlog/list-border-no-accent.md)） | miraclehifi |
| 2026-10-12 | `ArticleImage` 与组图网格单元格的加载改用 React Bits RefineFrame（马赛克渐显、状态标签、失败重试），新增"图片加载参数"；ChromaGrid 源码改动补 `renderMedia` | miraclehifi |
| 2026-10-12 | 文章列表（`PostList`、`HomePosts`）底层改用 React Bits AnimatedList，只借入场动效与键盘选择，新增"列表动效参数"；`PostListItem`、`PostCard` 新增 `active` | miraclehifi |
| 2026-10-12 | `SiteHeader` 导航按新网站地图改为 文章 / 书影音 + 摄影 / GitHub / RSS 图标；`PostCard` 使用位置改为 `/posts`；设计稿差异记入"已知差异" | miraclehifi |
| 2026-10-12 | `ImageGallery/Grid` 内部渲染 React Bits ChromaGrid（卡片样式 + 悬停聚光），新增 `/Grid/Hover` 状态；`images` 每项新增 `accent` 主色 | miraclehifi |
| 2026-10-12 | `Lightbox` 中间内容区改为内部渲染 React Bits DepthCarousel；`OverlayButton` 在灯箱内只用于关闭 | miraclehifi |
| 2026-10-12 | `ImageGallery/Carousel` 改为 `/Accordion`（含 `/Mobile`），内部渲染 React Bits AccordionGallery；`OverlayButton` 不再用于组图 | miraclehifi |
| 2026-10-12 | 新增"文章图片"：`ArticleImage`（5 个状态）、`LiveBadge`、`ImageGallery`、`OverlayButton`、`Lightbox`（含 `/Mobile`）；05 / 05m 正文插入动态照片示例 | miraclehifi |
| 2026-10-12 | 新增 `SiteNav`（含 `/Mobile`），从 `SiteHeader` 拆出导航；`SiteHeader/Mobile` 去掉菜单按钮，改为内嵌 `SiteNav/Mobile` 图标导航 | miraclehifi |
| 2026-10-12 | `Button` 底层改用 SpecularButton（边缘流光），新增"按钮质感参数"；图标按钮不变 | miraclehifi |
| 2026-10-12 | `Button` 配色改为 React Bits 预设（亮色深色实心、暗色白色玻璃），6 个变体同色 | miraclehifi |
| 2026-10-12 | 新增 `Tooltip`（含 `/Shortcut`）与 `TooltipGroup`，底层为 React Bits WarmTooltip，新增"悬停提示参数"；`EditorToolbar` 按钮改用提示组，"插入图片"由文字按钮改为图标按钮（[Backlog](../backlog/editor-warm-tooltip.md)） | miraclehifi |
| 2026-10-12 | `PostListItem` 底层改用 React Bits SwipeRow（左滑抽屉：编辑 / 删除，全滑删除），新增"行滑动参数"；删除 `MenuItem` / `DropdownMenu`；`Toast` 新增 `/Undo`（`action`）（[Backlog](../backlog/swipe-row-actions.md)） | miraclehifi |
| 2026-10-13 | 新增 `Menu`、`Popover`、`ImageMenu`、`ImageSyntaxHelp`；`Toast` 加 `warning`；`OverlayButton` 加 32 尺寸（F-001 US-11、US-12） | miraclehifi |
