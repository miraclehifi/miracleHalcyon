# 文章页图片展示（含动态照片）

| 字段 | 值 |
|------|-----|
| 状态 | triaged |
| 类型 | Feature 增量 |
| 优先级 | P1-High |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

文章详情页的图片展示需要优化，并支持动态照片（Live Photo：一张静态图 + 一段约 3 秒的短视频）。先设计图片展示组件（设计稿 + 组件清单），正式规格随 F-002 design-ui 补齐。

## 目标与验收

**目标**: 读者在文章页看图舒服：不跳动、能放大、多图排得开；动态照片像在 iOS 相册里一样可以按住看动起来。

**作者取舍（2026-10-12）**:

| 事项 | 决定 |
|------|------|
| 动态照片交互 | 仿 iOS 相册：默认显示静态图，左上角 `LIVE` 标记；桌面悬停播放，手机长按播放，松开 / 移出回到静态图；静音、播一次 |
| 灯箱 | 点击图片全屏查看，可左右切换文中所有图片，手机下滑关闭；动态照片在灯箱内同样可播放 |
| 图注 | 图片下方居中，取 Markdown 的 title（没有则不显示；alt 只作无障碍文本） |
| 加载占位 | 预留宽高比，加载前显示模糊缩略图或 `surface-sunken` 底色，加载完淡入 |
| 加载占位 → 马赛克渐显（2026-10-12） | 正文单图与组图网格单元格改用 React Bits RefineFrame：加载中扫光 + 状态标签，到达后马赛克逐层变清晰，失败可重试；不再显示模糊缩略图。见 [image-refine-loading](image-refine-loading.md) |
| 多图 | 连续多张图可排成 2–3 列网格，或手风琴组图（3–7 张） |
| 组图网格悬停 → 彩色聚光（2026-10-12） | 网格组图改用 React Bits ChromaGrid（TS + Tailwind，无额外依赖）：平时彩色，鼠标移入后整组变灰、光标处聚光恢复彩色（改源码实现"仅悬停生效"）；触屏不触发。参数与源码改动见 [components.md](../ui/components.md)"组图网格参数" |
| 灯箱 → 层叠卡片（2026-10-12） | 灯箱中间改用 React Bits DepthCarousel（TS + Tailwind，依赖 gsap），灯箱外壳（scrim、计数、关闭、图注、下滑关闭）保留；因 3D 层叠，**去掉手机双指缩放 / 双击放大**和"从原位置缩放打开"。参数与需补的源码改动见 [components.md](../ui/components.md)"灯箱层叠参数" |
| 组图横滑 → 手风琴（2026-10-12） | 原"横向滑动组图"改用 React Bits AccordionGallery（TS + Tailwind，依赖 gsap）；参数与需补的源码改动见 [components.md](../ui/components.md)"组图手风琴参数"，视觉豁免见 [design-tokens.md](../ui/design-tokens.md)"组图手风琴" |
| 宽度 | 默认与正文同宽；可标记为宽图，向两侧扩出纸张内边距 |

**验收条件**:
- [x] [admin.pen](../ui/admin.pen) 组件区新增图片展示组件及其状态变体（静态 / 动态照片静止 / 播放中 / 加载中 / 宽图 / 组图 / 灯箱，含手机形态）
- [x] [components.md](../ui/components.md) 登记组件名、Props、使用位置
- [x] 05 / 05m 文章详情稿正文插入 `ArticleImage/Live` 实例（原稿无图片）

## 去向（2026-10-12）

F-001 design-arch 决定：实况照片上传、宽图 / 组图写法与预览中的图片组件**在 F-001 全做**——转为 [US-11 live-photo-upload](../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md)、[US-12 image-layout-marks](../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md)；写法见 ADR-005，上传处理见 ADR-006（参考 Afilmory，浏览器端转换）。灯箱与文章详情页仍归 F-002。

## 影响分析

- **影响范围**: `specs/ui/admin.pen`（组件区、05 / 05m）、`specs/ui/components.md`、`specs/ui/design-tokens.md`（如需新增动效 / 遮罩规则）
- **跨 Feature**:
  - F-002：文章详情页渲染，组件本身归 F-002
  - F-001：上传需支持动态照片（静态图 + mov/mp4 视频成对上传，或 HEIC 拆分），并扩展 NFR 中"仅允许 png/jpg/webp/gif、≤ 5MB"的限制；Markdown 中如何表示动态照片 / 宽图 / 组图的写法需在 F-001 design-arch 时定
  - 图片尺寸、模糊缩略图与主色（组图网格聚光用）需在上传时生成并存储（影响 post / 图片数据模型）
- **新增依赖**: `gsap`（AccordionGallery、DepthCarousel 使用），在 F-002 design-arch 时登记到技术选型；组件源码在 implement 阶段按 Sprint 任务引入，不提前放入仓库
- **决策**: 与 05 文章详情一样作为先行稿，不等 F-002 define-feature；设计中的写法约定为待定项

## 估算

- **规模**: M（设计部分）
