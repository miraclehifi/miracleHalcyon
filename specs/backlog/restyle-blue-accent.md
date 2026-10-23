# 全站强调色由暖棕改为蓝色（参考 Aceternity）

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

作者在调整后台表单风格时（参考 Aceternity UI signup-form，源码见 [references/code/aceternity-signup-form.tsx](../../references/code/aceternity-signup-form.tsx)）要求表单主色调改为参考 Aceternity，随后明确读者端也不保留暖棕。全站 `accent` 一族改为 Aceternity 的蓝色系（Tailwind blue），中性色、语义色（`ok` / `warn` / `danger`）、按钮配色与字体不变。

## 目标与验收

**目标**: 全站强调色统一为蓝色，亮暗两套都满足 WCAG AA。

**验收条件**:
- [x] admin.pen 变量 `accent`、`focus`、`accent-soft` 更新；设计稿中无写死的暖棕色值
- [x] [design-tokens.md](../ui/design-tokens.md) 颜色表、标题、说明同步；对比度已验证
- [x] `src/styles/tokens.css` 的 `--accent`、`--focus`、`--accent-soft` 更新（Sprint 9 任务 9 [restyle-blue-accent](../tasks/sprint-9/restyle-blue-accent.md)）；同时去掉 `ConfirmDialog`、`SegmentedControl` 投影里写死的暖棕黑 `rgb(42 37 31)`
- [ ] 读者端与后台用到强调色的页面视觉检查（当前导航项、主操作、链接 hover、焦点环、识别高亮、评分星、`MediaTypeTabs` GooeyNav）

## 影响分析

- **影响范围**:
  - UI：`specs/ui/admin.pen`（变量）、`specs/ui/design-tokens.md`、`specs/_index.md`（design_system 描述）
  - 代码：`src/styles/tokens.css` 三个变量；颜色基本都引用令牌，例外是 `ConfirmDialog`、`SegmentedControl` 投影写死暖棕黑 `rgb(42 37 31)`，改为中性黑（2026-10-22 grep 发现）
  - 测试：无断言具体颜色值的测试需改（实现任务中再确认）
  - 产品：无
- **依赖项**: 无
- **决策**（2026-10-22，AI 按作者需求设计）:

| 令牌 | 亮色 | 暗色 | 对比度（最低） |
|------|------|------|---------------|
| `accent` / `focus` | `#2563EB`（blue-600） | `#60A5FA`（blue-400） | 亮 4.70（`surface-sunken` 上）/ 暗 5.25（`surface` 上） |
| `accent-ink` | `#FFFFFF`（不变） | `#21262B`（不变） | 5.17 / 6.00 |
| `accent-soft` | `#EFF6FF`（blue-50） | `#1E2B3F` | 其上 `ink-faint` 4.90 / 5.15，`accent` 4.75 / 5.61 |

  - 亮色不用 Aceternity 光晕的 blue-500（`#3B82F6`）：白底仅 3.68:1，`accent` 要做链接与文字
  - 暗色底色（`#21262B` 系）不改为 Aceternity 的纯黑 / zinc：作者只要求换主色调
  - `focus` 与 `accent` 同值（≥ 3:1 满足焦点环要求）

## 估算

- **规模**: S

## 备注

- 取代 [restyle-tw93-reference](restyle-tw93-reference.md) 中"强调暖棕"的配色决定；楷体、白底、留白等其余决定不变
