# remove-poster-hover-title: 海报墙去掉悬停浮出名称

**Sprint**: Sprint 9
**序号**: 18
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（reader，`src/components/reader/MediaPoster.tsx`）
**所属 Feature**: F-005 书影音
**来源 PBI**: [poster-no-hover-title](../../backlog/poster-no-hover-title.md)

## 意图声明

- **改动意图**: 删除 `MediaPoster` 正面的名称浮层（`data-poster-caption`），不再引用 Masonry 的 `CAPTION` / `TITLE`
- **影响范围**: 海报墙正面悬停 / 聚焦视觉；翻面、背面、无封面占位、无 JS 静态网格不变
- **不变量**: 背面仍显示名称；可访问名称（`aria-label="《名称》"`）不变
- **不在本任务**: 游戏悬停徽标（任务 14）；admin.pen 设计稿（后补）

## 设计依据

[components.md](../../ui/components.md) `MediaPoster/Hover`、[reader-media.md](../../ui/pages/reader-media.md)"海报墙"（2026-10-23 更新）

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `tests/unit/reader/media-poster-wall.test.tsx`：正面不渲染 `data-poster-caption` | 单元 |
| 2 | `tests/e2e/reader-media.spec.ts` TC-US03-19：悬停时无名称浮层，其余步骤不变 | E2E |

## DoD（完成定义）

- [x] 测试清单全部通过（2026-10-23：单元 6 用例；reader-media.spec.ts chromium + webkit 24 用例）
- [x] `npm run lint`、`npm run check` 本任务文件无问题

## 依赖

任务 10

## 影响的文件

- `src/components/reader/MediaPoster.tsx`
- `tests/unit/reader/media-poster-wall.test.tsx`
- `tests/e2e/reader-media.spec.ts`
