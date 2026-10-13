# build-segmented-control-component: 实现 SegmentedControl

**Sprint**: Sprint 1
**序号**: 23
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 SegmentedControl
- **影响范围**: `src/components/ui/SegmentedControl.tsx`, `tests/unit/ui/segmented-control.test.tsx`
- **不变量**: 不改变依赖任务（define-design-token-styles）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/segmented-control.test.tsx`：单选组语义（`role="radiogroup"`）；← / → 切换并触发 onChange；`count` 用 tabular-nums

## DoD（完成定义）

### 实现类
- [ ] `src/components/ui/SegmentedControl.tsx`（含 `SegmentedControl.Item`）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[define-design-token-styles](define-design-token-styles.md)

## 影响的文件

- `src/components/ui/SegmentedControl.tsx`
- `tests/unit/ui/segmented-control.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
