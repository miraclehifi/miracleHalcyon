# F-002 验收共享夹具

**Feature**: F-002-博客首页与阅读
**最后更新**: 2026-10-15

> 读者页在构建时预渲染，E2E 无法按用例临时造数据后立即看到页面。读者端用例统一使用下面的**只读**构建夹具：构建时数据源指向夹具（注入方式以 design-arch 为准），`npm run test:e2e` 的 webServer 构建一次，所有读者端用例共用。
> 需要写入的用例（发布触发重建、封面上传）走后台接口与 workers 集成测试，用 Factory 造数据，不依赖本夹具，也不修改本夹具。

## 1. `reader-fixture`（默认）

已发布 41 篇，草稿 1 篇，已撤回 1 篇。日期为 `publishedAt`（`yyyy-MM-dd`）。

| slug | 标题 | publishedAt | 标签 | 摘要 | 封面 | 正文要点 |
|------|------|-------------|------|------|------|---------|
| `latest-post` | Latest Post | 2026-10-14 | `C# 与 .NET/Core` | — | 无 | 两段文字 |
| `hello` | Hello Halcyon | 2026-10-10（`lastPublishedAt` 2026-10-12，发布后更新过） | `Astro`、`Cloudflare` | 手写摘要 | 有（`/img/2026/10/cov0000001_1600x900_8a7b6c.jpg`） | 见下方"`hello` 正文" |
| `withdrawn-post` | Withdrawn | 2026-10-08 | `Astro` | — | — | **已撤回** |
| `draft-post` | Draft | 2026-10-07 | `Secret` | — | — | **草稿**（从未发布） |
| `prev-post` | Prev Post | 2026-10-05 | `Astro` | — | 无 | 以 `## 标题\n\n**粗体**文字 ![图](/img/2026/10/p000000001_800x600_808080.jpg)` 开头，纯文本超过 200 字 |
| `case-lower` | Case Lower | 2026-09-30 | `astro`（小写写法） | — | 无 | 一段文字 |
| `filler-01` … `filler-36` | Filler 01 … 36 | 2026-09-29 起逐日往前 | `filler-01`：`Astro`、`Cloudflare`；`filler-02`…`filler-22`：`Astro`；其余无标签 | — | 无 | 一段文字 |
| `first-post` | First Post | 2026-01-01（最早） | 无 | — | 无 | 以图片开头，无 h2 / h3 |

由此得到的基准值：

| 项 | 值 |
|----|----|
| `/posts` 总数 | 41（3 页：20 / 20 / 1） |
| `Astro` 标签（不区分大小写） | 25 篇（`hello`、`prev-post`、`case-lower`、`filler-01`…`filler-22`），2 页；写法 `Astro` 24 次、`astro` 1 次 → 页头 `#Astro` |
| `hello` 的上一篇 / 下一篇 | `prev-post` / `latest-post`（跳过 `withdrawn-post`、`draft-post`） |
| `hello` 的同标签文章 | 第 1 位 `filler-01`（共享 2 个标签），其后按发布时间降序，共 8 篇 |
| 只在草稿中的标签 | `Secret` → `/tags/secret` 为 404 |

### `hello` 正文

依次为：文字段落（首段，首字下沉）→ `## 安装`（含 `### 依赖`）→ ts 代码块 → 表格、任务列表、删除线 → `## 配置`（含 `### 环境变量`）→ 引用（最后一段"— 鲁迅"）→ 单图（带 title"图注一"）→ 宽图 → 3 张网格组图 → 5 张手风琴组图 → 实况照片（静态图 + `.live.mp4`）→ `## 结语` → 单图（无 title）。共 12 张图片，3 个 h2、2 个 h3。

图片地址都指向 E2E 种子（`npm run e2e:seed`）已写入 R2 的夹具；第 12 张使用不存在的 key（用于灯箱加载失败用例）。

## 2. `reader-fixture-empty`

0 篇已发布文章，用于构建空站点（TC-US03-07）。

## 3. 站点配置夹具 `site.ts`

E2E 使用仓库内默认占位配置：名字"Halcyon"、头像 `/avatar.png`、3 段简介、GitHub `https://github.com/example`、邮箱 `me@example.com`、摄影站为空。
