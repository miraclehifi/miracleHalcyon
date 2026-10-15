# animate-theme-toggle: 主题切换两态 + 圆形扩散动画

**Sprint**: Sprint 4（2026-10-15 追加增量）
**序号**: 20
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [animated-theme-toggle](../../backlog/animated-theme-toggle.md)

## 意图声明

- **改动意图**: `theme-toggle.ts` 由三态轮换改为亮 / 暗翻转（以当前实际配色为准，未选择时跟随系统并同步按钮名称）；新增 `circleClipPath` 纯函数与 View Transitions 扩散（减少动效 / 不支持时直接切换，动画中忽略重复点击）；`ThemeToggle.astro` 图标换成半填充圆 SVG；`global.css` 加只在切换期间生效的过渡样式
- **影响范围**: `src/lib/reader/theme-toggle.ts`、`src/components/reader/ThemeToggle.astro`、`src/styles/global.css`
- **不变量**: 首屏内联脚本不变（存储 `system` 旧值不设 `data-theme`）；读者端不加载 React；后台默认仍跟随系统
- **不在本任务**: Magic UI 的其他形状变体、`fromCenter`

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-01-reader-shell/story.md) AC2 |
| 设计依据 | [reader-shell.md 主题切换](../../ui/pages/reader-shell.md) · [module-spec 主题切换](../../engineering/frontend/modules/reader/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-201、UT-202、UT-203：翻转、跟随系统同步名称、存储不可用 | 单元 |
| 2 | UT-237：`circleClipPath` 起止值；无 `startViewTransition` / 减少动效时直接切换 | 单元 |
| 3 | [TC-US01-02](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-01-tests.md) v1.1：翻转、过渡标记、减少动效、跨页保持 | E2E |
| 4 | TC-US01-04：跟随系统时随系统切换（名称改为当前实际配色） | E2E |

## DoD（完成定义）

### 实现类
- [x] 不引入 React、`lucide` 太阳 / 月亮图标
- [x] 过渡样式只在 `html[data-theme-vt="active"]` 时生效

### 测试类
- [x] 测试清单全部由红变绿（单元 6 / 6；E2E chromium + webkit 8 / 8）；改动文件 lint 0；`npm run check` 本任务文件 0 错误（余 2 个错误在工作区其他未提交改动：`src/domains/post/repo.ts`、`tests/integration/media/upload-memory.test.ts`）

## 依赖

[add-theme-toggle](add-theme-toggle.md)

## 影响的文件

- `src/lib/reader/theme-toggle.ts`、`src/components/reader/ThemeToggle.astro`、`src/styles/global.css`
- `tests/unit/reader/theme-toggle.test.ts`、`tests/e2e/reader-theme.spec.ts`

## 回滚策略

还原上述三个源文件与两个测试文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [animated-theme-toggle](../../backlog/animated-theme-toggle.md) | 验收勾选、状态 → done |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
