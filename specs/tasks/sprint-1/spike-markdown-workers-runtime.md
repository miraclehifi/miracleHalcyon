# spike-markdown-workers-runtime: 验证：Expressive Code 在 Workers 中运行

**Sprint**: Sprint 1
**序号**: 3
**状态**: pending
**类别**: SETUP
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 验证：Expressive Code 在 Workers 中运行
- **影响范围**: `src/lib/markdown/render.ts`, `tests/spike/markdown-workers.test.ts`, `specs/…/ADR-001-isomorphic-markdown.md`
- **不变量**: 不改变依赖任务（setup-workers-test-pool）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [adr1](../../engineering/features/F-001-文章写作/architecture/adr/ADR-001-isomorphic-markdown.md) · [md](../../engineering/frontend/modules/markdown/module-spec.md) |

## 唯一测试（红 → 绿）

`tests/spike/markdown-workers.test.ts`（workers 项目）：渲染含 ```ts 代码块的 Markdown，输出含 Expressive Code 结构（`.expressive-code`）且有语法着色 span，单次渲染耗时 < 50ms

## DoD（完成定义）

### 实现类
- [ ] `src/lib/markdown/render.ts` 最小原型：remark-parse → remark-gfm → remark-rehype → rehype-expressive-code（Shiki JavaScript 正则引擎、语言白名单）
- [ ] `wrangler deploy --dry-run --outdir dist-check` 后 worker 压缩体积 ≤ 10MB，数值记录到 ADR-001"验证结果"
- [ ] 结论写入 ADR-001：通过 → 状态保持 Accepted；不通过 → 启用 ADR-001 退路并通知作者

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[setup-workers-test-pool](setup-workers-test-pool.md)

## 影响的文件

- `src/lib/markdown/render.ts`
- `tests/spike/markdown-workers.test.ts`
- `specs/…/ADR-001-isomorphic-markdown.md`

## 回滚策略

回退本任务新增的配置与脚本；骨架类任务 `git revert` 对应提交

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
