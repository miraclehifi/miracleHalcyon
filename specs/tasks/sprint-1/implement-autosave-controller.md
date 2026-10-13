# implement-autosave-controller: 实现自动保存状态机

**Sprint**: Sprint 1
**序号**: 63
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现自动保存状态机
- **影响范围**: `src/lib/autosave/useAutosave.ts`, `tests/unit/autosave/use-autosave.test.ts`
- **不变量**: 不改变依赖任务（setup-workers-test-pool）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-06 自动保存草稿](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [editor](../../engineering/frontend/modules/editor/module-spec.md) |

## 唯一测试（红 → 绿）

ED-UT-02（Sprint 1 子集，fake timers + fetch mock）：2 秒防抖；首次 POST 后改 PUT；保存中再编辑完成后立即再保存；网络错误退避重试；409 不重试

## DoD（完成定义）

### 实现类
- [ ] `src/lib/autosave/useAutosave.ts`（状态 idle / dirty / saving / saved / failed）
- [ ] 本地暂存、401 跳转、恢复横幅留到 Sprint 2

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[setup-workers-test-pool](setup-workers-test-pool.md)

## 影响的文件

- `src/lib/autosave/useAutosave.ts`
- `tests/unit/autosave/use-autosave.test.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
