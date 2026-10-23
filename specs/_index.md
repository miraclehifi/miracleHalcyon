# miracleHalcyon Specs 索引

**最后更新**: 2026-10-21

> 个人技术博客兼作品集。Astro 7 + React 19 + Cloudflare（D1 / R2）。

## 产品

- [产品愿景](product/product-vision.md)
- [Feature 路线图](product/feature-roadmap.md)
- [全局 NFR](product/nfr.md)

## UI

- **design_system**: 自定义（Tailwind CSS 4 + tw93 风格令牌（楷体 · 白底 · 蓝色强调，参考 Aceternity），见 [ui/design-tokens.md](ui/design-tokens.md)）
- [站点地图](ui/site-map.md) · 设计稿 [ui/admin.pen](ui/admin.pen)

## Feature 状态

| Feature | 名称 | 状态 | 当前阶段 |
|---------|------|------|----------|
| F-001 | 文章写作 | in_progress | 增量 media-upload-experience：Sprint 6 实现完成，待 code-review（主体 validation done，Sprint 5 补齐 P0） |
| F-002 | 博客首页与阅读 | in_progress | validation done（待发布确认，发布跟随 F-001） |
| F-005 | 书影音 | in_progress | 设计完成（shelf 领域、ADR-011 / 012 / 013）；Sprint 9 实现 11 / 14（后台录入与豆瓣识别、读者页 /media 与电影 / 剧集海报墙）；2026-10-23 插入任务 12–14 游戏海报墙（平台、IGDB 封面）待实现 |
| F-006 | 媒体存储清理 | in_progress | implementation done（Sprint 7，4 / 4）；待全量 E2E 后 code-review |

## 队列

- [Backlog](backlog/_index.md)
- [Sprint 任务](tasks/)
