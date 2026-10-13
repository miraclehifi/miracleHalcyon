# CLAUDE.md - miracleHalcyon

**最后更新**: 2026-10-13

---

## 项目概述

miracleHalcyon 是一个个人技术博客兼作品集，读者端阅读体验优先，作者可登录后在线写作。基于 Astro 7（SSR 混合模式）+ React 19 + TypeScript，部署在 Cloudflare。

> 产品定义详见 [specs/product/product-vision.md](specs/product/product-vision.md)

| 层 | 选型 |
|----|------|
| 框架 | Astro 7 + `@astrojs/react` + `@astrojs/cloudflare`（读者页预渲染/缓存，写作页 SSR） |
| 数据 | Cloudflare D1（文章）+ R2（图片） |
| 认证 | 单管理员账号密码登录 |
| 样式 | Tailwind CSS 4 + `@tailwindcss/typography` |
| 代码块 | Expressive Code |
| 搜索 | Pagefind |
| 评论 | Giscus |
| 部署 | Cloudflare（push 自动构建） |
| UI 设计 | Pencil（`.pen` 设计稿存放于 `specs/ui/`） |

---

## Build & Development Commands

<!-- 项目代码初始化后填写实际命令 -->

| 用途 | 命令 |
|------|------|
| 安装依赖 | `npm install` |
| 开发服务器 | `npm run dev` |
| 构建 | `npm run build` |
| 预览构建产物 | `npm run preview`（workerd 本地运行） |
| 生成绑定类型 | `npm run cf-typegen`（改 wrangler.jsonc 后执行） |
| 测试 | `npm test`（Vitest 4.1：`unit` jsdom + `workers` workerd/D1/R2）、`npm run test:e2e`（Playwright：chromium + webkit，自动 build + `astro preview`） |
| Lint / 类型检查 | `npm run lint`、`npm run check`（astro check） |

---

## SDD 流程

> 详见 [.claude/rules/sdd/workflow.md](.claude/rules/sdd/workflow.md)

流程概要: define → design（UI 设计 → architecture → domain）→ plan-tasks → implement → code-review → verify → deploy

---

## 目录结构

```
specs/
├── backlog/       # 统一需求入口
├── product/       # PM: 愿景、路线图、Feature
├── ui/            # UI/UE: 页面规格、Pencil 设计稿
├── engineering/   # Dev: 架构与领域
├── test/          # QA: 验证与追溯
├── devops/        # DevOps: Git/发布/构建配置
└── tasks/         # Sprint: 任务执行计划
```

---

## 可用 Skills

常用命令速查：
- `/sdd:setup` — 初始化项目
- `/sdd:define-product` — 产品愿景与路线图
- `/sdd:resume` — 断点续作
- `/sdd:progress` — 查看进度
- `/sdd:check` — 一致性检查

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-10-10 | 1.0 | 初始版本，SDD 框架接入，确定技术栈 |
| 2026-10-13 | 1.1 | 框架升级为 Astro 7（作者决定用最新版） |
