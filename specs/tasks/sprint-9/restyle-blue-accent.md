# restyle-blue-accent: 强调色改蓝、清除暖色残留

**Sprint**: Sprint 9
**序号**: 9
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/styles/tokens.css`、`src/components/ui/`）
**所属 Feature**: 全站（设计令牌，跨 F-001 / F-002 / F-005）
**来源 PBI**: [restyle-blue-accent](../../backlog/restyle-blue-accent.md)、[rating-face-stars](../../backlog/rating-face-stars.md)（令牌部分）

## 意图声明

- **改动意图**: `tokens.css` 的 `--accent`、`--focus`、`--accent-soft` 改为蓝色系，新增 `--rating-star`、`--rating-face` 并映射 Tailwind；`ConfirmDialog`、`SegmentedControl` 投影里写死的暖棕黑 `rgb(42 37 31)` 改为中性黑
- **影响范围**: 全站用到 `accent` 系的地方（当前导航项、主操作、链接 hover、焦点环、徽标浅底）；弹窗与分段控件投影色相
- **不变量**: 组件只引用令牌，不写死颜色；对比度按 design-tokens"颜色"已验证的取值
- **不在本任务**: `StarRating` 组件本身（任务 5）

## 设计依据

[design-tokens.md"颜色"](../../ui/design-tokens.md)（2026-10-22 蓝色强调、`rating-star` / `rating-face`）

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `tests/unit/tokens.test.ts`：tokens.css 与 design-tokens.md 颜色表一致（含新令牌） | 单元 |
| 2 | `tests/unit/ui/confirm-dialog.test.tsx`、`tests/unit/ui/segmented-control.test.tsx` 原有用例（改投影后回归） | 单元 |

## DoD（完成定义）

- [x] 测试清单全部通过（2026-10-22：3 文件 4 用例）
- [x] `src/` 中无暖棕色值（`8b6238`、`e8a15a`、`f5ede4`、`3a3026`、`42 37 31`）
- [x] `npm run check` 0 错误；`npm run lint` 本任务文件无问题（另有 3 个既有错误：`GooeyNav.tsx` 2 处属任务 4 进行中文件，`specs/test/.../playwright-test-afilmory-live.js` 1 处，均非本任务引入）

## 依赖

无

## 影响的文件

- `src/styles/tokens.css`
- `src/components/ui/ConfirmDialog.tsx`、`src/components/ui/SegmentedControl.tsx`

## 回滚策略

git 还原上述 3 个文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [restyle-blue-accent](../../backlog/restyle-blue-accent.md) | 勾选 tokens.css 验收项 |
