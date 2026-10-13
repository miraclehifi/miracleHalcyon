# implement-relative-time-format: 实现列表相对时间格式

**Sprint**: Sprint 1
**序号**: 52
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现列表相对时间格式
- **影响范围**: `src/lib/format/relative-time.ts`, `tests/unit/admin/relative-time.test.ts`
- **不变量**: 不改变依赖任务（scaffold-project-skeleton）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) |

## 唯一测试（红 → 绿）

`tests/unit/admin/relative-time.test.ts`：1 小时内"N 分钟前"、当天"今天 HH:mm"、今年"M月D日"、更早"YYYY-MM-DD"（固定时区）

## DoD（完成定义）

### 实现类
- [ ] `src/lib/format/relative-time.ts`

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[scaffold-project-skeleton](scaffold-project-skeleton.md)

## 影响的文件

- `src/lib/format/relative-time.ts`
- `tests/unit/admin/relative-time.test.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
