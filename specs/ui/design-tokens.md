# 设计令牌（楷体 · 白底 · 暖棕）

**最后更新**: 2026-10-10
**状态**: draft

> 全站（后台 F-001 + 读者端 F-002）共用。风格参考 [潮流周刊 tw93](https://weekly.tw93.fun/posts/284)（见 [Backlog](../backlog/restyle-tw93-reference.md)）；设计稿变量在 [admin.pen](admin.pen)，实现时映射为 Tailwind CSS 4 `@theme` 变量。
> 主题：亮色 / 暗色，默认跟随系统（见 [全局 NFR](../product/nfr.md) §4）。
> 气质：像纸质读物，靠字体与留白撑起质感。**不使用**渐变、卡片阴影、emoji 装饰图标。例外：文字按钮 `Button` 的边缘流光 + 柔和投影（见下文"按钮质感"）；组图手风琴的底部渐变、面板投影与 3D 倾斜（见下文"组图手风琴"）；灯箱层叠卡片的投影与 3D 倾斜（见下文"灯箱层叠"）；组图网格卡片的浅渐变底与轻投影（见下文"组图网格"）；图片加载中的斜向扫光（见下文"图片加载"）；悬停提示的投影与弹出 / 滑动动效（见下文"悬停提示"）。

## 颜色

所有文字色在其可能出现的底色（`bg` / `surface` / `surface-sunken` / 对应 `*-soft`）上 ≥ 4.5:1，`input-border` 与 `focus` ≥ 3:1（WCAG AA，亮暗两套均已计算验证）。

| 令牌 | 亮色 | 暗色 | 用途 |
|------|------|------|------|
| `bg` | `#FFFFFF` | `#21262B` | 页面底色 |
| `surface` | `#FAFAFA` | `#2A3036` | 输入框、预览区、弹窗 |
| `surface-sunken` | `#F3F4F6` | `#1A1E22` | 分段控件底、标签块、空态底 |
| `ink` | `#262626` | `#E7E9EA` | 正文 |
| `ink-muted` | `#525252` | `#B4B9BE` | 次要文字、图标 |
| `ink-faint` | `#6B6B6B` | `#969CA3` | 提示、时间、占位、保存状态（仍是可读文字，非装饰） |
| `line` | `#E6E6E6` | `#3A4148` | 分隔线（纯结构，不承担识别） |
| `line-strong` | `#D4D4D4` | `#555555` | 次按钮描边、竖分隔 |
| `input-border` | `#8A8A8A` | `#737B84` | 输入框描边、取消按钮描边（≥ 3:1） |
| `focus` | `#8B6238` | `#E8A15A` | 键盘焦点环 |
| `accent` / `accent-ink` | `#8B6238` / `#FFFFFF` | `#E8A15A` / `#21262B` | 主操作、当前导航项、链接 hover（暖棕）/ 主按钮文字 |
| `accent-soft` | `#F5EDE4` | `#3A3026` | 主色浅底 |
| `ok` / `ok-soft` | `#3D6A2C` / `#E6EEDF` | `#9CC27F` / `#26332A` | 已发布、成功 |
| `warn` / `warn-soft` | `#85570C` / `#F6EBD3` | `#E3B65E` / `#3A3222` | 有未发布修改、本地恢复提示、警示类轻提示 |
| `danger` / `danger-ink` | `#A8382C` / `#FFFFFF` | `#EB8577` / `#21262B` | 删除、错误 / 危险按钮文字 |
| `danger-soft` | `#F8E1DD` | `#3D2725` | 错误提示浅底 |
| `button-fill` | `#18181B` | `#FFFFFF` 4% | `Button` 底色（亮色实心深色、暗色玻璃） |
| `button-ink` | `#FAFAFA` | `#F5F5F5` | `Button` 文字与图标 |
| `button-base` | `#3F3F46` | `#525252` | `Button` 边缘底线 |
| `specular-line` | `#FFFFFF` | `#FFFFFF` | `Button` 边缘流光 |

**图片浮层**（叠在照片上，亮暗主题取值相同）：

| 令牌 | 值 | 用途 |
|------|----|------|
| `overlay` | `#000000` 55% | LiveBadge、组图计数、`OverlayButton` 底（配背景模糊） |
| `overlay-ink` / `overlay-ink-inverse` | `#FFFFFF` / `#262626` | 浮层上的文字与图标 / `LiveBadge/Playing` 白底上的文字 |
| `overlay-ink-muted` | `#FFFFFF` 72% | 灯箱计数、操作提示 |
| `scrim` | `#0D0D0D` 95% | 灯箱底 |

- 亮色 `accent` 比参考站的 `#A67C52` 深一档：后者在白底仅 3.73:1，不满足文字与按钮 AA
- 强调色克制使用：主按钮、当前导航项、hover、焦点；正文链接默认与正文同色
- **禁止**在组件里写死颜色值（例如按钮文字写死成白色），一律引用令牌，保证暗色主题可用

## 字体

| 令牌 | 字体 | 用途 |
|------|------|------|
| `font-body` | 霞鹜文楷（LXGW WenKai），后备 `"STKaiti", "KaiTi", system-ui, sans-serif` | 界面文字：导航、按钮、表单、列表、目录、页脚 |
| `font-prose` | Noto Serif SC，后备 `"Source Han Serif SC", "Songti SC", SimSun, serif` | 文章区：正文、引用、首字下沉、日期等元信息（斜体） |
| `font-prose-heading` | Noto Sans SC，后备 `"PingFang SC", "Microsoft YaHei", system-ui, sans-serif` | 文章区：文章标题、H2–H4（加粗 700） |
| `font-mono` | JetBrains Mono，后备 `"SF Mono", Consolas, monospace` | Markdown 源码、slug、标签、代码块 |

- 文章区字体参考 [Innei 手记页](https://innei.in/notes/2026/8/24/midnight-memo-love-freedom-future)：宋体正文 + 黑体标题；界面外壳保持楷体
- "文章区" = 读者端 `ArticleHeader` / `ArticleContent` 与后台 `MarkdownPreview`（预览即所见）
- 文章正文行高 1.8、字间距 0.14px（`text-body` 在文章区内覆盖）
- 设计稿（Pencil 仅支持 Google Fonts）中 `font-body` 取值为 `LXGW WenKai TC`；代码实现使用简体版霞鹜文楷 webfont，字形一致
- 中文字体按 `unicode-range` 分片的 webfont 加载（`font-display: swap`），不整包下载
- 正文中文排版（中西文间距、标点挤压、标题间距）采用 heti（赫蹏）的规则

## 字号（按用途命名，不使用表外字号）

| 令牌 | 字号 | 行高 | 用途 |
|------|------|------|------|
| `text-caption` | 12px | 1.5 | 徽标、标签块、时间、字段提示、计数 |
| `text-meta` | 13px | 1.5 | 次要界面文字、代码块（预览） |
| `text-ui` | 14px | 1.6 | 默认界面文字、按钮、输入框（桌面） |
| `text-body` | 16px | 1.7 | 预览/读者端正文；**手机上所有输入框（含 Markdown 源码区）** |
| `text-title-sm` | 20px | 1.5 | 预览 H3、列表文章标题、抽屉/弹窗标题、后台站点名 |
| `text-title` | 24px | 1.4 | 预览 H2、空状态标题、手机写文章页标题 |
| `text-display` | 32px | 1.3 | 页面标题、写文章页标题、预览 H1、登录站点名 |

- 标题（`text-title-sm` 及以上）加粗，字间距 0.8px；标题上方留 28px、下方 13px（正文内）
- 手机（< 768px）输入框一律 16px，大屏再缩小（Tailwind 写法 `text-base sm:text-sm`），避免 iOS 聚焦时自动放大页面；不使用 `maximum-scale=1`
- 会变化的数字（保存时间、字数、摘要计数、列表数量）使用 `tabular-nums`

## 焦点与交互

| 项 | 规则 |
|----|------|
| 焦点环 | `:focus-visible` 时 2px `focus` 实线描边，外扩 2px（`outline: 2px solid; outline-offset: 2px`）；鼠标点击不显示；强制颜色模式下保留系统颜色 |
| 链接 | 默认无下划线；hover 时出现 1px 底边线（`border-block-end: 1px solid currentColor`） |
| 过渡 | 统一 `0.2s ease`，只过渡颜色、透明度、边框；例外：按钮边缘光跟随指针、按下缩放到 0.97（`0.25s`）；文章卡片 `PostCard` 悬停的双层错位（`transform` 位移 4px，`0.3s ease-out`）、动态照片播放时放大 1.06 倍（`0.3s ease-out`）、组图网格悬停聚光（见"组图网格"）、组图手风琴展开（见"组图手风琴"）、灯箱层叠切换（见"灯箱层叠"）、图片加载渐显（见"图片加载"）、悬停提示弹出与组内滑动（见"悬停提示"）、文章列表入场（行从下方 12px 缩放 0.8 弹入，弹簧曲线 620ms，逐行错开 50ms，只在列表首次进入视口及筛选 / 翻页后播放，见 components.md"列表动效参数"）、后台列表行滑动（跟手位移、松手弹簧 0.3s、删除块跃出、删除后高度折叠 200ms，见 components.md"行滑动参数"）；`prefers-reduced-motion` 时例外项都去掉位移 / 缩放，只保留颜色或透明度变化（按钮边缘光停在静止位置，列表入场只渐显、不错开，行滑动松手后 0.2s ease-out 归位、无回弹无跃出） |
| 可点区域 | 桌面 ≥ 28×28px；触屏 ≥ 44×44px（图标保持 16–20px，可点框扩大） |
| 轻提示 | 成功类 4 秒后自动消失（`role="status"`）；带撤销的（`Toast/Undo`）6 秒后消失，悬停或聚焦时暂停计时（`role="status"`）；错误类常驻，直到用户点 × 关闭或重新操作（`role="alert"`）；警示类（"做成了但打了折扣"，如实况视频被丢弃）同样常驻、可关闭，`role="status"` |

## 其他

| 令牌 | 值 | 说明 |
|------|----|------|
| `radius` | 8px | 按钮、输入框、图片；弹窗、文章卡片 12px；徽标全圆角；嵌套圆角遵循"外圆角 = 内圆角 + 内边距"（分段控件 8 = 5 + 3） |
| 间距 | 4 的倍数 | 常用 8 / 12 / 16 / 24 / 32 / 48 |
| 阴影 | 仅弹窗、下拉菜单、悬停提示、分段控件选中项、`Button`、组图网格卡片、组图手风琴面板与灯箱层叠卡片使用 | 克制，不做卡片阴影；分区靠 `line` 分隔线；按钮投影 `0 10px 24px -14px` 黑 45% |
| 正文版心 | 最宽 864px | 读者端文章页与后台预览区 |

## 按钮质感（SpecularButton）

`Button` 全部变体底层采用 React Bits SpecularButton（图标按钮 `IconButton`、`OverlayButton` 不采用，保持原样式）：按钮边缘有一圈细线，一道高光沿边缘移动。静止时高光停在左上角（亮度 35%），右下角有一道较弱的反光；指针进入 250px 内时高光移到离指针最近的边缘并增亮，按下时短暂加宽。参数见 [components.md](components.md)"按钮质感参数"。

| 项 | 规则 |
|----|------|
| 取色 | 6 个变体同一套：亮色为深色实心按钮，暗色为 4% 白色玻璃按钮（`button-fill` / `button-ink` / `button-base` / `specular-line`）；不使用 `accent`、`danger`。文字对比度：亮色 17.0:1；暗色在 `bg` 上 12.4:1、在 `surface` 上 10.8:1 |
| 边缘光 | 线宽 1.2px，`glow` 1，白色 |
| 投影 | 全部 `Button`（`0 10px 24px -14px` 黑 45%） |
| 降级 | WebGL 不可用时只保留底边线；`prefers-reduced-motion` 时高光不跟随指针、不缩放 |
| 设计稿 | Pencil 不能运行 WebGL，组件区用角向渐变描边画静止态（左上高光 + 右下反光） |

## 悬停提示（WarmTooltip）

写文章页只有图标的按钮，悬停或键盘聚焦时显示一个小提示：按钮名称，有快捷键时右侧加键帽。工具栏按钮共用一个提示框：第一次悬停等 400ms 弹出；提示开着时移到相邻按钮，提示框直接滑过去换文字。参数见 [components.md](components.md)"悬停提示参数"。

| 项 | 规则 |
|------|------|
| 取色 | 反色：底 `ink`、字 `bg`；键帽底为字色 9%、键帽字为字色 72%。暗色主题随令牌变成浅底深字。文字对比度：亮色 15.1:1，暗色 12.5:1 |
| 形状 | 圆角 `radius`（8px），带 8px 小箭头指向按钮；与按钮间距 8px；字号 `text-caption`（12px），字重 500 |
| 投影 | `0 1px 2px` 黑 12% + `0 8px 24px -8px` 黑 45%；高对比度模式改为 1px 描边 |
| 动效 | 弹出：从 0.94 倍、4px 模糊、向按钮方向偏 4px 渐显到原样，160ms；关闭 128ms；组内切换：提示框弹簧滑动 320ms，文字左右错开 10px 交叉淡入淡出 140ms |
| 触屏 | 长按 500ms 显示，不显示键帽；长按后不执行按钮操作，轻点照常执行 |
| 降级 | `prefers-reduced-motion` 时无缩放、模糊、滑动，直接出现在新位置 |
| 设计稿 | 组件区画出 `Tooltip`、`Tooltip/Shortcut` 静止态；03 写文章页在工具栏"加粗"下方放一个实例示意 |

## 图片加载（RefineFrame）

正文单图 `ArticleImage` 和组图网格单元格底层采用 React Bits RefineFrame：图片到达前先按宽高比占位，到达后从马赛克逐层变清晰。参数见 [components.md](components.md)"图片加载参数"。

| 项 | 规则 |
|----|------|
| 加载中 | `surface-sunken` 底 + 斜向扫光（`ink` 14% 的窄条，2.2s 一轮）；左下角状态标签"加载中" |
| 渐显 | 图片到达后从 48px 马赛克块逐层变到原图（共 9 层，约 1 秒），层与层之间有一道细白亮线从上往下扫过（12%–30% 透明度）；最后画布与原图交叉淡化 |
| 状态标签 | 高 26px 全圆角，`surface-sunken` 72% + 背景模糊，`ink` 字 12px，图标 13px（加载中图标旋转）；完成显示"已加载"，1.2 秒后淡出 |
| 失败 | 底色上的图片层压到 28% 透明度并模糊 2px；标签变"加载失败"（图标用 `danger`）；中间显示"重试"胶囊按钮（`ink` 14% 混入底色，悬停 20%） |
| 圆角 | `radius`（8px） |
| 降级 | `prefers-reduced-motion` 时无扫光、无马赛克、图标不旋转，只做透明度渐显 |
| 设计稿 | 画不出动画，`ArticleImage/Loading` 仍画"占位 + `surface-sunken` 底" |

## 组图手风琴（AccordionGallery）

`ImageGallery variant="accordion"` 底层采用 React Bits AccordionGallery（依赖 gsap）：一排面板，指针移入的那张展开到 52%，其余收起。参数见 [components.md](components.md)"组图手风琴参数"。

| 项 | 规则 |
|----|------|
| 取色 | 叠在照片上，亮暗主题一致：文字、图注竖条用 `overlay-ink`，压暗与底部渐变用 `scrim` 的底色 `#0D0D0D`；不使用 `accent`（在照片暗部对比度不足） |
| 收起面板 | 灰度 + 压暗 35% + 绕竖轴倾斜 8°，向展开项内侧倾；图片随展开轻微视差位移 |
| 展开面板 | 恢复彩色、平放；底部渐变（45% 处起，到底部 78%）上显示图注竖条与文字 |
| 投影 | 面板 `0 10px 30px -18px` 黑 80% |
| 过渡 | `0.6s`，gsap `power3.out`；图注竖条与文字错开 0.06s 出现 |
| 降级 | ≤ 520px 改为竖向条带、不倾斜；`prefers-reduced-motion` 时无过渡、无错开 |
| 设计稿 | Pencil 不能画 3D 倾斜，组件区只画展开 / 收起的平面状态（收起面板用饱和度混合层模拟灰度） |

## 组图网格（ChromaGrid）

`ImageGallery variant="grid"` 底层采用 React Bits ChromaGrid：平时彩色；鼠标移入组图后整组变灰、压暗，光标处一圈柔边聚光恢复彩色并跟随移动。参数见 [components.md](components.md)"组图网格参数"。

| 项 | 规则 |
|----|------|
| 卡片 | 每张图是一张卡片：内边距 8px、圆角 16px，底色为组件 `theme` 自带的极浅渐变（亮色白 → `#F6F6F8`，暗色 `#3A3644` → `#27242F`），1px 内描边 + 轻投影 `0 4px 10px -4px`（亮色黑 25%，暗色 70%） |
| 聚光 | 半径 260px，边缘柔化 0.6；聚光外灰度 100%、压暗 12%；跟随阻尼 0.45；离开后 0.6s 淡回彩色 |
| 主色 | 每张图的 `accent` 由上传时提取的图片主色决定（与模糊缩略图同一流程）；无主色时用 `#FFFFFF`。光标附近卡片的描边亮起主色，底部泛起主色微光（强度 0.5） |
| 触屏 | 不触发聚光，始终彩色 |
| 降级 | `prefers-reduced-motion` 时聚光直接跟随光标，无缓动 |
| 设计稿 | Pencil 不能做跟随遮罩，`ImageGallery/Grid/Hover` 用每张图上的径向饱和度渐变层模拟某一时刻的聚光 |

## 灯箱层叠（DepthCarousel）

`Lightbox` 中间内容区底层采用 React Bits DepthCarousel（依赖 gsap）：当前图在最前，后面的图沿纵深向右后方排开。参数见 [components.md](components.md)"灯箱层叠参数"。

| 项 | 规则 |
|----|------|
| 取色 | 叠在 `scrim` 上，亮暗主题一致：退远卡片的着色用 `scrim` 底色 `#0D0D0D`；自带箭头为半透明深色玻璃 + 白色 20% 描边（与 `OverlayButton` 同一视觉语言，不另做） |
| 层叠 | 每往后一张：后退 220px（手机 160）、右移 90px（手机 12）、绕竖轴转 22°、亮度降 20%、模糊递增（最远 6px）；最多可见 4 张 |
| 图片占比 | 当前图高度 = 视口高 − 180px（最高 760）；手机宽 = 屏宽 − 60px |
| 投影 | 卡片 `0 30px 60px -20px` 黑 65% + `0 8px 20px -10px` 黑 50% |
| 过渡 | 切换 `0.7s`，gsap `power3.out`；打开时直接定位、不播放切换动画 |
| 降级 | `prefers-reduced-motion` 时切换无动画 |
| 设计稿 | Pencil 不能画 3D 倾斜，组件区按透视缩放 + 压暗 + 模糊画静止态 |

## 文章状态配色（全站统一）

| 状态 | 徽标 |
|------|------|
| 草稿 | `surface-sunken` 底 + `ink-muted` 字 |
| 已发布 | `ok-soft` 底 + `ok` 字 |
| 已发布 · 有未发布修改 | `warn-soft` 底 + `warn` 字 |

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-10 | 初始版本（温暖纸感） | miraclehifi |
| 2026-10-10 | 界面审阅修复：`ink-muted`/`ink-faint`/`warn`/`ok` 提高对比度；新增 `input-border`、`focus`、`danger-ink`；字号收敛为 7 级；补焦点、可点区域、轻提示规则 | miraclehifi |
| 2026-10-10 | 风格改为参考 tw93 周刊：白底 + 暖棕强调色；全站霞鹜文楷，`font-serif`/`font-sans` 合并为 `font-body`；字号放大至 20/24/32、正文行高 1.7；圆角 8px；补链接、过渡、版心规则 | miraclehifi |
| 2026-10-12 | 新增"图片浮层"令牌（`overlay`、`overlay-ink`、`overlay-ink-inverse`、`overlay-ink-muted`、`scrim`）；过渡例外补动态照片与灯箱 | miraclehifi |
| 2026-10-10 | 文章区字体改为参考 Innei：新增 `font-prose`（Noto Serif SC）、`font-prose-heading`（Noto Sans SC）；文章正文行高 1.8；`font-body` 收窄为界面文字 | miraclehifi |
| 2026-10-12 | 新增"按钮质感"：`Button` 采用 SpecularButton 边缘流光（图标按钮除外），豁免"不用渐变 / 阴影"；新增 `specular-line`；过渡与阴影规则补按钮例外 | miraclehifi |
| 2026-10-12 | `Button` 配色改为 React Bits 预设：亮色深色实心、暗色白色玻璃，6 个变体同色；新增 `button-fill`、`button-ink`、`button-base` | miraclehifi |
| 2026-10-12 | 新增"灯箱层叠"：灯箱改用 React Bits DepthCarousel，豁免卡片投影与 3D 倾斜；去掉"灯箱打开时图片从原位置缩放"过渡 | miraclehifi |
| 2026-10-12 | 新增"组图手风琴"：组图横滑改用 React Bits AccordionGallery，豁免"不用渐变 / 卡片阴影"；阴影规则补手风琴面板 | miraclehifi |
| 2026-10-12 | 新增"组图网格"：组图网格悬停改用 React Bits ChromaGrid 聚光，豁免卡片浅渐变底与轻投影；过渡、阴影规则补网格例外 | miraclehifi |
| 2026-10-12 | "过渡"例外新增文章列表入场（React Bits AnimatedList 的 pop 弹入，逐行错开），减弱动效时只渐显 | miraclehifi |
| 2026-10-12 | 新增"图片加载"：正文图与组图网格改用 React Bits RefineFrame 马赛克渐显，豁免加载扫光渐变；"过渡"例外补图片加载 | miraclehifi |
| 2026-10-12 | 过渡例外补后台列表行滑动；轻提示补"带撤销"一类（6 秒、悬停暂停）（[Backlog](../backlog/swipe-row-actions.md)） | miraclehifi |
| 2026-10-12 | 新增"悬停提示"：写文章页图标按钮采用 React Bits WarmTooltip，反色配色；阴影、过渡规则补提示例外（[Backlog](../backlog/editor-warm-tooltip.md)） | miraclehifi |
| 2026-10-13 | 轻提示新增警示类（`warn-soft`，常驻）（F-001 US-11） | miraclehifi |
