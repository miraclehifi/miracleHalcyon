# implement-markdown-image-plugins: Markdown 图片插件（宽图、图注、组图结构）

**Sprint**: Sprint 3
**序号**: 2
**状态**: completed
**类别**: FRONTEND
**架构层级**: 领域层（`src/lib/markdown/` 同构渲染模块）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 按 markdown module-spec 补齐图片处理链：`parseImageKey`、`parseMarks`、`remarkImageGroups`（组图判定、9 张切组、手风琴 3–7 张）、`rehypeImageFigures`（sanitize 之后输出白名单 `data-*`、`figure` + `figcaption`）、`sourceMap` 时输出 `data-source-start` / `data-source-end`；`RenderResult` 返回 `images: ImageRef[]`。完成后预览中图注可见、宽图 / 组图带结构标记（无 JS 时即为可读的 `figure` + `img`）
- **影响范围**: `src/lib/markdown/render.ts`、`src/lib/markdown/plugins/`（新增 `image-groups.ts`、`image-figures.ts`、`image-key.ts`）、`sanitize-schema.ts`
- **不变量**: 已有 GFM、sanitize、代码块、`data-line`、上传占位块输出不变（`tests/unit/markdown/*` 保持通过）；Node 与 Worker 输出一致（MD-UT-06）
- **不在本任务**: React 组件挂载（add-article-image-display、add-image-gallery-display）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12 图片排版标记](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/behaviors.md) BH-01 – BH-06、BH-10 |
| 设计依据 | [markdown module-spec §1–§3](../../engineering/frontend/modules/markdown/module-spec.md) · [ADR-005](../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-126 / 127](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：`parseImageKey`、`parseMarks` | 单元 |
| 2 | UT-128 + UT-133：单图输出结构（`data-wide`、`figcaption`、alt）；`figure` 与 `[data-gallery]` 带源码偏移，`ImageRef` 与之对应 | 单元 |
| 3 | UT-129 / 130 / 131：组图判定矩阵、手风琴区间、超过 9 张切组 | 单元 |
| 4 | UT-132 + [TC-US12-08](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md)：标记与 title 中的注入内容被过滤，插件只输出白名单属性 | 单元 + 安全 |
| 5 | MD-UT-06：含图片、组图的样例在 Node 与 Worker 环境输出字节一致 | 单元 |

## DoD（完成定义）

### 实现类
- [x] module-spec §1 的 `ImageRef`、`parseImageKey`、`parseMarks` 导出；`renderMarkdown` 返回 `images`
- [x] 处理链：组图判定与 `rehypeImageFigures` 都在 sanitize 之后（偏离 module-spec 原定的 remark 阶段，原因见实现记录，module-spec 已同步）
- [x] `live` 只对站内 `/img/` 生效；输出 `src` 去掉片段

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`tests/unit/markdown/*`、`tests/unit/editor/scroll-sync.test.ts` 通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- 组图判定与 figure 输出合并为一个 rehype 插件 `plugins/image-figures.ts`，放在 sanitize 与上传占位之后：sanitize 会去掉 remark 阶段打在节点上的 `data-*`，在其后生成则只有插件写的白名单属性（作者手写的 `data-gallery` 等已被过滤）。hast 保留了 mdast 的源码偏移，`data-source-start` / `end` 与 `ImageRef` 直接取自图片节点位置
- 只处理 Markdown 语法的图片（源码偏移处为 `!`）；原始 HTML 中的 `<img>`、链接里的图片、紧凑列表项里的图片保持原样
- 混有文字的段落：独占一行（前后紧邻换行或段落边界）的图片拆出为单图，行内图片留在段落里，段落首尾空白去掉（TC-US12-05 情况 1"见下图"+ 两张图 → 两张单图）
- `live` 只对 `/img/` 开头的站内地址生效；输出 `src` 去掉片段；整段只有一个结构时沿用段落位置，`data-line` 与之前一致
- MD-UT-06：jsdom 单元测试写出 `__snapshots__/images-sample.html`，workerd 集成测试读取同一文件逐字节比对（浏览器 Web Worker 的同构性由 ADR-001 spike 与预览 E2E 覆盖）
- 观察：一批上传的占位以单个换行连接，全部完成后这批图片在同一段落，按 ADR-005 显示为组图网格

## 依赖

无

## 影响的文件

- `src/lib/markdown/render.ts`
- `src/lib/markdown/plugins/image-key.ts`、`image-figures.ts`（新建）
- `tests/unit/markdown/image-plugins.test.ts`、`isomorphic.test.ts`、`tests/integration/markdown/isomorphic.test.ts`、`tests/fixtures/markdown/images-sample.md`（新建）

## 回滚策略

从处理链移除两个插件、回退新增文件；渲染输出回到普通 `img`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [markdown module-spec](../../engineering/frontend/modules/markdown/module-spec.md) | §2 处理链、§3 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
