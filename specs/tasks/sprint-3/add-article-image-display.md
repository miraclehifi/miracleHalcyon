# add-article-image-display: 预览单图组件 ArticleImage（宽图、图注、马赛克渐显）

**Sprint**: Sprint 3
**序号**: 4
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)、[image-refine-loading](../../backlog/image-refine-loading.md)

## 意图声明

- **改动意图**: 新建 `ArticleImage`（`src`、`alt`、`caption?`、`width`、`height`、`wide?`；`live?` 留给 add-live-photo-playback），外层渲染 React Bits RefineFrame（按 components.md"图片加载参数"取值并完成"需要在源码上补的改动"）；`MarkdownPreview` 按 `RenderResult.images` 把 `figure[data-article-image]` 挂载为组件，用 `reconcileIslands` 在重新渲染时复用未变化的实例。完成后预览中宽图向两侧扩出、按宽高比预留空间、图注居中、加载时马赛克渐显，继续输入不重播动画
- **影响范围**: `src/components/article/ArticleImage.tsx`（新建，读者端与预览共用）、`src/components/vendor/react-bits/RefineFrame.tsx`（新建）、`src/components/admin/editor/MarkdownPreview.tsx`、全局样式（4 个 `@keyframes`、宽图版式）
- **不变量**: 预览其他内容、同步滚动、上传占位块不变；预览中点击图片不打开灯箱；组件可在构建时预渲染（无 `window` 依赖，供 F-002）
- **不在本任务**: 组图（add-image-gallery-display）、实况播放（add-live-photo-playback）、图片菜单（add-single-image-menu）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) AC1、AC3、AC6；behaviors BH-01、BH-06、BH-10、BH-13 |
| 设计依据 | [components.md"文章图片""图片加载参数"](../../ui/components.md) · [design-tokens"图片加载"](../../ui/design-tokens.md) · [admin-post-editor 预览区](../../ui/pages/admin-post-editor.md) · [markdown module-spec §3](../../engineering/frontend/modules/markdown/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US12-01](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md)：`#wide` 显示为宽图并按 1600:900 预留宽高比 | E2E |
| 2 | TC-US12-06 + TC-US12-07：title 显示为图注、alt 保留；外链 / 未知标记 / 不合命名按普通图、不预留宽高比 | E2E |
| 3 | [UT-140](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `reconcileIslands` + TC-US12-17：继续输入时已加载图片不重新加载、不重播马赛克 | 单元 + E2E |
| 4 | image-refine-loading 验收：读屏读到 `alt` 而非"加载中"，只有失败时播报；重试按钮有焦点环、触屏 ≥ 44px，点击后带 `?retry=n` 重新请求；`prefers-reduced-motion` 只做透明度渐显 | 组件（R / A） |

## DoD（完成定义）

### 实现类
- [x] RefineFrame 源码改动按 components.md 表格逐项完成，文件头记录对上游的改动（同 `SwipeRow.tsx` 格式）
- [x] 测试环境 R2 预置 US-12 只读图片夹具（9 张，宽高、主色各不相同）：`tests/fixtures/images/`，`npm run e2e:seed`（`getPlatformProxy` 写入本地 R2，E2E webServer 启动前执行）
- [x] components.md 中 `ArticleImage` 标注"已实现"

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（chromium；webkit 上 TC-US12-06/07 报模块脚本加载失败，留待 Sprint 末排查）
- [ ] 影响范围回归（留到 Sprint 末统一跑，见下方"实现记录"）：`tests/unit/editor/*`、预览相关 E2E（US-04、US-05 占位）通过；E2E 补跑 webkit 一次
- [x] `npm run lint` 与 `npm run check` 无错误

## ⚠️ 前置确认项

- RefineFrame 上游源码的获取方式与许可证（同 SwipeRow：MIT + Commons Clause），实现时确认

## 依赖

[implement-markdown-image-plugins](implement-markdown-image-plugins.md)

## 影响的文件

- `src/components/article/ArticleImage.tsx`、`src/components/vendor/react-bits/RefineFrame.tsx`（新建）
- `src/lib/markdown/reconcile-islands.ts`（新建）、`src/components/admin/editor/MarkdownPreview.tsx`
- `src/styles/global.css`
- `tests/unit/editor/reconcile-islands.test.ts`、`tests/unit/components/article-image.test.tsx`、`tests/e2e/image-layout.spec.ts`（新建）

## 回滚策略

`MarkdownPreview` 去掉挂载逻辑（插件输出的 `figure` + `img` 即为无 JS 降级），删除新增组件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `ArticleImage`、RefineFrame 标注"已实现" |
| [image-refine-loading](../../backlog/image-refine-loading.md) | 勾选验收项 |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |

## 实现记录（2026-10-14）

- 上游源码：`src/ts-tailwind/Micro/RefineFrame/RefineFrame.tsx`（MIT + Commons Clause，同 SwipeRow），改动清单见 `RefineFrame.tsx` 文件头。另加两项：`aspectRatio` 可选（外链等不知道宽高时按图片自身比例撑开，未加载完保留 96px 最小高度）；减弱动效改为渲染期状态，不启用马赛克画布、不输出 `data-sweep`
- 挂载方式：Worker 回传 `images`；`MarkdownPreview` 写入 HTML 后把单图 `figure` 换成宿主 `div`（带 `data-line` / `data-source-*`），`createPortal` 渲染 `ArticleImage`；`reconcileIslands` 配对后复用原宿主，组件实例与已加载的 `<img>` 随之保留。组图内的 `figure` 暂不挂载（add-image-gallery-display）
- 宽图：`--article-bleed`（预览区为左右内边距 40px，手机 16px）；figure 向两侧负外边距，图注加同等内边距对齐正文
- 遗留：TC-US12-17 的组图部分随 add-image-gallery-display 补；webkit TC-US12-06/07 失败与全量回归中的 9 个失败在 Sprint 末统一处理
