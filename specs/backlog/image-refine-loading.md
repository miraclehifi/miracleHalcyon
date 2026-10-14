# 文章图片加载改用 RefineFrame 马赛克渐显

| 字段 | 值 |
|------|-----|
| 状态 | ready |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

文章图片加载时改用 [React Bits RefineFrame](https://reactbits.dev)（TypeScript + Tailwind 版）：先预留图片宽高比，加载中有斜向扫光和"加载中"标签；图片到达后从粗马赛克逐层变清晰，一道细亮线从上往下扫过；完成后标签淡出；失败时变暗并显示"重试"按钮。替换 [article-image-display](article-image-display.md) 里原定的"底色 / 模糊缩略图 + 淡入"。RefineFrame 只作底层组件，页面不直接引用。

## 目标与验收

**目标**: 图片加载有统一的渐显效果，不跳动；同时遵守现有令牌、亮暗主题、无障碍和减弱动效规则。

**验收条件**:
- [x] [components.md](../ui/components.md) 写明 `ArticleImage`、`ImageGallery` grid 底层用 RefineFrame，以及参数对照和需要改的源码
- [x] [design-tokens.md](../ui/design-tokens.md) 新增"图片加载"规则，"气质"与"过渡"补加载扫光例外，写明减弱动效时怎么降级
- [x] 读屏读到的是图片 `alt`，不是"加载中 / 已加载"；只有加载失败时播报
- [x] 重试按钮有项目统一的焦点环，触屏可点区域 ≥ 44px；点重试后重新请求图片
- [x] `prefers-reduced-motion` 时不出马赛克、扫光，只做透明度渐显
- [x] 不引入 `@hugeicons/*`，图标用 lucide

## 影响分析

- **影响范围**: `specs/ui/components.md`、`specs/ui/design-tokens.md`；implement 阶段新增 `RefineFrame` 底层组件，并改 `ChromaGrid` 源码（图片区可替换）
- **设计稿**: [admin.pen](../ui/admin.pen) 本次不改。`ArticleImage/Loading` 仍是"预留宽高比 + `surface-sunken` 底"，动画和标签画不出静态稿；F-002 design-ui 时视需要补"加载中 / 失败"两个静态状态
- **依赖项**: 无新增依赖（原组件依赖 `@hugeicons/react`、`@hugeicons/core-free-icons`，改用项目已用的 lucide）
- **被依赖**: F-001 design-arch（前端组件结构、图片上传数据）、F-002 design-ui（`pages/post-detail.md` 沿用本条）
- **决策**（2026-10-12 与作者确认）:
  - 范围：正文单图 `ArticleImage`（含动态照片、宽图的静态图）和组图网格单元格。文章卡片封面、灯箱、组图手风琴不改
  - 状态标签和失败重试都保留：标签用中文，完成 1.2 秒后淡出；失败显示"重试"

## 待 design-arch 解决

- **SSR / 缓存命中**：Astro 预渲染的 `<img>` 在 hydrate 前就开始加载，hydrate 时可能已加载完，组件会照样从马赛克播一遍。需要决定：hydrate 前是否先隐藏图片（JS 晚到会空白，要 `<noscript>` 兜底），已在缓存中的图片是否跳过动画
- **模糊缩略图**：加载态不再显示 `placeholder`。组图网格的主色 `accent` 仍走上传时同一流程；`placeholder` 字段是否保留、要不要改成画布背景，随图片数据模型一起定
- **跨域画布**：马赛克用 canvas 绘制，图片若放在 R2 自定义域名下（与站点不同源），只画不读不会出错；如果以后要读像素（如取主色），需要 R2 配 CORS 并给 `<img>` 加 `crossOrigin`
- **多实例开销**：每张图生成 9 层离屏画布（最大 2 倍像素密度），长文多图时内存偏高。方向：只在进入视口时挂载效果（配合 `loading="lazy"`），播完释放离屏画布

## 估算

- **规模**: S

## 备注

- 当前处于 F-001 `ui_design` 阶段，本条先更新设计规格；代码在 plan-tasks 之后按 Sprint 任务实现
