# 海报背面铺滤镜处理后的封面（同 FlipCard 示例）

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-23 |
| 创建者 | miraclehifi |

## 描述

海报墙翻面后，背面不再是纯色底：参考 React Bits FlipCard 官网示例（作者提供截图：正面为油画，背面同一张画水平镜像、去色、褪成浅色，上压标题与小字），背面底层铺本条目封面并做滤镜处理，文字压在上面。

## 目标与验收

**目标**: 翻面后仍能认出是哪张海报，背面有"纸背透图"的质感。

**验收条件**:
- [x] 有封面时背面底层为同一张封面：水平镜像、灰度、低不透明度，叠一层自上而下由 `flip-surface` 半透明 → 透明 → 近不透明的渐变，文字清晰可读
- [x] 亮色为浅灰白（`flip-surface` 白底）、暗色为深灰（`flip-surface` `#27272A` 底），同一套滤镜
- [x] 无封面 / 封面加载失败时背面仍为纯 `flip-surface` 底
- [x] 封面层 `aria-hidden`、`alt=""`，不进入可访问名称；不影响"豆瓣 ↗"位置与可点性

## 影响分析

- **影响范围**:
  - UI：[components.md](../ui/components.md) `MediaPoster/Back`、[reader-media.md](../ui/pages/reader-media.md)"背面底色"、[design-tokens.md](../ui/design-tokens.md)"翻面卡片"；admin.pen Row 6 / 09d 背面实例待同步（设计稿后补）
  - 代码：`src/components/reader/MediaPoster.tsx` 的 `Back`
  - 测试：`tests/unit/reader/media-poster-wall.test.tsx` 加背面封面层用例
  - 游戏（Sprint 9 任务 14 未实现）：背面同样铺封面，游戏砖块与封面同比例，`object-cover` 不裁切
- **依赖项**: 无
- **决策**（2026-10-23，AI 按作者截图设计）:
  - 镜像：示例背面是正面画面的左右镜像，照做（`scale-x-[-1]`）
  - 滤镜：`grayscale` + 不透明度 30%，不模糊（示例细节清晰）；渐变顶部 60%、35% 处透明、底部 90%，标题区与日期区更白，中段透出画面
  - 更正 2026-10-22 "背面底色同示例纯色"的结论：示例的 `background` 只是底色，官网演示的背面内容里放了处理过的图片

## 估算

- **规模**: XS
