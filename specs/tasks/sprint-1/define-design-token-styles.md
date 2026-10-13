# define-design-token-styles: 实现设计令牌（亮 / 暗主题）

**Sprint**: Sprint 1
**序号**: 6
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现设计令牌（亮 / 暗主题）
- **影响范围**: `src/styles/tokens.css`, `src/styles/global.css`, `tests/unit/tokens.test.ts`
- **不变量**: 不改变依赖任务（scaffold-project-skeleton）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [tokens](../../ui/design-tokens.md) |

## 唯一测试（红 → 绿）

`tests/unit/tokens.test.ts`：解析 `src/styles/tokens.css`，design-tokens.md"颜色""其他"表中的每个令牌在 `:root` 与 `[data-theme=dark]`（含 `prefers-color-scheme: dark`）中都有定义，取值与文档一致

## DoD（完成定义）

### 实现类
- [x] `src/styles/tokens.css` 定义全部颜色、圆角、字体、字号令牌
- [x] Tailwind 4 `@theme` 映射令牌（`bg-surface`、`text-ink-muted` 等）
- [x] 主题默认跟随系统

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 颜色用 `light-dark()` + `color-scheme`，一处定义亮暗两值；Tailwind 内置 Lightning CSS 会编译成按 `color-scheme` 切换的变量（兼容旧浏览器）
- `@theme inline` 映射，`--color-*: initial` 移除默认色板，防止组件写死颜色
- 测试直接解析 design-tokens.md 的表格作为期望值（文档改了值而 CSS 没跟上时测试会失败）
- 未覆盖：webfont 分片加载（不在本任务 DoD 内，暂无对应任务）

## 依赖

[scaffold-project-skeleton](scaffold-project-skeleton.md)

## 影响的文件

- `src/styles/tokens.css`
- `src/styles/global.css`
- `tests/unit/tokens.test.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
