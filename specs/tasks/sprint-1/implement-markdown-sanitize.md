# implement-markdown-sanitize: 实现 Markdown XSS 过滤

**Sprint**: Sprint 1
**序号**: 50
**状态**: completed
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 Markdown XSS 过滤
- **影响范围**: `src/lib/markdown/sanitize-schema.ts`, `tests/unit/markdown/xss.test.ts`
- **不变量**: 不改变依赖任务（implement-markdown-gfm-render）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [md](../../engineering/frontend/modules/markdown/module-spec.md) |

## 唯一测试（红 → 绿）

MD-UT-02：XSS 向量集输出不含可执行内容

## DoD（完成定义）

### 实现类
- [x] `src/lib/markdown/sanitize-schema.ts`（按 module-spec §2）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- Markdown 中的原始 HTML 先经 `rehype-raw` 解析，再由 `rehype-sanitize`（GitHub schema）过滤，与 GitHub 行为一致；新增依赖 rehype-raw 7、rehype-sanitize 6，并加入 `astro.config.mjs` 的 `optimizeDeps.include`（否则 dev 首次加载 Worker 依赖会重载页面）
- `src` 协议额外允许 `data`，sanitize 之后由 `rehypeAfterSanitize` 收紧为只保留 `data:image/*`
- id 前缀统一由 sanitize 加（remark-rehype `clobberPrefix: ""`），`rehypeAfterSanitize` 同步给脚注页内链接加前缀，避免双重前缀导致脚注跳转失效；GFM 快照随之更新（表格空白与布尔 data 属性的序列化差异，语义不变）
- 载荷清单固化为 `tests/fixtures/markdown/xss-payloads.json`（TC-US04-03 全部 14 类 + 大小写 / 空白 / 实体变体 + 代码块逃逸），同一测试覆盖 TC-US04-04 合法内容不被误杀
- ⚠️ 遗留给 implement-markdown-code-highlight / build-markdown-preview-pane：Expressive Code 在每个代码块内输出自带的 `<style>` 与复制按钮 `<script type="module">`（sanitize 之后生成，受信任），与 TC-US04-05「预览区 script 数量为 0」冲突，需在这两个任务中处理（如抽出样式 / 脚本到页面级）
- 浏览器 spike 回归：P95 25.3ms（不变）

## 依赖

[implement-markdown-gfm-render](implement-markdown-gfm-render.md)

## 影响的文件

- `src/lib/markdown/sanitize-schema.ts`
- `tests/unit/markdown/xss.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
