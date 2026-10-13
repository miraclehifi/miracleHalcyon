# build-icon-button-component: 实现 IconButton

**Sprint**: Sprint 1
**序号**: 18
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 IconButton
- **影响范围**: `src/components/ui/IconButton.tsx`, `tests/unit/ui/icon-button.test.tsx`
- **不变量**: 不改变依赖任务（define-design-token-styles）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/icon-button.test.tsx`：缺少 `aria-label` 时类型报错（tsd）且运行时告警；`sm` 28px / `touch` 44px 可点区域

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/IconButton.tsx`（variant ghost / outline，lucide 图标）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 设计稿未画悬停态，按令牌补：悬停 `surface-sunken` 底 + `ink` 图标，0.2s 颜色过渡\n- 图标注册表新增 `x`、`ellipsis`

## 依赖

[define-design-token-styles](define-design-token-styles.md)

## 影响的文件

- `src/components/ui/IconButton.tsx`
- `tests/unit/ui/icon-button.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
