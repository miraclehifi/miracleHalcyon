# 组件清单（设计稿 ↔ 前端）

**最后更新**: 2026-10-22
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
| `IconButton/Ghost` · `Outline` · `/Ghost/Checked` | `IconButton` | `variant`；`icon`；`aria-label`（必填）；`size`：`sm` 28px（桌面）/ `touch` 44px（手机）；`checked?`（传了即开关：`role="switch"` + `aria-checked`，为真时 `accent-soft` 底 + `accent` 图标，对应设计稿 `/Ghost/Checked`，**不是 variant**） | 工具栏按钮（含"实况照片"开关）、关闭、列表行"更多操作"（`⋯`）、顶栏图标、轻提示关闭。已实现：`src/components/ui/IconButton.tsx`（图标 `ink-muted`，悬停 `surface-sunken` 底 + `ink`；Outline 1px `line-strong`；父元素可设 `--icon-button-ink` 改图标色，Toast 设为 `currentColor`；`checked` 开关态 Sprint 6 已实现） |
| `StatusBadge/Draft` · `Published` · `Modified` | `StatusBadge` | `status`：`draft` / `published` / `modified`（已发布 · 有未发布修改）；配色见 design-tokens"文章状态配色" | 文章列表、写文章页顶栏、04 主按钮变体。已实现：`src/components/ui/StatusBadge.tsx`（含 `badgeStatus(status, hasUnpublishedChanges)`） |
| `TagChip` | `TagChip` | `label`（`onRemove` 时带 × "删除标签 X"；`href` 时为链接，读者端标签入口，F-002）。已实现：`src/components/ui/TagChip.tsx`；设置抽屉的 `TagInput` 在 `src/components/admin/editor/TagInput.tsx` | 首页标签入口、设置抽屉标签输入 |
| `Field` | `Field` | `label`；`hint?`；`error?`；`children`（输入控件） | 登录表单、设置抽屉（slug、日期）、04 校验。已实现：`src/components/ui/Field.tsx`（给唯一子控件补 id / `aria-invalid` / `aria-describedby` 与输入框样式 `FIELD_CONTROL_CLASS`；手机 16px 断点用 `md`（768px），与全站移动端定义一致）。2026-10-22 起标签 `ink`、间距 8，输入框加轻投影与 `accent` 悬停光晕（见 design-tokens"输入框质感"，待 Sprint 9 任务 5 实现） |
| `SearchInput` | `SearchInput` | `placeholder`；`value`；`onChange`；手机端字号 16px。已实现：`src/components/ui/SearchInput.tsx`（防抖由使用方处理） | 文章列表 |
| `SegmentedItem/Selected` · `Default` | `SegmentedControl` + `SegmentedControl.Item` | 容器：`value`；`onChange`；`aria-label`（单选组 `radiogroup`，← / → 切换）。Item：`value`；`icon?`；`count?`（`tabular-nums`）；`children`；`selected` 由容器 `value` 推导（对应设计稿 `/Selected`） | 文章列表状态筛选（带数量）、写文章页视图切换（带图标）。已实现：`src/components/ui/SegmentedControl.tsx` |
| `Checkbox/Checked` · `Default` · `Disabled` | `Checkbox` | `checked`；`onChange`；`label`；`hint?`（标签后 12px `ink-faint` 小字，如上次同步时间）；`disabled?`。原生 `<input type="checkbox">` + `<label>`；方框 16×16、圆角 4：选中为 `accent` 底 + 白色 `check` 图标，未选中为 `surface` 底 + 1px `input-border`，禁用整体 50% 不透明；点标签也能切换；手机可点区域高 44px | `DoubanImportDialog` 导入类别（F-005） |
| `TabItem/Selected` · `Default` | `Tabs` + `Tabs.Item` | 容器：`value`；`onChange`；`aria-label`（`tablist`，← / → 切换并选中）。Item：`value`；`controls`（面板 id）；`children`；`selected` 由容器 `value` 推导 | 写文章页（移动）编辑 / 预览。已实现：`src/components/ui/Tabs.tsx` |
| `SaveIndicator/Saved` · `Saving` · `Unsaved` · `Failed` | `SaveIndicator` | `state`：`saved` / `saving` / `unsaved` / `failed`；`savedAt?` | 写文章页顶栏（桌面、移动）、04 保存状态。已实现：`src/components/ui/SaveIndicator.tsx`（`role="status"`；保存中图标旋转，减弱动效时停止） |
| `Pagination` | `Pagination` | `page`；`pageSize`；`total`；手机端页码可点区域 44px。已实现：`src/components/ui/Pagination.tsx`（另有 `href`、`onNavigate`；页码全部显示、可换行） | 文章列表 |
| `Menu` · `MenuItem/Default` · `/Checked` · `/Disabled` | `Menu` + `Menu.Item` + `Menu.Separator` | Item：`type`：`action` / `checkbox` / `radio`（对应 `menuitem` / `menuitemcheckbox` / `menuitemradio`）；`checked?`；`disabled?`（`aria-disabled`，仍可聚焦，配 `Tooltip` 说明原因）；`children`。容器 `surface` 底、1px `line` 边、`radius`、阴影同悬停提示，内边距 4px；Item 高 32px（触屏 44px），左右内边距 12px，`text-ui`，选中时 ✓ 在右侧（`ink-muted`），悬停 / 键盘高亮底 `surface-sunken`，禁用 `ink-faint`。`/Checked`、`/Disabled` 对应 `checked`、`disabled`，**不是 variant** | 写文章页 `ImageMenu`；写文章页顶栏"更多"菜单（`IconButton/Ghost` `ellipsis` 触发，项：登出；04 "写文章页更多菜单"）。已实现：`src/components/ui/Menu.tsx`（action / checkbox / radio 项、禁用、分隔线；checkbox / radio 执行后菜单保持打开；`initialFocus` 指定打开时聚焦的项，菜单因改写重新挂载时停在原项） |
| `Popover` | `Popover` | `anchor`；`side`：`top` / `bottom`；`title`；`children`；非模态 `role="dialog"`，Esc / 点外部关闭，焦点回到触发元素；`surface` 底、1px `line` 边、12px 圆角、阴影同弹窗。已实现：`src/components/ui/Popover.tsx`（由使用方定位，`side` 决定上 / 下、左对齐；打开时焦点到标题；宽 360、最高 60vh 内部滚动） | 写文章页"图片写法"说明 |
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
| `Toast/Error` · `Success` · `Warning` · `Undo` | `Toast` | `tone`：`error`（常驻、可关闭）/ `warning`（常驻、可关闭，`warn-soft` 底 + `warn` 图标与字，`role="status"`）/ `success`（4 秒自动消失）；`action?`（`{ label, onClick }`，传了即 `/Undo` 形态：文字后一个文字按钮"撤销"，6 秒消失）；规则见 design-tokens"轻提示" | 04 校验与错误提示；实况照片降级提示（warning）；文章列表删除后的"已删除《标题》· 撤销"。已实现：`src/components/ui/Toast.tsx`（`ToastProvider` + `useToast().show()`，页面底部居中堆叠）；`/Undo`（Sprint 2）：`surface` 底 + `line-strong` 边框、`trash-2` 图标、`accent` 文字按钮，不自动消失，由使用方按撤销期关闭；另有 `onHold(held)`（悬停、光标移动或焦点在提示内时为真，用于暂停计时），提示聚焦时 Ctrl/⌘+Z 等同点 action |
| `ConfirmDialog/Danger` · `Default` | `ConfirmDialog` | `returnFocus?`（关闭后聚焦的元素；不传时用打开时的焦点元素——WebKit 点击按钮不聚焦，列表行操作需显式传入触发按钮）；`tone`：`danger`（删除）/ `default`（撤回）；`icon`；`title`；`description`；`confirmLabel` | 04 删除确认、撤回确认。已实现：`src/components/ui/ConfirmDialog.tsx`（`open`、`onConfirm`、`onCancel`；`role="alertdialog"`；`onConfirm` 返回 Promise 时确认按钮加载并禁用、不可取消） |
| `EmptyState` | `EmptyState` | `icon`；`title`；`description`；`action?`。已实现：`src/components/ui/EmptyState.tsx`（文案在 `role="status"` 区域） | 文章列表空状态 |
| `RestoreBanner` | `RestoreBanner` | `savedAt`；`onRestore`；`onDiscard` | 写文章页顶栏下方。已实现：`src/components/ui/RestoreBanner.tsx`（`section` 以标题命名；时间按浏览器时区"M月D日 HH:mm"） |

## 业务区块

| 设计稿组件 | React 组件 | Props | 使用位置 |
|-----------|-----------|-------|---------|
| `AdminHeader` · `AdminHeader/Mobile` | `AdminHeader` | `current?`：`posts` / `media` / `storage`（当前项 `accent` + 600，`aria-current="page"`）；左侧站点名（回 `/admin`）+ 导航"文章"（`/admin`）"书影音"（`/admin/media`，F-005）"存储"（`/admin/storage`，F-006）；右侧"查看博客""登出"；手机端导航与两个操作都只留图标（`file-text`、`library`、`hard-drive`、外链、登出，44×44、间距 0，带 `aria-label`；站点名 18px 以容纳 5 个图标，F-005）。已实现：`src/components/admin/AdminHeader.tsx`（"登出"已接线，Sprint 2；导航与 `current`，F-006 Sprint 7）；同目录 `PageHeader.tsx` | 文章列表、存储页、书影音条目页 |
| `StatCard` · `StatCard/Highlight` | `StatCard` | `label`；`value`（主数字文本，如"12 张""25.3 MB"）；`detail?`（副行，如体积）；`highlight?`（对应 `/Highlight`：实线 `accent` 边 + `accent-soft` 底 + 主数字 `accent`，**不是 variant**）；`loading?`（主数字处骨架条）。外框同 `PostListItem`（虚线 `line-strong`、圆角 12），不可点无悬停；渲染为 `<dl>`；规则见 [admin-storage.md](pages/admin-storage.md)"StatCard"。已实现：`src/components/ui/StatCard.tsx`（主数字 `text-title` 24px） | 存储页统计区（F-006） |
| `MediaEntryRow` · `MediaEntryRow/Mobile` | `MediaEntryRow`（F-005，已实现：`src/components/admin/media/MediaEntryRow.tsx`、列表 `MediaEntryList.tsx`） | `entry`（`id`、`title`、`creator`、`rating`、`status`、`markedOn`、`cover`、`hidden`、`type`）；`onHide`；`onDelete`。桌面：封面 32×48 · 标题（15px，进行中徽标 `accent-soft`；隐藏时标题 `ink-muted` + "已隐藏"徽标 `surface-sunken` 底 `eye-off`）· 作者（宽 160）· 评分（宽 88，`StarRating/Small` 只读，无评分留空）· 状态动词（宽 36）· 标记日期（`font-mono` 12px，宽 80）· 三个 `IconButton/Ghost`（编辑 `pencil` / 隐藏 `eye-off` ↔ `eye` / 删除 `trash-2`）；行底 1px `line`。手机：封面 40×60、右侧标题行 + "作者 · 星级 · 状态 日期"、右侧 `IconButton` ⋯（44）打开 `Menu`；规则见 [admin-media.md](pages/admin-media.md) | 书影音条目列表 |
| `RecognizeBox` | `RecognizeBox`（F-005） | `excludeId?`（编辑时排除自身做去重）；`onRecognized(fields, filled, missing)`；`onDuplicate(entry)`。标签"豆瓣分享内容" + 多行输入框（圆角 12、`input-border` 描边，质感同 `Field`（见 design-tokens"输入框质感"），框内右下清空 ✕、`Button/Secondary`"识别" `scan-text`）+ 可识别类型小卡片 6 个（书 / 漫画 / 电影 / 剧集 / 游戏 / 桌游，手机隐藏）+ 结果卡（预览行：缩略图 32×48 + 标题 + 分类 · 作者 · 年份，失败时无；结果行：已识别 `circle-check` `ok` / 未识别 `circle-alert` `warn` / 失败 `circle-x` `danger` / 重复 `copy` `warn` + "去编辑 →"）；识别中按钮 `loader-circle` + "识别中…"；状态与文案见 [admin-media.md](pages/admin-media.md)"RecognizeBox" | 书影音录入表单 |
| `DoubanImportDialog` | `DoubanImportDialog`（F-005） | `open`；`onClose`；`onFinished(changed)`（列表刷新）。模态 `role="dialog"`、宽 440（手机左右 16px 全宽）、样式同 `ConfirmDialog`（`surface`、圆角 12、阴影）。依次：头部 `download` + "从豆瓣导入" + 关闭 `IconButton/Ghost` ✕；说明文字；`Field`"豆瓣用户 ID"（说明"豆瓣个人主页 douban.com/people/ID/ 中的 ID"，格式错时 `danger` 提示）；进度区（"影视 · 看过" + `font-mono`"120 / 614"或增量"已同步 3 条"、6px 进度条 `accent` 于 `surface-sunken`，`aria-live="polite"`）；汇总区（`circle-check` `ok` + "导入完成：…"或增量"同步完成：新增 X、更新 Y、失败 Z、封面失败 W"，停止时"已停止：…"；失败列表 `surface-sunken` 底、12px `ink-muted`）；`Alert/Error`；"导入类别"6 个 `Checkbox`（电影 / 剧集、书 / 漫画、游戏 / 桌游 两列三行，默认全选，每项后 12px `ink-faint` 显示该类别上次同步 `MM-dd HH:mm` 或"未同步"，全部取消时 `danger`"至少选择一个类别"）；操作区 `Button/Outline`"关闭" + `Button/Outline`"全量导入" + `Button/Primary`"同步新标记"（无同步记录时只有"关闭" + `Button/Primary`"全量导入"；进行中只剩"停止"；完成后主按钮"再次同步"）。状态见 [admin-media.md](pages/admin-media.md)"从豆瓣导入"；设计稿组件区业务区块 Row 8、页面 11i | 书影音列表页 |
| `StarRating` · `StarRating/Small` | `StarRating`（F-005） | `value`（1–5 / `null`）；`onChange?`；`size?`：`md`（默认）/ `sm`（对应设计稿 `/Small`，**不是 variant**）；`readOnly?`。5 颗表情星，累计点亮前 N 颗：`rating-star` 实心底 + `rating-face` 表情（每颗保留自己的表情），其余 `input-border` 底 + `line` 表情。`md`：36×34、间距 16，手机同尺寸，右侧 "N / 5"（`font-mono` 12px，空值"未评分"），`role="radiogroup"`，方向键改值，再点当前星取消评分（无"清除"按钮），切换动效见"评分动效参数"。`sm` + `readOnly`：16×15、间距 2（总宽 88），无文字、无动画，`role="img"` `aria-label="评分 N / 5"`；有评分时 5 颗都渲染（未点亮的为灰色占位），**空值不渲染**（调用方保留列宽）；静态 HTML 即可（读者页不水合） | `md`：书影音录入表单；`sm`：读者端 `MediaRow`、`MediaCard` |
| `PostListItem` · `PostListItem/Mobile` · `/Open` · `/Mobile/Open` · `/Mobile/Commit` | `PostListItem` | `post`（`title`、`status`、`updatedAt`）；`onDelete`；`active`（由 `PostList` 传入，为真时显示悬停态，见"列表动效参数"）；`open` / `onOpenChange`（抽屉开合，由 `PostList` 控制，同一时间只开一行）；外框与 `PostCard` 一致（悬停同 `PostCard/Hover`），内容只有标题、状态徽标 + 更新时间和右侧 `IconButton/Ghost`（`⋯` 更多操作）。卡片本身是 SwipeRow 的拖动面，左滑露出抽屉"编辑 / 删除"，参数见"行滑动参数"。`/Open`（抽屉展开）、`/Mobile/Commit`（全滑、删除块铺满）是运行时状态，**不是 prop**；规则见 [admin-post-list.md](pages/admin-post-list.md)"行操作"。已实现：`src/components/admin/PostListItem.tsx`——外框、`active` 双层错位、标题链接、徽标 + 相对时间（Sprint 1）；SwipeRow 抽屉、`⋯`、全滑删除、删除后撤销（Sprint 2；`onDelete(post, index)` 带删除前位置，撤销时插回） | 文章列表 |
| `ImageMenu` · `ImageMenu/Gallery` · `ImageMenu/Mobile` | `ImageMenu` | `kind`：`image` / `gallery`；`wide?`（单图）；`live?`（单图 URL 片段含 `live`）、`hasLiveVideo?`（`true` 时显示"实况"勾选项）、`onToggleLive`（单图）；`mode?`：`grid` / `accordion`，`count`（组图）；`onToggleWide` / `onModeChange` / `onSplit`。由触发按钮 `OverlayButton`（`size` 32）+ `Menu` 组成；`/Gallery` 对应 `kind="gallery"`，`/Mobile` 为触屏形态（菜单项 44px），**都不是 variant**；规则见 [admin-post-editor.md](pages/admin-post-editor.md)"图片菜单"。已实现：`src/components/admin/editor/ImageMenu.tsx`（开合由 `MarkdownPreview` 按图片 / 组图首张的源码起点 + 地址记录，改写后重新挂载仍打开并停在原项；改写经 `src/lib/editor/image-marks.ts` 双重定位；挂在 `ArticleImage` / `ImageGallery` 的 `actions` 插槽，即右上角内侧 8px；`/Mobile`：< 768px 时按钮 44、菜单项 44，点按图片 / 组图直接展开，按压超过 300ms 不算点按）；"实况"项（Sprint 6）：`hasLiveVideo` 为检查函数，菜单打开时调用，检查中与结果为 false 时不显示 | 写文章页 `MarkdownPreview` |
| `EditorToolbar` · `EditorToolbar/Mobile` | `EditorToolbar` | `onCommand`；桌面 8 个格式按钮 + 插入图片（9 个都是 `IconButton/Ghost`，插入图片前加竖分隔线）；手机 7 个、固定在键盘上方；全部按钮包在一个 `TooltipGroup` 里，每个按钮一个 `Tooltip`（桌面 `side="bottom"`，手机 `side="top"`），名称与快捷键见 [admin-post-editor.md](pages/admin-post-editor.md)"工具栏与悬停提示"；末尾"实况照片"开关（`IconButton` `checked`，`live` / `onLiveChange`，Sprint 6 已实现） | 写文章页 |

| `UploadCard` · `/ProcessingLive` · `/Error` · `/Interrupted` | `UploadCard` | `state`：`waiting` / `compressing` / `processing-live` / `fetching` / `uploading` / `error` / `interrupted`（`fetching`：Afilmory 照片获取信息中，文案"正在获取照片信息…"，US-13）；`fileName`；`thumbUrl?`（`blob:` URL）；`progress`（0–100）；`error?`（失败原因文案）；`onRetry?`；`onRemove`；`onStillOnly?`（有值且 `state="processing-live"` 时显示"仅转为静态图"）。设计稿 `UploadCard` 为上传中，`/ProcessingLive`、`/Error`、`/Interrupted` 对应同名 `state`，`waiting` / `compressing` / `fetching` 与上传中同形态只换文案（`fetching` 没有缩略图，与缩略图生成失败时相同）；**都不是 variant**。规则见 [admin-post-editor.md](pages/admin-post-editor.md)"上传进度卡片"。已实现（Sprint 6）：`src/components/admin/editor/UploadCard.tsx`（`interrupted` 为单独的 120px 卡片，只有"移除"；`MarkdownPreview` 按占位序号挂载，同槽位跨渲染复用宿主） | 写文章页 `MarkdownPreview`（源码上传占位的位置） |

### 评分动效参数

`StarRating` 参考 CodePen Stars rating animation（aaroniker，源码 [references/code/stars-rating-animation](../../references/code/stars-rating-animation/)，jQuery + SCSS，实现时改写为 React + CSS，不引入 jQuery）。星形路径、表情坐标取原作 `viewBox 0 0 36 34`。

| 项 | 规则 |
|----|------|
| 表情 | 1 星眼睛 + 下撇嘴（难过）、2 星只有眼睛、3 星一字嘴、4 星微笑、5 星眯眼 "^ ^" + 张嘴笑 |
| 切换 | 点新星：一颗高亮星从旧位置滑到新位置（`transform` 0.3s `cubic-bezier(0, 0, .265, 1.1)`，延迟 0.24s），滑动中横向拉伸 1.32 倍并有拖影（`rating-star` 36%），起止两端果冻式倾斜回弹（0.3s + 0.4s）；旧星、新星的眼睛朝滑动方向瞟 3px；途经的星随高光到达逐颗点亮（加分）或熄灭（减分），各 0.2s；全程 0.8s，期间点击忽略 |
| 选中后 | 当前星（第 N 颗）眼睛每 3s 眨一次（1–4 星）；4 星放大到 1.25 倍弹一下（0.4s）、5 星转一圈后压扁回弹（0.72s），二者同时迸出 5 个小光点（0.32s） |
| 按下 | 未选中的星按下缩到 0.9 倍（0.2s） |
| 首次选择 / 取消 | 原作没有空值：从未评分到有分时高光不滑动，新星直接点亮并播"选中后"动画；再点当前星（或键盘在当前星上按空格）取消评分，全灰、无动画，焦点留在该星 |
| 只读（`sm`） | 读者端展示，不播任何动画（含眨眼）；表情随尺寸等比缩小，描边宽 0.6 |
| 键盘 | 方向键改值时同样播放切换动画；焦点环画在当前星（无值时第一颗）上 |
| 降级 | `prefers-reduced-motion`：无滑动、拉伸、弹跳、眨眼，直接换色 |
| 颜色 | 原作黄 `#FFED76` 在白底不可辨，亮色改 `#FACC15`；未选中星原作比底色更暗（暗色主题），亮色改为 `input-border` 中灰以满足 3:1。表情对比度 `rating-face` 在 `rating-star` 上 ≥ 11:1 |
| 设计稿 | 只画静止态：组件区 `StarRating`、`StarRating/Small`（4 星）；11b 列出空值与 1–5 星；09 / 09m 读者端使用 `/Small` |

## 读者端区块

| 设计稿组件 | React 组件 | Props | 使用位置 |
|-----------|-----------|-------|---------|
| `SiteNav` · `SiteNav/Mobile` | `SiteNav` | `current?`（`posts` / `media`，首页、404 不传）；摄影 / GitHub 地址来自 `site.ts`，为空的项不渲染；桌面：文字项 文章 / 书影音（当前项 `accent` + 600）+ 图标 摄影（外链）/ GitHub / RSS / 主题切换（`IconButton/Ghost`，图标 18px）；手机：全部为 44px 图标按钮 文章 / 书影音 / 摄影 / 主题切换，GitHub / RSS 不显示，当前项图标 `accent`；文章详情、标签页传 `posts`（见 [site-map.md](site-map.md)"全局导航"） | `SiteHeader` 内 |
| `SiteHeader` · `SiteHeader/Mobile` | `SiteHeader` | `current?`（透传给 `SiteNav`）；左侧站点名（回首页），右侧 `SiteNav` / `SiteNav/Mobile` | 读者端全部页面 |
| `PostPager` | `PostPager`（已实现：`src/components/reader/PostPager.astro`） | `prev?`、`next?`（`title`、`slug`）；缺一侧时该侧留空，两侧都没有时不渲染；手机两项上下排列 | 文章详情页文末 |
| `PostCard` · `PostCard/Hover` · `PostCard/Mobile` | `PostCard`（已实现：`src/components/reader/PostCard.tsx`、列表 `PostCardList.tsx`，Sprint 4） | `post`（`title`、`excerpt`、`publishedAt`、`tags`、`cover?`）；整卡可点进入详情；`excerpt`：有 `summary` 用 `summary`，否则由正文渲染后取纯文本前约 120 字，最多 3 行，为空时不渲染；没有 `cover` 时不显示右侧图片；`/Hover` 是悬停与键盘聚焦态（上层左上移 4px、下层右下移 4px，边框不换色，保持 `line-strong`），在列表中由 `active` 控制（见"列表动效参数"）；手机端标题与 72px 封面同行，摘要在下 | 文章列表页 `/posts` |
| `SiteFooter` | `SiteFooter` | —（站点名、签名一句话、版权、RSS / GitHub 链接）。已实现：`src/components/reader/SiteFooter.astro`（与 `SiteHeader`、`SiteNav`、`BackLink`、`NotFound` 同为 Astro 组件，不水合） | 读者端全部页面 |
| （SiteNav 内的主题切换按钮） | `ThemeToggle`（已实现：`src/components/reader/ThemeToggle.astro`，原生脚本，不加载 React） | —；`IconButton/Ghost`，亮 / 暗两态翻转 + 圆形扩散动画（View Transitions），图标固定为半填充圆（自绘 SVG），`aria-label="主题：…"`；规则见 [reader-shell.md](pages/reader-shell.md)"主题切换" | `SiteNav`、`SiteNav/Mobile` |
| `BackLink` | `BackLink` | `href`；文字 `> cd ..`，`font-mono` 14px `ink-muted`，上下内边距 12（可点高度 ≥ 44） | 读者端子页主体末尾（05、05m、07、07m、09、09m；首页不用） |
| `MediaTypeTab/Selected` · `Default` | `MediaTypeTabs`（F-005 先行稿；已实现：`src/components/reader/MediaTypeTabs.tsx`，后台已接入、读者页随任务 8；React 岛，内部渲染 React Bits GooeyNav，见"分类导航参数"） | `value`（当前分类：`book` / `comic` / `movie` / `series` / `game` / `boardgame`）；`hrefFor(type)`（读者端 `/media`、`/media/{type}`；后台 `/admin/media?type=`）。每项是 `<a href>`，当前项 `aria-current="page"`，外层 `<nav aria-label="书影音分类">`；文字 书 / 漫画 / 电影 / 剧集 / 游戏 / 桌游，`font-body` 14px 500，内边距 6 13，胶囊全圆角；`/Selected` 为反色胶囊（底 `ink`、字 `bg`，参考 pseudoyu），`/Default` 为 `ink-muted`、无底，悬停字变 `ink` 并有浅色胶囊底。切换分类时旧胶囊碎成水滴飞向新项再整页跳转（[Backlog](../backlog/gooey-media-tabs.md)）；空间不够时换行，不横向滚动 | 书影音 `/media`、后台书影音条目页 |
| ~~`MediaRow` · `MediaRow/Mobile`~~ **已废弃（2026-10-23，[media-wall-all-types](../backlog/media-wall-all-types.md)：桌游改为海报墙，代码删除；设计稿在存档区）** | `MediaRow`（F-005 先行稿；已实现：`src/components/reader/MediaRow.astro`，Sprint 9 任务 8） | `item`（`title`、`creator`、`rating?` 1–5、`markedAt`、`status`、`cover`、`doubanUrl?`）；有 `doubanUrl` 时整行链接到豆瓣（新标签页），没有时不是链接。桌面一行：封面 40×60（圆角 4，`object-fit: cover`，封面为站内 R2 地址，加载失败时显示 `surface-sunken` 底 + 图标）· 标题（16px `ink`，正在进行的条目后接 `accent-soft` 底 `accent` 字的"在读 / 在看 / 在玩"徽标）· 作者 / 导演 / 开发商（14px `ink-muted`，宽 200）· 评分（`StarRating/Small` 只读，无评分不渲染）· 标记年月（`font-mono` 12px `ink-faint`）；行间 1px `line` 分隔。手机：封面 44×66，右侧标题一行、下方"作者 · 评分 · 年月"一行 | 书影音 `/media/boardgame` |
| ~~`MediaCard` · `MediaCard/Mobile`~~ **已废弃（2026-10-23，书、漫画改为海报墙，代码删除；设计稿在存档区）** | `MediaCard`（F-005 先行稿；已实现：`src/components/reader/MediaCard.astro`，Sprint 9 任务 8；参考 [book-store-ui](../../references/code/book-store-ui/src) 的 `.book-card`） | `item`（同 `MediaRow`，另加 `comment?` 我的短评）。卡片 `bg` 底、1px `line` 描边、圆角 4，不加卡片投影；封面 128×192（手机 96×144），圆角 2，向上探出卡片顶边 32px，投影 `0 2px 8px` 黑 18%，悬停放大 1.04 倍（0.3s ease，减弱动效时不放大）；封面右侧：标题（16px 600 `ink`，单行省略）· 作者（13px `ink-faint`）· 评分（`StarRating/Small` 只读，无评分不渲染）· 短评（13px `ink-muted`，行高 1.6，最多 4 行，没有短评时不渲染）；底部分隔线下一行：左侧状态与年月（"读过 · 2026-08"，`yyyy-MM`，进行中的条目用"在读"徽标代替"读过"），右侧"豆瓣 ↗"（12px `ink-faint`，新标签页）；有 `doubanUrl` 时整卡可点去豆瓣页，没有时不是链接、不显示"豆瓣 ↗"、悬停不放大封面；封面为站内 R2 地址。桌面两列、列距 32、行距 48；手机单列 | 书影音 `/media`（书、漫画） |
| `MediaPoster/Front` · `MediaPoster/Hover` · `MediaPoster/Back` | `MediaPoster`（F-005，底层 React Bits FlipCard，见"海报墙参数"；已实现：`src/components/reader/MediaPoster.tsx`，Sprint 9 任务 10；游戏模式任务 14、`YearBadge` 任务 15） | `item`（`title`、`rating?`、`markedOn`、`status`、`cover?`、`comment?`、`doubanUrl?`）；`flipped`、`onFlipChange`（受控，由 `MediaPosterWall` 管理）；`width` / `height`（所在砖块尺寸：书、漫画、电影、剧集固定 2:3，桌游 1:1，`object-fit: cover`；游戏按封面原始比例，高 = 列宽 ÷ 封面宽高比，封面不裁切，无封面按 3:4）。`/Front`：封面铺满（`object-fit: cover`，圆角 4），不显示状态徽标；无封面 / 加载失败：`surface-sunken` 底，居中 `image-off` 图标 + 下方片名（13px `ink-muted`，最多 2 行），`role="img"` `aria-label="图片不可用"`。`/Hover`（指针悬停或键盘聚焦，仅精确指针设备）：**游戏条目不浮出片名**，改为左上角（距左 10、距上 10）淡入 `PlatformBadge`、右下角（距右 10、距底 10）淡入 `YearBadge`（发售年份，无年份不渲染），不加底部渐变（徽标自带深色底）；其他分类悬停不浮出片名（2026-10-23 去掉[poster-no-hover-title](../../backlog/poster-no-hover-title.md)），只有 FlipCard 的倾斜与反光。`/Back`：底色 `flip-surface`、片名色 `flip-ink`（同 FlipCard 示例的 `background` / `color`）；有封面时底层铺同一张封面（水平镜像、灰度、不透明度 30%，`aria-hidden`）+ `flip-surface` 渐变遮罩（顶 60% → 35% 处 0% → 底 90%），无封面为纯色底（[poster-back-filtered-cover](../backlog/poster-back-filtered-cover.md)）；内边距 16（手机 12），自上而下：片名（15px 600，最多 2 行）· 评分（`StarRating/Small` 只读，无评分不渲染）· 短评（13px `ink-muted`，行高 1.6，占满剩余高度后省略，无短评不渲染）· 底部分隔线下一行：左"看过 · 2026-10-14"（`font-mono` 12px `ink-faint`；手机只显示日期；进行中为"在看"徽标），右侧留给"豆瓣 ↗"。**不显示导演**；游戏背面不显示平台与开发商（2026-10-23 去掉背面平台，[media-time-basis](../backlog/media-time-basis.md)）。点击 / Enter / 空格翻面（Y 轴），悬停倾斜 + 跟随指针的反光；"豆瓣 ↗"（12px `ink-faint`，新标签页）是 FlipCard 的兄弟节点，覆盖在背面右下角，只在翻开时可点、可聚焦；无 `doubanUrl` 不渲染 | `MediaPosterWall` 内 |
| `MediaTimeHeading` | `MediaTimeHeading`（F-005；已实现，任务 10） | `label`（`在看` / `本月` / `上个月` / `本年` / `去年` / 四位年份）、`meta`（"10 月 · 3 部"，规则见 [reader-media.md](pages/reader-media.md)"按时间分段"）。`bg` 底，内边距上 14 下 12，`label` 16px 600 `ink` + 间距 10 + `meta`（`font-mono` 12px `ink-faint`），底边 1px `line`；`position: sticky; top: 0`，下缘挂一条 GradualBlur（见"海报墙参数"；只在吸顶时显示，未吸顶时它会盖住本段第一排海报顶部）；`label` 渲染为 `<h2>`，`meta` 为同行 `<span>`（不在标题内） | `MediaPosterWall`（按时间分段时） |
| `PlatformBadge` | `PlatformBadge`（F-005；已实现：`src/components/reader/PlatformBadge.tsx`，Sprint 9 任务 14） | `platform`。高 22 胶囊，内边距 0 9 0 7，间距 5，`#171A21` 85% 底 + 背景模糊 8，0.5px 白 18% 描边；左侧 12px 平台标志（Simple Icons 官方路径，内联 SVG，`#E6EDF3`）+ 文字（Inter 600 10.5px、字距 0.2，`#E6EDF3`）：`ps5` PlayStation 标志 +"PS5"，`ps4` PlayStation 标志 +"PS4"，`switch` Switch 标志 +"Switch"，`switch2` Switch 标志 +"Switch 2"（Simple Icons 无 Switch 2 图标），`steam` Steam 标志 +"Steam"；整体 `aria-label="平台：PS5"` 等。平台标志来自 Simple Icons（CC0），内联 SVG，不是图片素材 | `MediaPoster/Hover` 内（仅游戏，左上角） |
| `YearBadge` | `YearBadge`（F-005；已实现：`src/components/reader/YearBadge.tsx`，Sprint 9 任务 15） | `year`（四位数字）。样式同 `PlatformBadge`（高 22 胶囊、内边距 0 9、`#171A21` 85% 底 + 背景模糊 8、0.5px 白 18% 描边），内容只有年份：`font-mono` 600 11px `#E6EDF3`；`aria-hidden`（年份已在翻面控件 `aria-label` 中：`《黑神话：悟空》，PS5，2024`） | `MediaPoster/Hover` 内（仅游戏，右下角） |
| `MediaTimeBasis` | `MediaTimeBasis`（F-005；已实现：`src/components/reader/MediaTimeBasis.tsx`，Sprint 9 任务 15；`aria-label="分段依据"`） | `value`：`marked` / `release`；`onChange`；`type`（决定文案：书 / 漫画 读过时间 / 出版年份，电影 看过时间 / 上映年份，剧集 看过时间 / 首播年份，游戏 玩过时间 / 发售年份，桌游 玩过时间 / 发行年份）。高 30 分段控件：`surface-sunken` 底、圆角 `radius`、内边距 3、间距 2；项内边距 0 10、13px，选中项 `bg` 底 + `0 1px 2px` 黑 10% 投影、`ink` 500，未选 `ink-muted`；`role="radiogroup"`，项 `role="radio"`，方向键切换。只在"按时间"打开时渲染，位于 `MediaTimeToggle` 右侧（间距 8），与按钮一起挂到页面槽位 | 所有分类页 |
| `MediaTimeToggle/On` · `MediaTimeToggle/Off` | `MediaTimeToggle`（F-005；已实现，任务 10） | `pressed`、`onChange`。`<button aria-pressed>`，`calendar-days` 图标 16px + "按时间"（14px 500），内边距 6 12，圆角 `radius`，间距 6；`/Off`：`bg` 底、1px `line` 描边、`ink-muted`；`/On`：`accent-soft` 底、1px `accent` 描边、`accent` 字与图标（不用反色，避免与选中的分类胶囊混淆）；悬停 `/Off` 字变 `ink` | 电影、剧集页：桌面在分类标签行右端，手机在标题行计数右侧 |

### 列表动效参数

`PostList`（后台）、`PostCardList`（读者端 `/posts`、`/tags/:tag`）内部渲染 React Bits AnimatedList（TypeScript + Tailwind 版，文件 `AnimatedList.tsx`，只供这两个区块使用，页面不直接引用）。**只借动效和交互**：每行用 `renderItem` 渲染 `PostListItem` / `PostCard`，卡片外观不变；AnimatedList 自带的磨砂底板、行块、选中框都不用（[Backlog](../backlog/animated-list.md)）。

已实现（后台 `PostList`，Sprint 2）：`src/components/admin/PostList.tsx`、`src/components/vendor/react-bits/AnimatedList.tsx`（另去掉 Enter / 空格选择与内部滚动跟随，见文件头）。

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
| `height` | 卡片实际高度：桌面 `96`、手机 `85` | 标题单行，超出省略；高度变了要同步。实现上不传 prop，由 `className` 设 `--sr-h` 按断点切换 |
| `radius` | `12` | 与卡片圆角一致 |
| `actionColor` / 删除文字 | `danger` / `danger-ink` | — |
| `drawerColor` / 编辑底色与文字 | `surface-sunken` / `ink` | — |
| `rowColor` / `textColor` | `transparent` / `ink` | 底色 `bg` 由卡片外框自己画（与 `PostCard` 一致），拖动面不再铺底色 |
| `commitAt` / `fullSwipe` | `0.6` / `true` | 拖过 60% 行宽删除块跃出，松手即删 |
| `snapBounce` / `resistance` / `collapseMs` | `0.2` / `0.55` / `200` | 默认值 |
| `closeOnAction` / `haptic` | `true` / `true` | — |
| `label` | `《{标题}》` | 行的读屏名称 |

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为；已实现：`src/components/vendor/react-bits/SwipeRow.tsx`，上游路径为 `src/ts-tailwind/Micro/SwipeRow`，改动清单见文件头）：

| 改动 | 原因 |
|------|------|
| 颜色 prop 接受 CSS 变量；去掉 `onColor()` 按 hex 推算文字色，改为显式 `actionInk` / 每个 action 的 `ink` | 令牌是 CSS 变量，且要随亮暗主题切换 |
| 拖动面加卡片外框：1px 虚线 `line-strong`、圆角 12px、内边距 20px 28px（手机 16px 20px）；`active` 时渲染 `PostCard/Hover` 的双层错位 | 外观仍是纸质卡片 |
| 关闭且不在拖动时，裁剪容器 `overflow: visible`、抽屉 `visibility: hidden`；开始拖动或抽屉打开时才裁剪，此时 `active` 视为假（双层错位收回） | 否则双层错位的 4px 被裁掉 |
| 根节点的 `overflow: hidden` 只在 `phase=collapsing` 时生效 | 同上 |
| 拖动过（`moved`）的这次 pointerup 之后吞掉一次 `click`；抽屉打开时点卡片只收起，不跳转；标题链接设 `draggable="false"` | 拖完不能误进写文章页，也不出现浏览器拖链接的残影 |
| 认定为水平拖动后才 `setPointerCapture`（原组件在 pointerdown 即捕获） | 按下即捕获时 click 的目标变成拖动面，点卡片不再跳转 |
| action 支持 `href`：渲染为 `<a>`（"编辑"），其余仍是 `<button>` | 编辑是导航，用链接语义 |
| 内置切换按钮改为 `IconButton/Ghost`（`ellipsis` 图标，`aria-label="《{标题}》的操作"`）：桌面卡片 `active` 或自身聚焦时显示，手机只在聚焦时显示；去掉 `e.detail !== 0` 判断，鼠标点击也能开合 | 桌面鼠标用户的入口；原组件只认键盘 |
| 键盘打开抽屉后焦点移到"编辑"；Esc 收起并把焦点还给 `⋯`；抽屉内 Tab 顺序"编辑 → 删除" | 原组件打开后焦点不动 |
| 播报文案中文化：`Release to 删除` → "松手删除"，`n actions revealed` → "已展开 2 个操作" | 界面语言 |
| 去掉 `@hugeicons/*`，默认图标改 lucide `Trash2` | 项目图标统一用 lucide |
| 速度采样时间用事件 `timeStamp`（原为 `performance.now()`） | 与 `performance.now()` 同一时间基准；满足本项目 react-hooks 纯函数检查 |

## 文章图片

> 先行稿（[Backlog](../backlog/article-image-display.md)），规则写在 admin.pen 组件区「文章图片」每个组件右侧的说明里，F-002 design-ui 时整理进 `pages/post-detail.md`。图片上的浮层亮暗主题一致，颜色用 `overlay` / `scrim` 令牌（见 [design-tokens.md](design-tokens.md)"图片浮层"）。Markdown 写法（动态照片、宽图、组图）待 F-001 design-arch 定。

| 设计稿组件 | React 组件 | Props / variant | 使用位置 |
|-----------|-----------|----------------|---------|
| `ArticleImage` · `/Loading` · `/Live` · `/LivePlaying` · `/Wide` | `ArticleImage` | `src`；`alt`；`caption?`（Markdown title）；`onClick?`（F-002 读者页打开灯箱：传入时图片区为 `role="button"`、`aria-label="查看大图：{alt}"`、Enter / 空格触发，加载失败或点在重试按钮上时不触发；不传时结构不变）；`width`、`height`（原图尺寸，用来预留宽高比）；`placeholder?`（模糊缩略图）；`live?`（`{ videoSrc, range?, codec? }`：`range` 为外链动态照片内嵌视频的字节范围 `{ offset, size }`，第一次播放时按范围读取；`codec: "hevc"` 时按 `video/mp4; codecs="hvc1"` 判断能否播放，US-13）；`external?`（`{ thumb, mainBytes? }`，Afilmory 外链照片：首屏用 `thumb`，进入视口后换成主图——有 `mainBytes` 时按字节范围 `0…mainBytes-1` 读取，否则为原图地址；替换期间保持 complete，主图失败保留缩略图，US-13；已实现 Sprint 8：`ArticleImage`、`ImageGallery` 网格与手风琴、`LivePhotoLayer`、`Lightbox`）；`wide?`。图片外层渲染 React Bits RefineFrame，负责加载中、马赛克渐显和失败重试（见下方"图片加载参数"）。`/Loading`、`/LivePlaying` 是运行时状态，**不是 prop**；`/Live` 对应传了 `live`，`/Wide` 对应 `wide`。已实现（`placeholder` 除外）：`src/components/article/ArticleImage.tsx`（宽图向两侧扩出 `--article-bleed`，由版心所在容器设置，后台预览区为左右内边距；图注对齐正文；根节点加载中带 `data-loading`） | 文章详情正文（05 / 05m）、后台 `MarkdownPreview` |
| `LiveBadge` · `LiveBadge/Playing` | `LiveBadge` | `playing`；图标 + `LIVE`，`overlay` 底 + 背景模糊，播放中换成 `overlay-ink` 底。已实现：`src/components/article/LiveBadge.tsx`（`[data-live-badge][data-playing]`）；播放层 `src/components/article/live-photo.tsx` 由 `ArticleImage`、`ImageGallery` 共用（图片加载完成后叠加、badge 左上 12px，视频 `preload="none"` 静音内联只播一次，指针移入 / 长按 0.3s 后播放、播放时放大 1.06 倍并显示 3px 进度条，`error` 或 `play()` 报 NotSupportedError 或 `canPlayType` 为空时隐藏） | `ArticleImage`、`ImageGallery` 单元格、`Lightbox` |
| `ImageGallery/Grid` · `/Grid/Hover` · `/Accordion` · `/Accordion/Mobile` | `ImageGallery` | `variant`：`grid` / `accordion`；`images`（每项同 `ArticleImage` 的数据，另带 `accent` 主色）；`caption?`。grid 按张数自动定列数（2–9 张），内部渲染 React Bits ChromaGrid（见下方"组图网格参数"）；accordion 适合 3–7 张，内部渲染 React Bits AccordionGallery（见下方"组图手风琴参数"）。`/Grid/Hover` 是鼠标在组图内的运行时状态，`/Accordion/Mobile` 为 ≤ 520px 形态（竖向条带），都不是 prop。`onImageClick?(index)` 供读者端打开 `Lightbox`，预览中不传（卡片不可点、不可聚焦）。`caption` 不传时由组内各图 title 用"；"拼成一行（网格显示在下方；手风琴各图注显示在面板上，组图注只用于 `aria-label`）。已实现：`src/components/article/ImageGallery.tsx`（根节点 `figure[data-image-gallery=grid|accordion]`；网格单元格 `[data-gallery-item][data-accent]`；加载状态与 `ArticleImage` 共用 `image-load.ts`） | 文章详情正文、后台 `MarkdownPreview` |
| `OverlayButton` | `OverlayButton` | `icon`；`aria-label`（必填）；`size`：48（灯箱桌面）/ 44（灯箱手机、`ImageMenu` 手机）/ 32（`ImageMenu` 桌面，图标 16px）。已实现：`src/components/ui/OverlayButton.tsx` | `Lightbox` 关闭按钮（左右切换用 DepthCarousel 自带箭头）；`ImageMenu` 触发按钮 |
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

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为；已实现：`src/components/vendor/react-bits/RefineFrame.tsx`，上游路径为 `src/ts-tailwind/Micro/RefineFrame`，另补 `aspectRatio` 可选、减弱动效不启用马赛克画布，改动清单见文件头）：

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

**需要在源码上补的改动**（implement 阶段；已实现：`src/components/vendor/react-bits/ChromaGrid.tsx`，上游路径 `src/ts-tailwind/Components/ChromaGrid`，另补：彩色聚光层首次鼠标移入后才挂载、去掉演示数据，改动清单见文件头）：

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

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为；已实现：`src/components/vendor/react-bits/AccordionGallery.tsx`，上游路径 `src/ts-tailwind/Components/AccordionGallery`，另补：无图注的面板不显示标签竖条，改动清单见文件头）：

| 改动 | 原因 |
|------|------|
| 新增 `onActiveClick(index)`：点击已展开的面板时调用 | 打开 `Lightbox`（原组件只支持跳转 `link`） |
| 新增 `renderOverlay(item, index, active)`：在面板内渲染额外内容 | 展开项显示 `LiveBadge`，并挂动态照片播放（悬停 / 长按） |
| `prefersReduced` 改为订阅 `matchMedia` 变化 | 原实现只在渲染时读一次 |
| 外层 `aria-label` 改为由 `ImageGallery` 传入（如"组图：京都三日"） | 原文案写死为英文 |
| "已展开"按按下时的状态判断（F-002） | 触屏轻点会先触发兼容的 mouseenter / focus 把面板展开再 click，导致第一次轻点就打开灯箱 |

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

**需要在源码上补的改动**（implement 阶段；已实现：`src/components/vendor/react-bits/DepthCarousel.tsx`，上游路径 `src/ts-tailwind/Components/DepthCarousel`，另补：不循环时首尾按钮 disabled、`apiRef` 供灯箱处理 ← / →、白色类名改为令牌，改动清单见文件头；`Lightbox` 已实现：`src/components/reader/Lightbox.tsx`，Sprint 4）：

| 改动 | 原因 |
|------|------|
| 新增 `initialIndex`：首次渲染直接定位到该张、不播放动画 | 从文中点哪张就打开哪张（原组件固定从第 0 张开始） |
| `items` 每项可带 `width` / `height`，卡片宽 = `cardHeight` × 宽高比 | 灯箱要看完整原图，原组件所有卡片同尺寸 + `object-cover` 会裁切 |
| 新增 `renderOverlay(item, index, focused)` | 最前的卡片显示 `LiveBadge`、挂动态照片播放 |
| `aria-label`、`aria-roledescription` 等文案改为中文并可传入 | 原文案写死为英文 |
| `prefers-reduced-motion` 在挂载时就读取，并订阅变化 | 原实现只在 autoplay 的 effect 里读取一次 |
| 缩放余量 `120` 改为 `edgePadding` prop（默认 120） | 原余量写死，手机上当前图只有屏宽的 60% |

### 分类导航参数

`MediaTypeTabs` 内部渲染 React Bits GooeyNav（TypeScript + Tailwind 版，文件 `GooeyNav.tsx`，无额外依赖，WebGL2 绘制，不支持时用组件自带的 DOM 胶囊兜底；只供 `MediaTypeTabs` 使用，页面不直接引用）。读者页与后台页都以 `client:load` 挂载；读者页除它之外不加载 React（[Backlog](../backlog/gooey-media-tabs.md)）。

| Prop | 值 | 说明 |
|------|----|------|
| `items` | 7 个分类：`label` = 中文名，`href` = `hrefFor(type)` | 顺序同上表 |
| `initialActiveIndex` | 当前分类的序号 | 非受控：点击后组件自己切到新项、播放水滴，再由 `onNavigate` 跳转 |
| `theme` | `useColorScheme()` | 亮 / 暗主题决定悬停底色和投影深浅 |
| `color` / `activeTextColor` | `useTokenColor("ink")` / `useTokenColor("bg")` | 胶囊反色，随主题切换（与 `Button` 同一套令牌解析） |
| `colors` | `[]` | 水滴同胶囊色，不加彩色 |
| `size` | `"sm"`，另用 `style` 覆盖 `--gn-font: 14px`、`--gn-ink: var(--ink)`、`--gn-muted: var(--ink-muted)` | 字号对齐设计稿，文字颜色走站点令牌而不是组件自带的灰 |
| `frame` | `false` | 不要磨砂底板，保持纸面风格 |
| `animationTime` / `timeVariance` | `600` / `300` | 默认值 |
| `particleCount` / `spread` | `12` / `40` | 标签短、间距小，比默认少一点、散得近一点 |
| `gooeyness` / `wobble` | `0.5` / `0.4` | 新胶囊轻微回弹 |
| `hoverEffect` | `true` | — |
| `onNavigate`（新增） | `(href) => setTimeout(() => navigate(href), reduced ? 0 : 700)` | `navigate` 来自 `src/lib/dom/navigate.ts`；700ms 覆盖水滴飞行（`animationTime` × 0.94 + 时间抖动的一半）；减弱动效时立即跳转 |
| `ariaLabel`（新增） | `"书影音分类"` | — |

**需要在源码上补的改动**（implement 阶段，保留原组件其余行为；上游路径 `src/ts-tailwind/Components/GooeyNav`，改动清单写在文件头）：

| 改动 | 原因 |
|------|------|
| 新增 `onNavigate(href, index)`：传入时，未选中项的普通左键点击（`button === 0` 且无 Ctrl / ⌘ / Shift / Alt）先 `preventDefault`、切换选中项，再调用它；带修饰键或中键点击不拦截、不切换 | 分类是独立的预渲染页，原组件让链接直接跳转，动画来不及播；修饰键点击要保留"新标签页打开" |
| 引擎就绪前（服务端渲染、无 JS、水合前）当前项链接直接显示 `--gn-pill` 底、`--gn-active-ink` 字；布局 effect 里给 `<nav>` 加 `data-ready` 后改由画布绘制 | 原组件水合前没有胶囊，首屏会先看到无选中态再闪出胶囊 |
| 新增 `ariaLabel`，渲染为 `<nav aria-label>` | 原组件的 `<nav>` 没有名称 |
| 根节点透传 `data-*`（测试用 `data-media-tabs`） | E2E 定位 |

### 海报墙参数

`MediaPosterWall` 内部渲染 React Bits Masonry（`Masonry.tsx`），每块砖是 `MediaPoster`（内部渲染 React Bits FlipCard，`FlipCard.tsx`），按时间分段时每段标题 `MediaTimeHeading` 下缘挂 React Bits GradualBlur（`GradualBlur.tsx`）。三个文件都只供海报墙使用，页面不直接引用。上游源码：[reactbits-masonry.tsx](../../references/code/reactbits-masonry.tsx)、[reactbits-flip-card.tsx](../../references/code/reactbits-flip-card.tsx)、[reactbits-gradual-blur.tsx](../../references/code/reactbits-gradual-blur.tsx)（[Backlog](../backlog/media-poster-wall.md)）。

#### Masonry

不分段时整面墙一个实例；按时间分段时每段一个实例（每段各自排布）。

| Prop | 值 | 说明 |
|------|----|------|
| `items` | 条目 → `{ id, img: cover ?? "", width, height, title }`，`width / height` 取 `posterAspect(type, cover)`（书、漫画、电影、剧集 2:3，桌游 1:1，游戏为 IGDB 宽高、无封面 3:4） | 不量图；无封面由 `renderTile` 画占位 |
| `columns` / `columnWidth` / `gap` | 容器宽 < 600px 时 `2`，否则 `'auto'` / `200` / `16` | 1440 宽（主体 1340）→ 6 列，每张约 210×315；手机（主体 350）→ 2 列，每张约 167×250。列数取自 `MediaPosterWall` 量到的容器宽 |
| `radius` | `4` | 与 `MediaCard` 封面一致 |
| `animateFrom` / `stagger` / `duration` / `bounce` | `'bottom'` / `0.04` / `0.6` / `0.15` | 自下而上依次弹入 |
| `blurToFocus` / `revealOnScroll` | `true` / `true` | 滚到时才入场 |
| `hoverEffect` / `focusOnHover` / `captions` / `parallax` | `'none'` / `false` / `'none'` / `0` | 悬停倾斜交给 FlipCard；片名浮层由 `MediaPoster` 自己画（沿用本组件 `CAPTION` / `TITLE` 的样式类） |
| `lightbox` / `draggable` | `false` / `false` | 点击用于翻面；读者不需要拖动排序 |
| `renderTile`（新增） | `(item, { w, h }) => <MediaPoster …/>` | 见下方源码改动 |

#### FlipCard（`MediaPoster` 内）

| Prop | 值 | 说明 |
|------|----|------|
| `front` / `back` | `MediaPoster` 的正面（封面 + 悬停片名）/ 背面（详情） | — |
| `flipped` / `onFlipChange` | 受控：`MediaPosterWall` 记录当前翻开的 `id`（最多一个，跨分段） | 翻另一张时前一张翻回；Esc 翻回（墙上监听 `keydown`）；切换"按时间"时全部翻回 |
| `axis` / `flipOnClick` / `draggable` | `'y'` / `true` / `false` | 关拖动：避免与滚动、误触冲突 |
| `width` / `height` / `radius` | 砖块 `w` / `h` / `4` | — |
| `tilt` / `tiltMax` / `hoverScale` | `true` / `8` / `1.02` | 比默认收敛，砖块小 |
| `glare` / `glareOpacity` | `true` / `0.22` | 默认值：悬停时跟随指针的白色径向反光 |
| `perspective` / `stiffness` / `damping` | `1100` / `170` / `20` | 默认值 |
| `background` / `color` | `useTokenColor("flip-surface")` / `useTokenColor("flip-ink")` | 背面底色与文字：亮 `#FFFFFF` / 正文色，暗 `#27272A` / `#F5F5F5`（同示例默认值，见 [design-tokens.md](design-tokens.md)"海报墙"） |
| `shadow` / `shadowColor` / `shadowOpacity` | `true` / `"#000000"` / `0.25` | 比默认淡，保持纸面风格 |
| `ariaLabel` | `《{title}》` | 正反面由 `aria-pressed` 表达 |

#### GradualBlur（`MediaTimeHeading` 下缘）

| Prop | 值 | 说明 |
|------|----|------|
| `position` / `target` | `'top'` / `'parent'` | 挂在标题底边下方 56px 的绝对定位条里，越靠近标题越模糊 |
| `height` | `56` | — |
| `strength` / `layers` / `curve` / `exponential` | `2` / `8` / `'linear'` / `true` | 默认值 |
| `tint` | `useTokenColor("bg")` | 海报滚到标题下时淡入页面底色 |
| `autoHide` / `hoverIntensity` / `zIndex` | `false` / `1` / `1`（标题为 `2`） | 只在吸顶时有意义；不随悬停变化 |

**减弱动效**：Masonry 自带（无位移、无模糊直接出现）；FlipCard 用 `useReducedMotion` 直接切换正反面；悬停片名只淡入不位移。GradualBlur 为静态效果，不受影响。

**无 JS 与水合前**：Masonry 在服务端量不到宽度、不输出砖块，所以 `MediaPosterWall` 服务端渲染静态网格（`<ul data-poster-static>`，CSS grid `repeat(auto-fill, minmax(200px, 1fr))`，< 600px 时 2 列，间距 16，不分段），每项是正面朝上的 `MediaPoster`，背面详情文字在 HTML 中（`aria-hidden`）；无 JS 时"豆瓣 ↗"固定显示在海报右下角（`html:not([data-js])`），`MediaTimeToggle` 不渲染。`BaseLayout` 的 `<head>` 内联脚本给 `<html>` 加 `data-js`，有 JS 时静态网格 `visibility: hidden` 占位，挂载后换成 Masonry 并播放入场，避免先看到静态网格再闪掉。

**切换按钮的挂载**：`MediaTimeToggle` 由 `MediaPosterWall` 渲染，通过 `createPortal` 放进页面预留的空槽 `[data-time-toggle-slot]`：桌面槽在分类标签行右端，手机槽在标题行计数右侧；按 `(min-width: 768px)` 选一个槽挂载，断点变化时换槽（同一时刻只有一个按钮）。读者选择存 `localStorage` 键 `media:by-time`（`"1"` / `"0"`），读写包 `try/catch`，读不到按关闭。

**需要在源码上补的改动**（implement 阶段，保留其余行为；改动清单写在文件头）：

| 文件 | 改动 | 原因 |
|------|------|------|
| `Masonry.tsx` | 新增 `renderTile?(item, size: { w, h }, index)`：传入时砖块内容用它的返回值，不渲染内置的 `<button>` / `<a>` 卡片，也不挂内置的点击、拖动、悬停处理；砖块容器（定位、入场、`role="listitem"`）不变 | 原组件砖块只能是图片，翻面需要放 FlipCard |
| `Masonry.tsx` | `@hugeicons/*` 换成 `lucide-react` 的 `ArrowLeft` / `ArrowRight` / `ArrowUpRight` / `X` | 不新增依赖；灯箱代码保留，便于以后复用 |
| `Masonry.tsx` | 根节点透传 `data-*`（分段用 `data-poster-segment`；`data-poster-wall` 挂在 `MediaPosterWall` 外层，分段时也只有一个） | E2E 定位 |
| `Masonry.tsx` | 传 `renderTile` 时砖块不等内置图片加载、直接入场 | 没有内置 `<img>`，原逻辑会等 2.5 秒兜底才显示 |
| `FlipCard.tsx` | `flip()` 按目标角度判断朝向（原为当前角度取整） | 受控用法下海报被动翻回的动画未结束时，点击 / Enter 会被判为"背面"而再翻回，表现为点了没反应（任务 10 E2E 发现） |
| `GradualBlur.tsx` | 无行为改动 | — |

## 页面区块（单处使用，未做 Pencil 组件）

| 图层名 | React 组件 | 所在画板 |
|-------|-----------|---------|
| `TagPostsNav` · `TagPostsNav/Mobile` | `TagPostsNav`（已实现：`src/components/reader/TagPostsNav.astro`，`variant` = `aside` / `end`） | 05 文章详情左栏 / 05m 文末（同标签文章，最多 8 篇，不含本文，每项标题 + 共享标签；`/Mobile` 为文末形态，每项高 44） |
| `ArticleHeader` | `ArticleHeader` | 05 / 05m（标题、日期、字数与阅读时长、更新于（有更新时）、标签） |
| `ArticleContent` | `ArticleContent` | 05 / 05m（Markdown 渲染：段首缩进、首字下沉、引用署名） |
| `HomeIntro` | `HomeIntro` | 06 / 06m（头像、问候语、多段简介、GitHub / 摄影 / 邮箱；内容来自 `site.ts`）。已实现：`src/components/reader/HomeIntro.astro` |
| `PostsHeader` | `PostsHeader` | 07 / 07m（"文章"或"#标签" + 篇数） |
| `TagIndex` | `TagIndex` | 07 / 07m（"按标签浏览" + `TagChip` 带文章数，只在 `/posts` 第 1 页）。已实现：`src/components/reader/TagIndex.astro` |
| `PostCardList` | `PostCardList` | 07 / 07m（`PostCard` 列表 + `Pagination`；列表底层 AnimatedList，见"列表动效参数"） |
| `TableOfContents` | `TableOfContents` | 05（右栏：阅读进度 + 目录，当前章节高亮）。已实现：`src/components/reader/TableOfContents.astro`；`ReadingProgress`、`TocDrawer` 同目录，原生脚本 `reading.ts` |
| `ReadingProgress/Bar` | `ReadingProgress` | 05m / 05m-b（顶栏下 2px 进度细条，< 1280px） |
| `TocButton` · `TocDrawer` | `TocDrawer` | 05m 右下角浮动按钮 / 05m-b 底部目录抽屉（< 1280px） |
| `NotFound` | `NotFound` | 08（404：代码、标题、说明、回首页 / 看看全部文章） |
| `MediaHeader` | `MediaHeader`（已实现，任务 8） | 09 / 09m（"书影音" + 当前分类数量与进行中数量） |
| `MediaList` | `MediaList`（已实现：所有分类海报墙，Sprint 9 任务 16） | 09 / 09m / 09c / 09d / 09e / 09dm / 09f / 09g：所有分类都渲染 `MediaPosterWall`，空分类 `EmptyState`；进行中的条目置顶，其余按标记日期倒序；列表下方一行来源说明（游戏页加"封面来自 IGDB"）；规则见 [reader-media.md](pages/reader-media.md)（2026-10-23 书、漫画、桌游由 `MediaCard` / `MediaRow` 改为海报墙） |
| `MediaPosterWall` | `MediaPosterWall`（已实现，任务 10） | 09e（不分段，默认）/ 09d（按时间分段）/ 09d-s（分段标题吸顶）/ 09dm（手机）/ 09f（游戏）：所有分类的海报墙（书、漫画、电影、剧集 2:3，桌游 1:1，游戏保持封面原比例并悬停显示平台与年份），React 岛 `client:load`，底层 React Bits Masonry，砖块为 `MediaPoster`；`MediaTimeToggle` 切换是否分段；同一时间只翻开一张，Esc 翻回；参数与无 JS 兜底见"海报墙参数"
| `MediaEntryForm` | `MediaEntryForm` | 11 / 11m（书影音录入 / 编辑表单主体：卡片容器（头部图标块 + 标题）内依次 `RecognizeBox`、条目信息（封面区：非游戏 `ShelfCoverField` 上传，游戏 `IgdbCoverField` 只按原比例预览 IGDB 链接；字段，游戏加平台下拉与"封面链接（IGDB）"）、我的记录、底部操作，F-005；见 [admin-media.md](pages/admin-media.md)） |
| `CoverField` | `CoverField` | 03 设置抽屉（封面：缩略图 + 更换 / 移除，空时为拖放区）。已实现：`src/components/admin/editor/CoverField.tsx` |
| `LoginForm` | `LoginForm` | 01 / 01m |
| `PageHeader` | `PageHeader` | 02 / 02m（辅助信息在标题右侧）；10 / 10m 用 `stacked`：辅助信息在标题下方一行，12px `ink-faint`（书影音：计数 + 读者页地址） |
| `PostList` | `PostList` | 02 / 02m（底层 AnimatedList，见"列表动效参数"） |
| `EditorTopBar` | `EditorTopBar` | 03 / 03m |
| `MarkdownEditor` | `MarkdownEditor` | 03 / 03m |
| `StoragePage` | `StoragePage` | 09 / 09m（存储页主体：`PageHeader` + 三张 `StatCard` + 保护期提示 + 清理按钮与确认框，F-006） |
| `MarkdownPreview` | `MarkdownPreview` | 03 |
| `ImageSyntaxHelp` | `ImageSyntaxHelp` | 03b（`Popover` 的内容：写法示例）。已实现：`src/components/admin/editor/ImageSyntaxHelp.tsx`（组图两行显示说明、复制可直接粘贴的示例；桌面在底栏 Popover，与底栏文字左对齐；手机在设置面板最下方展开） |
| `PostSettingsDrawer` | `PostSettingsDrawer` | 03 |

预览区里的代码块、任务列表、上传中图片是 Markdown 渲染结果（代码块由 Expressive Code 输出），不作为独立组件。

## 已知差异

| 项 | 现状 | 建议 |
|----|------|------|
| `IconButton` 圆角 | 编辑器工具栏、轻提示关闭按钮的实例覆盖为 4px，其余为 `radius`（8px） | 实现时统一为 `radius` |
| `ConfirmDialog` 遮罩 | 设计稿为 `#2A251F` 35%（未用令牌） | 实现用 `scrim` 令牌 37%（`bg-scrim/37`），亮暗主题通用 |
| 轻提示关闭按钮尺寸 | 设计稿为 24×24、图标 14px | 实现用 `IconButton` `sm`（28×28、图标 16px），满足桌面可点区域 ≥ 28px（design-tokens"焦点与交互"） |
| `PostCard` 边框 | 参考站是 1px 虚线，Pencil 不支持虚线描边，设计稿画成实线 | 实现时用 `border-dashed`，颜色 `line-strong` |
| 视图切换选中项字重 | 套用 `SegmentedItem/Selected` 后从 400 变为 500，与文章列表筛选一致 | 保持统一 |

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-27 | 新增基础组件 `Checkbox`（`/Checked`、`/Default`、`/Disabled`，组件区按钮行旁）；`DoubanImportDialog` 加类别勾选（用 `Checkbox`），去掉统一"上次同步"行 | miraclehifi |
| 2026-10-23 | 新增 `DoubanImportDialog`（组件区业务区块 Row 8，页面 11i；[douban-bulk-import](../backlog/douban-bulk-import.md)） | miraclehifi |
| 2026-10-27 | `MediaEntryForm` 游戏分支已实现：封面区内部部件 `IgdbCoverField`（Sprint 9 任务 13，设计稿 11g） | miraclehifi |
| 2026-10-22 | `RecognizeBox` 已实现；`Field` 新增 `warning`（识别缺失）与 `highlight`（识别填入）（Sprint 9 任务 6） | miraclehifi |
| 2026-10-22 | `StarRating`（含 `/Small`）、`MediaEntryForm` 已实现；`Field` 加悬停光晕；`SegmentedControl` 加 `className`（撑满列宽）（Sprint 9 任务 5） | miraclehifi |
| 2026-10-22 | `MediaRow`、`MediaCard`、`MediaHeader`、`MediaList`（任务 8）与 `MediaPoster`、`MediaTimeHeading`、`MediaTimeToggle`、`MediaPosterWall`（任务 10）已实现；`MediaCard` 底部日期统一为 `yyyy-MM`（与验收口径一致）；海报墙参数补 FlipCard 朝向修正、GradualBlur 只在吸顶时显示、Masonry `renderTile` 直接入场 | miraclehifi |
| 2026-10-22 | `PageHeader` 新增 `stacked`（设计稿 10）；`ConfirmDialog` 新增 `returnFocus`（WebKit 焦点归还）；`AdminHeader`（书影音）、`MediaEntryRow`、`MediaTypeTabs` 已实现（Sprint 9 任务 4） | miraclehifi |
| 2026-10-22 | 新增 `MediaPoster/Front` · `/Hover` · `/Back`（FlipCard 翻面海报，悬停显示片名，背面不显示导演）、`MediaTimeHeading`、`MediaTimeToggle/On` · `/Off`，页面区块 `MediaPosterWall`（满宽 Masonry 海报墙，可按时间分段）与"海报墙参数"；电影、剧集改用海报墙，`MediaRow` 只用于游戏、桌游（[media-poster-wall](../backlog/media-poster-wall.md)） | miraclehifi |
| 2026-10-22 | 展示场景（`/Small`）无评分恢复为不渲染；录入组件空值仍显示 5 颗灰星（作者要求） | miraclehifi |
| 2026-10-22 | 星级改为累计点亮：打 N 分时前 N 颗都是黄色实心星（各带表情），其余灰色占位；取代"只亮当前一颗"（作者要求） | miraclehifi |
| 2026-10-22 | 星级始终显示 5 颗：未亮的星为灰色占位，无评分时 5 颗全灰，不再隐藏（作者要求，[rating-face-stars](../backlog/rating-face-stars.md)） | miraclehifi |
| 2026-10-22 | `RatingInput` 改名 `StarRating`（读者端也用）：去掉"清除"按钮，再点当前星取消；新增 `StarRating/Small`（只读 16px），`MediaRow`、`MediaCard` 的 ★☆ 字符改为它（[rating-face-stars](../backlog/rating-face-stars.md)） | miraclehifi |
| 2026-10-22 | `RatingInput` 改为表情星（参考 Stars rating animation）：只亮当前一颗、表情随分值、切换滑动动效；新增"评分动效参数"（[rating-face-stars](../backlog/rating-face-stars.md)） | miraclehifi |
| 2026-10-22 | `Field` 与 `RecognizeBox` 输入框参考 Aceternity signup-form：标签 `ink`、轻投影、悬停光晕（[media-form-card-layout](../backlog/media-form-card-layout.md)） | miraclehifi |
| 2026-10-22 | `RecognizeBox` 加标签、可识别类型小卡片、结果预览卡，输入框圆角 12；`MediaEntryForm` 收进卡片容器（[media-form-card-layout](../backlog/media-form-card-layout.md)）；`MediaTypeTabs` 去掉"动画"、"剧"改名"剧集"（[drop-anime-type](../backlog/drop-anime-type.md)） | miraclehifi |
| 2026-10-22 | `MediaTypeTabs` 改为 React 岛，内部渲染 React Bits GooeyNav（水滴切换、悬停胶囊），新增"分类导航参数"；`/Selected` 圆角改为胶囊，手机端换行代替横向滚动（[gooey-media-tabs](../backlog/gooey-media-tabs.md)） | miraclehifi |
| 2026-10-21 | F-005 design-ui：新增 `MediaEntryRow` · `/Mobile`、`RecognizeBox`、`RatingInput`（组件区业务区块 Row 7），页面区块 `MediaEntryForm`；`AdminHeader` 加"书影音"与 `current="media"`；`MediaRow` / `MediaCard` 封面改为 R2 地址、无豆瓣链接时非链接；`MediaTypeTabs.Item` 的 `href` 规则（[media-douban-sync](../backlog/media-douban-sync.md)） | miraclehifi |
| 2026-10-16 | F-005 书影音先行稿（09 / 09m，参考 pseudoyu）：新增 `MediaTypeTab/Selected` · `Default`、`MediaRow` · `MediaRow/Mobile`、`MediaCard` · `MediaCard/Mobile`（书、漫画的卡片，参考 book-store-ui），页面区块 `MediaHeader`、`MediaList`（[media-douban-sync](../backlog/media-douban-sync.md)） | miraclehifi |
| 2026-10-15 | `ThemeToggle` 改两态 + 圆形扩散动画，图标换成半填充圆；admin.pen `SiteNav` / `SiteNav/Mobile` 同步（[animated-theme-toggle](../backlog/animated-theme-toggle.md)） | miraclehifi |
| 2026-10-15 | F-002 design-ui：06 拆为首页（06 / 06m）与 `/posts`（07 / 07m），`HomeTags` / `HomePosts` 改名 `TagIndex` / `PostCardList`，新增 `PostsHeader`；05 补左栏 `TagPostsNav`、文末 `PostPager`、`BackLink`，05m 目录改为 `TocButton` + `TocDrawer`（05m-b）、新增 `ReadingProgress/Bar`、`TagPostsNav/Mobile`；新增 08 `NotFound`、`ThemeToggle`、03 `CoverField`；`PostCard` 摘要优先用 `summary` | miraclehifi |
| 2026-10-15 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../backlog/drop-apple-live-photo.md)）：`ImageSyntaxHelp` 删去 iPhone 实况照片导出方法（admin.pen 03b 已同步） | miraclehifi |
| 2026-10-14 | `ArticleImage`、RefineFrame 标注已实现；宽图扩出量由 `--article-bleed` 决定 | miraclehifi |
| 2026-10-14 | 写文章页顶栏新增"更多"菜单（`IconButton/Ghost` + `Menu`，项：登出），03 / 03m 顶栏最右、04 新增展开示例；不新增组件 | miraclehifi |
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
| 2026-10-16 | 新增 `UploadCard`（上传进度卡片，四种设计稿状态）、`IconButton` 加 `checked`（`/Ghost/Checked`，工具栏"实况照片"开关）、`ImageMenu` 加实况勾选项；admin.pen `EditorToolbar` / `EditorToolbar/Mobile` 末尾加实况按钮（[media-upload-experience](../backlog/media-upload-experience.md)） | miraclehifi |
| 2026-10-16 | F-006 design-ui：新增 `StatCard`（含 `/Highlight`）、页面区块 `StoragePage`；`AdminHeader` 加导航"文章 / 存储"与 `current`；admin.pen 新增 09 / 09m 存储页（[media-orphan-cleanup](../backlog/media-orphan-cleanup.md)） | miraclehifi |
| 2026-10-19 | `UploadCard` 加 `fetching` 状态；`ArticleImage` 加 `external`、`live.range` / `live.codec`（Afilmory 外链照片，[afilmory-photo-embed](../backlog/afilmory-photo-embed.md)）；无新组件、设计稿不变 | miraclehifi |
