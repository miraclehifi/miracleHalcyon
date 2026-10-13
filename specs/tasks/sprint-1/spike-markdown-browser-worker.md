# spike-markdown-browser-worker: 验证：浏览器 Web Worker 渲染性能

**Sprint**: Sprint 1
**序号**: 4
**状态**: completed
**类别**: SETUP
**架构层级**: 基础设施
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 验证：浏览器 Web Worker 渲染性能
- **影响范围**: `src/lib/markdown/worker.ts`, `tests/spike/markdown-browser.spec.ts`, `tests/fixtures/markdown/long-10k.md`
- **不变量**: 不改变依赖任务（spike-markdown-workers-runtime）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [adr1](../../engineering/features/F-001-文章写作/architecture/adr/ADR-001-isomorphic-markdown.md) · [md](../../engineering/frontend/modules/markdown/module-spec.md) |

## 唯一测试（红 → 绿）

`tests/spike/markdown-browser.spec.ts`（Playwright chromium）：在 Web Worker 中渲染 10,000 字、含 10 个代码块的夹具 20 次，P95 < 200ms

## DoD（完成定义）

### 实现类
- [x] `src/lib/markdown/worker.ts`：接收 `{ seq, source }`，返回 `{ seq, html }`
- [x] 测试页 `src/pages/admin/_spike-markdown.astro`（仅 dev 构建可访问）
- [x] `tests/fixtures/markdown/long-10k.md` 夹具
- [x] 结论（P50 / P95、chunk 体积）写入 ADR-001

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 依赖

[spike-markdown-workers-runtime](spike-markdown-workers-runtime.md)

## 实现记录

- 测试页通过 `astro.config.mjs` 的 `spikeRoutes` 集成仅在 dev 下注入路由；spike 测试用独立配置 `playwright.spike.config.ts`（`npm run test:spike`）
- 新增 `vite.resolve.alias`（decode-named-character-reference 非 DOM 入口）与 `vite.optimizeDeps.include`，原因见 ADR-001 浏览器侧验证结果

## 影响的文件

- `src/lib/markdown/worker.ts`
- `tests/spike/markdown-browser.spec.ts`
- `tests/fixtures/markdown/long-10k.md`
- `src/pages/admin/_spike-markdown.astro`、`astro.config.mjs`、`playwright.spike.config.ts`、`package.json`（`test:spike`）

## 回滚策略

回退本任务新增的配置与脚本；骨架类任务 `git revert` 对应提交

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
