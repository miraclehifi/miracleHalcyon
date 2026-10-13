# 文章列表卡片边框去掉主题色

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P3-Low |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

文章列表卡片（读者端 `PostCard`、后台 `PostListItem`）悬停、键盘聚焦、方向键选中、手机长按时，上层边框不再换成 `accent`，保持默认 `line-strong` 虚线；状态只靠双层错位（长按靠 `surface` 底色）表现。

## 目标与验收

**验收条件**:
- [x] [admin.pen](../ui/admin.pen)：`PostCard/Hover` 上层、02 稿悬停行（3 行）、02m 长按行的边框改为 `line-strong`
- [x] [components.md](../ui/components.md) `PostCard/Hover` 说明去掉"上层边框换 `accent`"
- [x] [admin-post-list.md](../ui/pages/admin-post-list.md) 悬停与长按反馈去掉 `accent` 边框
- [x] [animated-list.md](animated-list.md) 选中行验收条件同步

## 影响分析

- **影响范围**: 以上 4 个文件；无代码（尚未实现）
- **依赖项 / 被依赖**: 无；F-001 implement 时按新规格实现
- **决策**（2026-10-12 与作者确认）: 只去掉边框的主题色，双层错位保留

## 估算

- **规模**: XS
