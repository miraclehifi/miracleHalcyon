# Sprint 3：图片增强

**状态**: in_progress
**创建**: 2026-10-14
**Feature**: F-001 文章写作（[Backlog: article-writing](../../backlog/article-writing.md)）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：作者能直接拖入 HEIC、iPhone 实况照片（HEIC + MOV）和安卓动态照片；预览中图片按读者端组件显示（宽图、图注、组图网格 / 手风琴、实况照片悬停 / 长按播放、马赛克渐显）；能用图片菜单改写排版标记，并查看图片写法说明。
> 粒度按项目规则 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)：一个任务 = 一个可演示的功能点，可跨层，带测试清单（2–5 项）。顺序 = 依赖拓扑排序，同层按（被依赖数 × 不确定性）降序。
> Sprint 2 的 code-review 延后进行（2026-10-14 作者决定），不阻塞本 Sprint。

## 任务索引

| # | Task | 名称 | 来源 PBI | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|---------|------|---------|----|------|---------|---------|------|
| 1 | [spike-browser-media-processing](spike-browser-media-processing.md) | 浏览器端媒体处理验证（spike） | article-writing | SETUP | 表现层（spike） | US-11 | — | 2 | 高 | completed |
| 2 | [implement-markdown-image-plugins](implement-markdown-image-plugins.md) | Markdown 图片插件（宽图、图注、组图结构） | article-writing | FRONTEND | 领域层（markdown） | US-12 | — | 1（间接 6） | 中 | completed |
| 3 | [implement-live-photo-upload-api](implement-live-photo-upload-api.md) | 上传接口支持实况视频 | article-writing | API | 领域 + 数据 + 接口 | US-11 | — | 1 | 低 | completed |
| 4 | [add-article-image-display](add-article-image-display.md) | 预览单图 `ArticleImage`（宽图、图注、马赛克渐显） | article-writing, image-refine-loading | FRONTEND | 表现层 | US-12 | implement-markdown-image-plugins | 3 | 中 | completed |
| 5 | [add-heic-upload](add-heic-upload.md) | HEIC 转换、主色与"处理中"占位 | article-writing | FRONTEND | 表现层 | US-11 | spike-browser-media-processing | 1 | 中 | pending |
| 6 | [add-live-photo-pair-upload](add-live-photo-pair-upload.md) | 同名配对上传实况照片 | article-writing | FRONTEND | 表现层 | US-11 | spike-browser-media-processing, implement-live-photo-upload-api, add-heic-upload | 1 | 高 | pending |
| 7 | [add-motion-photo-detection](add-motion-photo-detection.md) | 安卓动态照片识别 | article-writing | FRONTEND | 表现层 | US-11 | add-live-photo-pair-upload | 0 | 中 | pending |
| 8 | [add-image-gallery-display](add-image-gallery-display.md) | 预览组图 `ImageGallery`（网格、手风琴） | article-writing | FRONTEND | 表现层 | US-12 | add-article-image-display | 2 | 中 | completed |
| 9 | [add-live-photo-playback](add-live-photo-playback.md) | 预览实况照片播放与 `LiveBadge` | article-writing | FRONTEND | 表现层 | US-11 | add-article-image-display, add-image-gallery-display | 0 | 中 | pending |
| 10 | [add-single-image-menu](add-single-image-menu.md) | 单图菜单切换宽图 | article-writing | FRONTEND | 表现层 | US-12 | add-article-image-display | 1 | 中 | pending |
| 11 | [add-gallery-menu](add-gallery-menu.md) | 组图菜单与手机点按 | article-writing | FRONTEND | 表现层 | US-12 | add-image-gallery-display, add-single-image-menu | 0 | 低 | pending |
| 12 | [add-image-syntax-help](add-image-syntax-help.md) | 底栏"图片写法"说明 | article-writing | FRONTEND | 表现层 | US-12 | — | 0 | 低 | pending |
| 13 | [raise-image-size-limit](raise-image-size-limit.md) | 图片上传上限放宽到 50MB（2026-10-14 插入） | raise-image-size-limit | API + FRONTEND | 数据 + 领域 + 接口 + 表现 | US-05 | — | 0 | 低 | completed |
| 14 | [fix-jpeg-sniff-large-metadata](fix-jpeg-sniff-large-metadata.md) | 元数据超过 64KB 的 JPEG 可上传（Bug，2026-10-14 插入） | sniff-jpeg-large-metadata | API | 领域层 | US-05 | — | 0 | 低 | completed |

共 12 个任务：spike 1、接口 / 后端 1、前端 10。执行顺序按本表序号。US-11 拆 5 个、US-12 拆 6 个，超过"一个 US 拆 1–3 个"的参考量级——两个 US 各有 25、18 条验收用例和 7、15 条单元用例，按"测试超过 5 项即拆分"拆出。

## 依赖图

```
spike-browser-media-processing ─┬─▶ add-heic-upload ─▶ add-live-photo-pair-upload ─▶ add-motion-photo-detection
                                └───────────────────────────▲
implement-live-photo-upload-api ────────────────────────────┘

implement-markdown-image-plugins ─▶ add-article-image-display ─┬─▶ add-image-gallery-display ─┬─▶ add-live-photo-playback
                                                               │                             └─▶ add-gallery-menu
                                                               ├─▶ add-live-photo-playback（同时依赖上面两者）
                                                               └─▶ add-single-image-menu ─▶ add-gallery-menu（同时依赖 gallery-display）

add-image-syntax-help（独立）
```

上传链路（1、3、5、6、7）与预览显示链路（2、4、8、9、10、11）互相独立；两条链在 E2E 里通过 R2 预置夹具解耦，不需要真实上传。

## ⚠️ 前置确认项汇总

| 任务 | 事项 |
|------|------|
| spike-browser-media-processing | ✅ 2026-10-14：安卓样本改用 OPPO 动态照片（保留原始 EXIF，不去 GPS）；iPhone 暂不考虑，spike 只验证视频处理与 OPPO 切视频 |
| add-heic-upload、add-live-photo-pair-upload | ⏳ iPhone 样本（HEIC + MOV、单张 HEIC）到位前，HEIC 解码与 `heic-to` 的验证（原 spike 假设 ①）未做；开始这两个任务前需作者提供样本或确认改用公开样本 |
| add-article-image-display | ✅ 2026-10-14：RefineFrame 取自 React Bits 仓库 `src/ts-tailwind/Micro/RefineFrame`，许可证 MIT + Commons Clause（同 SwipeRow）；ChromaGrid、AccordionGallery 同仓库同许可证（2026-10-15 add-image-gallery-display 核对） |
| add-image-syntax-help | 手机设置面板形态（页面规格"Sprint 3 前再定"）：默认按现状右侧抽屉铺满，把入口放在最下方 |

## US 覆盖（Sprint 3 范围）

| US | Sprint 3 覆盖 | 留到后续 |
|----|--------------|---------|
| US-11 | 上传接口视频字段；HEIC 转换、主色、处理中占位；同名配对、视频转码 / 转封装、降级警示、失败不留半对；安卓动态照片；预览悬停 / 长按播放与失败降级 | TC-US11-21（性能）放 Sprint 末 verify；iOS 快捷指令（[ios-live-photo-shortcut](../../backlog/ios-live-photo-shortcut.md)，idea） |
| US-12 | 图片插件；`ArticleImage`（宽图、图注、RefineFrame）；`ImageGallery`（网格、手风琴）；单图 / 组图菜单与撤销；手机点按；图片写法说明 | — |

## 跨 Feature 影响

| 影响 | 本 Sprint 处理 |
|------|---------------|
| `ArticleImage`、`ImageGallery`、`LiveBadge` 供 F-002 读者页复用 | 放在 `src/components/article/`，要求可构建时预渲染（无 `window` 依赖），点击行为（`onItemClick` / `onActiveClick`）预览中不传，留给 F-002 的 `Lightbox` |
| markdown 图片插件的输出结构供 F-002 构建时渲染 | 同构模块，Node 与 Worker 输出一致（MD-UT-06） |
| [article-image-display](../../backlog/article-image-display.md)（triaged，读者端灯箱等） | 本 Sprint 不做灯箱；完成后该条目中"预览 / 组件"部分可勾选 |

## DoD（Sprint 级）

- [ ] 所有任务状态为 completed
- [ ] `npm test` 与 `npm run test:e2e` 全部通过（Sprint 末跑一次）
- [ ] ⚠️ 前置确认项全部有结论，并同步到对应文档
- [ ] 设计文档已反哺"已实现"标记；[image-refine-loading](../../backlog/image-refine-loading.md) 验收项已勾选
