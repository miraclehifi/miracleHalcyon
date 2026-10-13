# implement-markdown-code-highlight: 实现代码高亮（亮 / 暗主题）

**Sprint**: Sprint 1
**序号**: 51
**状态**: completed
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现代码高亮（亮 / 暗主题）
- **影响范围**: `src/lib/markdown/render.ts`, `src/lib/markdown/ec-config.ts`, `tests/unit/markdown/code.test.ts`
- **不变量**: 不改变依赖任务（implement-markdown-sanitize）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-04 Markdown 实时预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [md](../../engineering/frontend/modules/markdown/module-spec.md) · [adr1](../../engineering/features/F-001-文章写作/architecture/adr/ADR-001-isomorphic-markdown.md) |

## 唯一测试（红 → 绿）

MD-UT-03：`ts` 代码块高亮、未知语言 `foo` 按纯文本输出不报错；亮 / 暗两套主题变量都存在

## DoD（完成定义）

### 实现类
- [x] Expressive Code 配置（语言白名单、主题跟随 `data-theme`）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 语言白名单与 Expressive Code 配置从 `render.ts` 移到 `src/lib/markdown/ec-config.ts`
- 主题跟随站点：亮色为基础主题，`themeCssSelector` 按主题类型生成 `[data-theme='light|dark']`（原型按主题名生成 `[data-theme='github-dark']`，与站点 `<html data-theme>` 不匹配）；系统暗色时 `@media (prefers-color-scheme: dark){:root:not([data-theme='light'])…}` 切换
- 未知语言 / 无语言：`data-language="plaintext"`，整段一个 span（不分词，仍带亮 / 暗前景色）
- 浏览器 spike 回归：P95 25.7ms

## 依赖

[implement-markdown-sanitize](implement-markdown-sanitize.md)

## 影响的文件

- `src/lib/markdown/render.ts`
- `src/lib/markdown/ec-config.ts`
- `tests/unit/markdown/code.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
