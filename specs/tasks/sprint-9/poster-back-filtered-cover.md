# poster-back-filtered-cover: 海报背面铺滤镜处理后的封面

**Sprint**: Sprint 9
**序号**: 17
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（reader，`src/components/reader/MediaPoster.tsx`）
**所属 Feature**: F-005 书影音
**来源 PBI**: [poster-back-filtered-cover](../../backlog/poster-back-filtered-cover.md)

## 意图声明

- **改动意图**: `MediaPoster` 的 `Back` 底层加封面层（同一张封面，水平镜像、灰度、不透明度 30%）与 `flip-surface` 自上而下渐变遮罩，文字内容压在上面；无封面或封面加载失败时不渲染封面层
- **影响范围**: 海报墙背面视觉；正面、翻面交互、"豆瓣 ↗"、无 JS 静态网格不变
- **不变量**: 颜色只用令牌（`flip-surface`）；封面层 `aria-hidden`、`alt=""`
- **不在本任务**: admin.pen 设计稿背面实例（后补）

## 设计依据

[components.md](../../ui/components.md) `MediaPoster/Back`、[reader-media.md](../../ui/pages/reader-media.md)"背面底色"（2026-10-23 更新）

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `tests/unit/reader/media-poster-wall.test.tsx`：有封面时背面含 `data-poster-back-cover` 图片（`src` 同封面、`aria-hidden`、镜像 + 灰度类）；无封面时背面无该图片 | 单元 |
| 2 | 同文件原有用例回归 | 单元 |

## DoD（完成定义）

- [x] 测试清单全部通过（2026-10-23：1 文件 6 用例）
- [x] 本地页面亮 / 暗两色截图核对（与示例截图对照）
- [x] `npm run lint`、`npm run check` 本任务文件无问题（check 0 错误）

## 依赖

任务 10（`MediaPoster` 已实现）

## 影响的文件

- `src/components/reader/MediaPoster.tsx`
- `tests/unit/reader/media-poster-wall.test.tsx`
