# add-preview-scroll-sync: 编辑区与预览同步滚动

**Sprint**: Sprint 2
**序号**: 14
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（markdown `line-map` 插件 + `src/lib/editor/scroll-sync.ts`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 并排视图下滚动编辑区，预览滚到对应位置（反之亦然）；渲染结果带 `data-line`，源码侧用隐藏镜像元素算每行 `offsetTop`，按行插值，50ms 互斥锁防回声
- **影响范围**: `src/lib/markdown/plugins/line-map.ts`（新建）、`render.ts`、`src/lib/editor/scroll-sync.ts`（新建）、`MarkdownEditor.tsx`、`MarkdownPreview.tsx`
- **不变量**: 预览 HTML 除 `data-line` 外不变；`data-line` 在 sanitize schema 白名单中，读者端输出一致（TC-US04-06 保持通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04 Markdown 预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) |
| 设计依据 | [editor module-spec §3"同步滚动"](../../engineering/frontend/modules/editor/module-spec.md) · [markdown module-spec](../../engineering/frontend/modules/markdown/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | 行映射：渲染结果块级元素带正确 `data-line`；给定源码行与两侧行位置表，插值得到预期 scrollTop | 单元 |
| 2 | [TC-US04-14](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md)：编辑区滚动时预览同步滚动 | E2E |

## ⚠️ 前置确认项

- [UT-53](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) 写的是按标题映射 `mapScrollToHeading`，editor module-spec §3（更新）写的是按 `data-line` 逐行插值。本任务按 module-spec 实现，完成后把 UT-53 改成行映射用例（测试清单 #1）

## DoD（完成定义）

### 实现类
- [x] `line-map` 插件 + 滚动同步模块，仅并排视图启用
- [x] UT-53 描述同步为行映射

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`（含 `tests/unit/markdown/*` 快照）、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- 插件按 markdown module-spec 命名为 `rehypeSourceLines`（任务里写的 `line-map`），文件 `src/lib/markdown/plugins/source-lines.ts`，分两步：sanitize 之后记下顶层元素起始行（`Mark`），Expressive Code 之后按顺序写回 `data-line`（`Apply`）——EC 会把顶层 `<pre>` 换成新的外层 div，直接标在 `pre` 上会丢；顶层元素数量对不上时不标。开关经 `file.data.sourceMap` 传入（处理器共用）；不需要改 sanitize schema（在 sanitize 之后加，作者写的 `data-line` 已被去掉）。读者端不传 `sourceMap`，输出逐字节不变（快照未变）
- Worker 渲染预览时传 `sourceMap: true`
- `src/lib/editor/scroll-sync.ts`：`scrollPairs`（锚点 + 首尾配对，丢掉越界与不递增的点）、`interpolate`（分段线性，双向）、`useScrollSync`（滚动时才测量并缓存；MutationObserver / ResizeObserver / input / 图片 load 时失效）。编辑区行位置用 `textarea-mirror.ts` 新增的 `lineTops`
- 仅 `view.mode === "split"` 启用；双向同步（滚预览，编辑区跟随，不动光标）
- 偏差：防回声没有用 50ms 互斥锁，改为"记下写给另一侧的 scrollTop，那一侧下一次滚动事件落在该值上就忽略"。定时锁会吞掉锁期内作者对另一侧的真实滚动（E2E 在负载下复现过）
- 顺带修复：`tests/e2e/support/post-list.ts` 的 `entranceDone` 等待被取消的动画时 `finished` 以 AbortError 拒绝，导致 webkit TC-US09-14 偶发失败；改为忽略拒绝
- 测试：`tests/unit/editor/scroll-sync.test.ts`（data-line 位置、无 sourceMap 时输出不变、原始 HTML 的 data-line 被去掉、插值与比例映射）；`tests/e2e/editor-scroll-sync.spec.ts`（TC-US04-14：第 3 / 10 个标题、回顶、反向同步不动光标、切换视图后仍生效）

## 依赖

[add-editor-view-modes](add-editor-view-modes.md)

## 影响的文件

- `src/lib/markdown/plugins/line-map.ts`（新建）、`src/lib/markdown/render.ts`、`sanitize-schema.ts`
- `src/lib/editor/scroll-sync.ts`（新建）、`MarkdownEditor.tsx`、`MarkdownPreview.tsx`
- `tests/unit/editor/scroll-sync.test.ts`、`tests/e2e/editor-scroll-sync.spec.ts`（新建）

## 回滚策略

回退新增 / 修改的文件；gfm 快照恢复

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| editor module-spec §3、frontend-unit-tests UT-53 | 标注"已实现"、用例描述同步 |
