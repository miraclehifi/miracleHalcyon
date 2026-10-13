# implement-post-publish-service: 实现发布与发布更新服务

**Sprint**: Sprint 1
**序号**: 35
**状态**: pending
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现发布与发布更新服务
- **影响范围**: `src/domains/post/service.ts`, `src/domains/post/hooks.ts`, `tests/unit/post/publish-service.test.ts`
- **不变量**: 不改变依赖任务（enforce-slug-uniqueness、implement-publish-validation）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [post](../../engineering/backend/domains/post/domain-model.md) |

## 唯一测试（红 → 绿）

POST-UT-06：草稿发布；publishedAt 为空补当天；已发布无修改再发布幂等且不触发钩子；发布更新改 slug 时钩子收到 `prevSlug`

## DoD（完成定义）

### 实现类
- [ ] `PostService.publish`
- [ ] `src/domains/post/hooks.ts`：`PublicationHooks` 接口 + 空实现（F-002 实现）；钩子失败只记日志

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[enforce-slug-uniqueness](enforce-slug-uniqueness.md), [implement-publish-validation](implement-publish-validation.md)

## 影响的文件

- `src/domains/post/service.ts`
- `src/domains/post/hooks.ts`
- `tests/unit/post/publish-service.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
