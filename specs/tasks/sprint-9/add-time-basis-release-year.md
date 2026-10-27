# add-time-basis-release-year: "按时间"可选发行年份，游戏悬停显示年份

**Sprint**: Sprint 9
**序号**: 15
**状态**: completed（2026-10-27）
**类别**: FRONTEND
**架构层级**: 表现层（reader：`src/components/reader/`、`src/lib/reader/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-time-basis](../../backlog/media-time-basis.md)

## 意图声明

- **改动意图**:
  - `shelf-time.ts` 新增 `groupByReleaseYear`（[module-spec](../../engineering/frontend/modules/reader/module-spec.md) §2）
  - 新建 `MediaTimeBasis.tsx`（两项分段切换，文案随分类）、`YearBadge.tsx`
  - `MediaPosterWall`：状态由布尔改为 `off` / `marked` / `release`，`localStorage` `media:by-time` 存 `"0"` / `"marked"` / `"release"`（旧值 `"1"` → `marked`）；打开时把 `MediaTimeToggle` 与 `MediaTimeBasis` 一起经 `createPortal` 挂到槽位；按依据选 `groupByTime` 或 `groupByReleaseYear`
  - `MediaPoster` 游戏模式：右下角 `YearBadge`（无 `year` 不渲染）；翻面控件 `aria-label` 加年份
- **影响范围**: 电影、剧集、游戏三个海报墙页的"按时间"行为；书、漫画、桌游不变
- **不变量**: "按时间"默认关闭；打开后默认标记时间，行为与原来一致；无 JS 静态网格不变
- **不在本任务**: 电影、剧集悬停加年份（作者只要求游戏）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) AC13、AC14；BH-20、21、23 |
| 设计依据 | [reader-media.md](../../ui/pages/reader-media.md)"按时间分段"（按标记时间 / 按发行年份）、"游戏海报墙" · [components.md](../../ui/components.md) `MediaTimeBasis`、`YearBadge` · admin.pen 09d 工具栏、09g、组件区 Row 7 |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-20 `groupByReleaseYear`——`tests/unit/reader/shelf-time.test.ts` | 单元 |
| 2 | UT-16（依据切换与存储值）、UT-18（`YearBadge`、游戏 `aria-label`）——`tests/unit/reader/media-poster-wall.test.tsx` | 单元 |
| 3 | TC-US03-24（游戏与电影切换依据、刷新保留、旧值兼容）——`tests/e2e/reader-media.spec.ts` | E2E |
| 4 | TC-US03-20 回归（默认标记时间行为不变）、TC-US03-22 年份徽标断言——同文件 | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 09d 工具栏、09g、Row 7 一致
- [x] 测试清单全部由红变绿；`tests/e2e/reader-media.spec.ts` 全部用例 chromium 通过，本任务 E2E 补跑 webkit

## 依赖

14（游戏海报墙）

## 影响的文件

- `src/lib/reader/shelf-time.ts`、`src/components/reader/{MediaPosterWall,MediaPoster,MediaTimeToggle}.tsx`（改）、`src/components/reader/{MediaTimeBasis,YearBadge}.tsx`（新建）
- `tests/unit/reader/{shelf-time.test.ts,media-poster-wall.test.tsx}`、`tests/e2e/reader-media.spec.ts`（改）

## 实现记录（2026-10-27）

- `MediaPosterWall` 状态为 `mode`（`off` / `marked` / `release`）+ 记住上次依据的 `basis`：关闭再打开"按时间"沿用上次依据；依据切换只在打开时渲染
- `MediaTimeBasis` 未复用 `SegmentedControl`：规格要求高 30、项内边距 0 10、选中 `bg` 底，与基础分段控件尺寸不同；标记时间文案取 `statusLabel(type, "completed") + "时间"`
- `MediaPoster` 悬停层改为 `inset-0` 容器，平台（`[data-hover-platform]`，左上 10）与年份（`[data-hover-year]`，右下 10）各自定位
- 手机端标题行放不下"计数 + 按时间 + 依据切换"（约 430 > 358），`MediaHeader` 右侧与槽内容器允许换行（右对齐），TC-US03-24 断言 390 宽无横向滚动
- 夹具"断链游戏"年份补为 2023（TC-US03-24 前置条件：2023 段 3 款）

## 回滚策略

git 还原；`localStorage` 新值在旧代码中按"非 `"1"`"即关闭处理，不会出错

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader-media.md、components.md、module-spec §2 | 标注已实现 |
| [media-time-basis](../../backlog/media-time-basis.md) | 勾选验收条件 → done |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
