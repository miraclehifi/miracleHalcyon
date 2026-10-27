# unify-media-poster-wall: 书、漫画、桌游改为海报墙（所有分类统一）

**Sprint**: Sprint 9
**序号**: 16
**状态**: completed（2026-10-27）
**类别**: FRONTEND
**架构层级**: 表现层（reader：`src/components/reader/`、`src/lib/reader/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-wall-all-types](../../backlog/media-wall-all-types.md)

## 意图声明

- **改动意图**:
  - `posterAspect`：书、漫画 `2 / 3`，桌游 `1 / 1`（电影、剧集、游戏不变）
  - `MediaList` 所有分类渲染 `<MediaPosterWall client:load>`；`MediaPage` 所有分类用满宽主体（左右 50px，手机 20px），去掉 896px 居中容器分支
  - `MediaPoster` 背面状态词与"在读 / 在看 / 在玩"徽标随分类；`MediaTimeBasis` 文案补书 / 漫画"读过时间 / 出版年份"、桌游"玩过时间 / 发行年份"；空分类不渲染"按时间"
  - 删除 `MediaCard.astro`、`MediaRow.astro` 及其样式；清理引用
- **影响范围**: `/media`、`/media/comic`、`/media/boardgame` 由零 React 海报墙外的 Astro 列表改为海报墙岛；构建产物检查（TC-US03-05、06、07、11、13、17）改口径
- **不变量**: 电影、剧集、游戏页行为不变；不请求豆瓣域名；不新增依赖；后台 `MediaEntryRow` 不受影响
- **不在本任务**: 游戏平台 / 年份（任务 14、15）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) AC4、AC10、AC12、AC13；BH-05、06、07、15、17 |
| 设计依据 | [reader-media.md](../../ui/pages/reader-media.md)"布局""海报墙""分类差异" · [components.md](../../ui/components.md) `MediaPoster`、`MediaList`、`MediaPosterWall`（`MediaCard`、`MediaRow` 已废弃） · admin.pen 09、09m、09c |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-17 补书 / 漫画 / 桌游比例——`tests/unit/reader/shelf.test.ts` | 单元 |
| 2 | UT-16 补书 / 桌游状态词与依据文案——`tests/unit/reader/media-poster-wall.test.tsx` | 单元 |
| 3 | TC-US03-05、06、07、11、13 改口径——`tests/build/reader-output.test.ts` | 构建 |
| 4 | TC-US03-17（三个分类 2 列、比例、无横向滚动）、TC-US03-15（书无封面占位）——`tests/e2e/reader-media.spec.ts` | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 09、09m、09c 一致；所有分类左边缘与电影页对齐
- [x] `src/components/reader/` 下无 `MediaCard`、`MediaRow`；`grep -r "MediaCard\|MediaRow" src` 只剩后台 `MediaEntryRow`
- [x] 测试清单全部由红变绿；`tests/e2e/reader-media.spec.ts` 全部用例 chromium 通过，本任务 E2E 补跑 webkit

## 实现记录（2026-10-27）

- `MediaList` 只剩"空状态 / 海报墙"两支；`MediaPage` 一律 `width="full"`，有条目才留"按时间"槽；删除 `MediaCard.astro`、`MediaRow.astro`、`MediaCover.astro`（仅两者使用）与任务 14 临时加的 `isPosterType`
- `MediaPoster` / `MediaTimeBasis` 本来就按分类取状态词与文案，UT-16 新增的书、桌游用例直接通过（未经红），真正的红在构建测试（TC-US03-04、05、06、07、11、13 共 6 项）
- TC-US03-13 超长标题：测试数据表各分类条数固定，不另加条目，改由 UT-16（背面标题 `line-clamp-2`、短评 `whitespace-pre-line`）覆盖；构建测试检查"无评桌游"背面多行短评
- E2E 新增 `settledBox`（等入场缩放结束、尺寸稳定再量），TC-US03-06、15、17 改为按海报比较尺寸

## 依赖

14（游戏海报墙）、15（依据切换）

## 影响的文件

- `src/lib/reader/shelf.ts`、`src/components/reader/{MediaPoster,MediaPosterWall,MediaTimeBasis}.tsx`、`MediaList.astro`、`MediaPage.astro`（改）
- `src/components/reader/{MediaCard,MediaRow}.astro`（删除）、相关样式
- `tests/unit/reader/{shelf.test.ts,media-poster-wall.test.tsx}`、`tests/build/reader-output.test.ts`、`tests/e2e/reader-media.spec.ts`（改）

## 回滚策略

`git show` 取回删除的 `MediaCard.astro` / `MediaRow.astro`，`MediaList` / `MediaPage` 分支 git 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader-media.md、components.md、module-spec | 标注已实现 |
| [media-wall-all-types](../../backlog/media-wall-all-types.md) | 勾选验收条件 → done |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
