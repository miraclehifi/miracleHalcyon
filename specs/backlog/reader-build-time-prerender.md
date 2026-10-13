# 读者页改为构建时预渲染

| 字段 | 值 |
|------|-----|
| 状态 | ready |
| 类型 | Task |
| 优先级 | P1-High |
| 来源 | spike-markdown-workers-runtime 结论 |
| 日期 | 2026-10-13 |
| 创建者 | miraclehifi |

## 描述

spike 证实 Expressive Code 能在 Workers 中运行，但长文热渲染约 60ms CPU，超出 Workers 免费版每次请求 10ms 的上限；边缘缓存未命中时请求会失败（1102），所以缓存兜不住。作者决定（2026-10-13）：读者页（`/`、`/posts`、`/posts/:slug`、`/tags/:tag`）在**构建时预渲染**为静态页，读者访问不经过 Worker 代码；发布 / 发布更新 / 撤回 / 删除后通过 Workers Builds Deploy Hook 触发重建。

## 目标与验收

**目标**: 读者访问时零 Worker CPU，免费版可用；`renderMarkdown` 仍是唯一渲染实现（预览在浏览器 Web Worker，读者页在构建时）。

**验收条件**:
- [x] ADR-001 修订：读者页渲染改在构建时；Worker 侧 spike 结论保留，作为以后切到付费版 SSR 的退路
- [x] US-08 验收条件 5、BH-07、US-09 BH-04、TC-US08-09 改为"触发重建，重建完成后读者看到变化"
- [x] feature-architecture、post domain-model / api-contract、shared-domains、markdown module-spec、feature-scope、nfr 同步
- [ ] F-002 design-arch 落实：预渲染数据源、Deploy Hook 实现、重建时长实测

## 影响分析

- **影响范围**: 见上方验收条件中的文档；Sprint 1 任务不变（`implement-post-publish-service` 仍提供 `PublicationHooks` 空实现，由 F-002 实现为调用 Deploy Hook）
- **依赖项**: spike-markdown-workers-runtime（已完成）
- **被依赖**: F-002 define-feature / design-arch
- **决策**（2026-10-13 与作者确认）:
  - 在 A（构建时预渲染）/ B（发布时浏览器渲染，存 `published_html`）/ C（Workers 付费版 SSR）中选 A
  - 产品取舍：发布后读者看到变化的时限从"10 秒内"放宽为"一次重建完成后"（目标 P95 ≤ 5 分钟）
  - 构建时数据源：构建脚本读线上公开接口 `GET /api/posts[/:slug]`（返回 Markdown 原文，接口本身不渲染），不需要 D1 凭据
  - 重建触发：Workers Builds Deploy Hook（POST 一个含密钥的 URL），URL 作为 Worker Secret 注入；触发失败只记日志，作者可在 Cloudflare 控制台手动重建

## 待 F-002 design-arch 验证

- Astro 7 + `@astrojs/cloudflare` 预渲染运行环境（Node 还是本地 workerd）以及 `getStaticPaths` 中能否 `fetch` 线上接口
- Workers Builds 免费额度（构建分钟数）是否够用；连续多次发布是否合并为一次构建
- 重建实测时长，确认 P95 ≤ 5 分钟
- 首次部署（线上还没有接口）时构建如何处理空数据
- 附带好处：读者页是静态 HTML，Pagefind（F-004 站内搜索）可直接在构建后索引

## 估算

- **规模**: S（本条只改规格；实现归 F-002）
