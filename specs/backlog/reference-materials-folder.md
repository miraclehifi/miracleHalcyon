# 参考素材文件夹

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P3-Low |
| 来源 | 作者需求 |
| 日期 | 2026-10-16 |
| 创建者 | miraclehifi |

## 描述

作者要一个集中存放参考素材的文件夹：设计截图、文章摘录、代码片段、原始素材、在线链接。素材全部提交到 git。

## 目标与验收

**验收条件**:
- [x] 项目根新建 `references/`，含 `design/`、`articles/`、`code/`、`assets/` 子目录和 `links.md`
- [x] `references/README.md` 说明各目录用途与命名约定
- [x] `links.md` 收录已有 Backlog 中的参考站（tw93 潮流周刊、pseudoyu）
- [x] `references/` 不参与 lint 与类型检查（eslint `ignores`、tsconfig `exclude`），放入的代码片段不会让 `npm run lint` / `npm run check` 失败

## 影响分析

- **影响范围**: 新增 `references/`；`eslint.config.js`、`tsconfig.json` 各加一项排除
- **不变**: 业务代码、构建产物（Astro 只读 `src/` 与 `public/`）、测试发现范围（Vitest / Playwright 只扫 `tests/`）

## 路由

SDD-Lite（目录与工具配置，无 User Story / 领域 / 架构变更 / 测试用例，按 [local-dev-script](local-dev-script.md) 等工具类条目先例不建 Feature 文档与 Sprint 任务）。

## 估算

- **规模**: XS

## 完成记录

2026-10-16 完成。`npm run lint`、`npm run check` 通过。
