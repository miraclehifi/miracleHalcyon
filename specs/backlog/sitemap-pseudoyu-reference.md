# 网站地图改为参考 pseudoyu（首页自我介绍 · 文章独立成页）

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P1-High |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

作者指定以 [pseudoyu.com](https://www.pseudoyu.com/) 为读者端整站模板：先按它调整**网站地图**（页面清单、导航、路由），各页面的具体设计以后再定，内容以后再优化。已经设计好的文章模块（文章详情 05、文章卡片 `PostCard`、后台写作）保持我们自己的设计。

参考站结构（2026-10-12 实测）：

| 维度 | 参考站做法 |
|------|-----------|
| 首页 `/` | 自我介绍页：头像 + 站点名 → 几段简介（身份、在做的事、兴趣，段内链到各子页）→ 社交链接一行 → 邮箱 → 赞助入口；不列文章 |
| 文章 `/posts` | 单独成页，按年份分组，每条：标题 + 日期 · 阅读时长；顶部子标签 Blog / Talks / Podcasts / Notes |
| 顶栏 | 左侧 Logo 回首页；右侧文字导航 Blog / Projects / Talks / Media / Sponsors / Let's Chat，图标导航 Friends / Podcasts / Photos（外链）/ GitHub / RSS / 主题切换；手机端文字项换成图标，次要项隐藏 |
| 子页底部 | `> cd ..` 返回上一级 |
| 页脚 | 许可协议 CC BY-NC-SA 4.0 · `2020-PRESENT © 站点名` |
| 其他页 | Projects、Talks、Media（书 / 电影 / 剧 / 动画 / 游戏）、Sponsors、Let's Chat、Friends、Podcasts、Photos（独立站外链） |

## 作者取舍（2026-10-12）

| 事项 | 决定 |
|------|------|
| 首页 | 按参考站改为自我介绍页，不再放文章列表 |
| 文章列表 | 移到 `/posts`，样式仍用我们设计的 `PostCard`（虚线卡片 + 双层错位悬停），不跟随参考站的按年分组纯文本列表；不做 Blog / Talks / Podcasts / Notes 子标签 |
| 新增页面 | 只加 **书影音 `/media`**；**摄影**作为顶栏外链（地址待定） |
| 不纳入 | Projects、Talks、Podcasts、Sponsors、Let's Chat、Friends |
| 页面设计 | 首页、`/posts`、`/media` 的页面设计后续再做；现有 `06 首页` 设计稿暂不改 |

## 目标与验收

**目标**: 网站地图及引用它的 specs 与上述取舍一致。

**验收条件**:
- [x] [site-map.md](../ui/site-map.md) 读者端改为：首页 `/`、文章 `/posts`、文章详情、标签页、书影音 `/media`、摄影外链；顶栏与子页返回规则写入全局导航
- [x] [components.md](../ui/components.md) `SiteHeader` 导航项、`PostCard` 使用位置同步；`06 首页` 稿与新结构的差异记入"已知差异"
- [x] [feature-roadmap.md](../product/feature-roadmap.md) F-002 范围更新；新增书影音 Feature（idea）
- [x] [blog-home-reading.md](blog-home-reading.md) 中"首页即文章列表、导航只留首页 / 作品 / 关于"的旧取舍改为指向本条
- [x] 以"首页列出文章"为前提的 specs 改为 `/posts`（F-001 US-08 / US-09 缓存失效用例、F-001 feature-scope、admin-post-list、design-tokens）
- [x] 设计稿顶栏按新导航更新，导航拆为独立组件 `SiteNav` / `SiteNav/Mobile`（2026-10-12 追加）

## 影响分析

- **影响范围**: `specs/ui/admin.pen`（`SiteNav`、`SiteHeader`；原在根目录 `blob.pen`，已移入）、`specs/ui/site-map.md`、`specs/ui/components.md`、`specs/ui/design-tokens.md`、`specs/ui/pages/admin-post-list.md`、`specs/product/feature-roadmap.md`、`specs/backlog/blog-home-reading.md`、F-001 的 `feature-scope.md`、US-08 behaviors 与 US-08 / US-09 验收用例
- **依赖项**: 无
- **被依赖**: F-002 define-feature / design-ui（首页、`/posts` 页面设计）；书影音 Feature
- **决策**:
  - 导航用中文："文章""书影音"，与全站中文一致；首页入口是左侧站点名 / 头像，不单设"首页"导航项
  - F-003 作品集保留在路线图（产品愿景仍是"博客兼作品集"），但暂不进网站地图和导航，等做 F-003 时再加回
  - 页脚许可协议选哪一种待作者定，先按参考站写 CC BY-NC-SA 4.0

## 估算

- **规模**: S

## 备注

- 不涉及代码；设计稿只改了顶栏导航（`SiteNav` 组件），首页 / `/posts` / `/media` 页面稿未动
