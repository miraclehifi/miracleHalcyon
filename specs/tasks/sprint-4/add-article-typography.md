# add-article-typography: 阅读排版：段首缩进、首字下沉、引用署名、代码主题

**Sprint**: Sprint 4
**序号**: 12
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层 + 领域层（markdown 插件）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: markdown 新增 `rehypeQuoteAttribution`（module-spec MD-UT-07，预览同步生效）；`prepareArticleHtml` 加 `data-dropcap`；文章区样式：正文宋体 / 标题黑体、段首缩进 2em（例外元素不缩进）、首字下沉、引用装饰引号与右对齐署名、链接样式、`scroll-margin-top`；代码块随 `data-theme` 切换
- **影响范围**: `src/lib/markdown/plugins/quote-attribution.ts`、`src/lib/markdown/render.ts`、`src/lib/reader/article-html.ts`、`src/styles/article.css`（或 tokens 内文章区样式）
- **不变量**: MD-UT-06 同构快照只因署名变化更新；预览其他输出不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-07](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-07-article-typography/story.md) AC3、AC4 |
| 设计依据 | [reader-post-detail.md 正文](../../ui/pages/reader-post-detail.md) · [design-tokens 字体](../../ui/design-tokens.md) · [markdown module-spec](../../engineering/frontend/modules/markdown/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US07-06](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-07-tests.md)：段首缩进与首字下沉 | E2E |
| 2 | TC-US07-07：首段不是文字时不下沉 | E2E |
| 3 | TC-US07-08：引用署名样式 | E2E |
| 4 | TC-US07-09（MD-UT-07）：署名识别规则 | 单元 |
| 5 | TC-US07-03：代码高亮随主题切换 | E2E |

## DoD（完成定义）

### 实现类
- [x] 署名插件只生成白名单属性，位于 sanitize 之后
- [x] 同构快照已更新并说明原因

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/unit/markdown/*`、`tests/integration/markdown/isomorphic.test.ts`、预览 E2E（`tests/e2e/preview*.spec.ts`）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-article-page](add-article-page.md)

## 影响的文件

- `src/lib/markdown/plugins/quote-attribution.ts`、`render.ts`
- `src/lib/reader/article-html.ts`
- `src/styles/article.css`
- `tests/unit/markdown/quote-attribution.test.ts`、`tests/e2e/reader-typography.spec.ts`

## 回滚策略

移除插件注册与文章区样式

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [markdown module-spec](../../engineering/frontend/modules/markdown/module-spec.md) | `rehypeQuoteAttribution` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
