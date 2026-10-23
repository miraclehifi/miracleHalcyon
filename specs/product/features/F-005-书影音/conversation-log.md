# 对话记录 — F-005

> 本文件由 sdd:log-conversation 自动维护，记录每个 SDD 阶段结束时的关键决策与对话摘要。

## [define-feature] 2026-10-21 · miraclehifi

**关键决策**
- 作为新 Feature F-005 创建（新 Domain、新工作流、可独立交付），范围直接取自 ready 状态的 Backlog [media-douban-sync](../../../backlog/media-douban-sync.md)（2026-10-19 改方案版：手动录入 + 豆瓣链接识别，无 RSS / Cron）
- 后台路由用 `/admin/media`（F-006 当初已避开此名），顶栏新增"书影音"入口
- 封面转存 R2 复用 `MEDIA` 桶；反向影响记入 F-006：封面不能被存储清理误判为未引用图片，由 design-arch 确认
- 新增 Feature NFR：识别接口只请求豆瓣白名单域名（防 SSRF）、短链最多 3 跳、单次 ≤ 8s；封面按文件头校验、≤ 5MB，失败不阻塞保存
- 成功指标含"spike 样例链接标题与封面识别成功 ≥ 90%"和"读者页零豆瓣域名请求"

**对话摘要**
- 用户：「开始开发书影音的需求」
- AI：Backlog 已 ready 且含完整作者决定，按作者"文档不找我确认"的偏好直接写 feature-scope / nfr，继续 group-stories

## [design-domain] 2026-10-21 · miraclehifi

**关键决策**
- 新领域命名 `shelf`（书架）：界面仍叫"书影音"、路由 `/media` / `/admin/media`、组件 `Media*`；表 `shelf_entries`（迁移 0004），接口 `/api/admin/shelf/*`、公开 `/api/shelf`（ADR-011）
- 豆瓣识别做成 `shelf/douban/` 防腐层：Rexxar 接口 + 主机白名单 + 短链逐跳校验（≤ 3 跳）+ 8 秒总时限；数据源细节待 spike 验证
- **封面改为识别时下载**（以 data URL 返回给表单预览），保存接口只收文件、不接受外部 URL——SSRF 面只剩识别一处，豆瓣 CDN 418 也不影响预览；已同步 US-02 AC9、BH-20/21、TC-US02-01/09/11/12/22、页面规格与 NFR
- 封面存 R2 `covers/` 前缀、经 `/covers/*` 读取（immutable），不写 `images` 表，F-006 清理不会误删
- 读者页：`virtual:shelf-data`（同一 readerData 插件，接口 404 视为空以兼容首次部署）+ `/media`、`/media/:type` 路径路由预渲染、零 JS（ADR-012）
- design-ui 决定：非书 / 漫画分类用列表行；封面统一 2:3；后台表单独立页 `/admin/media/new`、`/admin/media/:id`；新增组件 `MediaEntryRow`、`RecognizeBox`、`RatingInput`（admin.pen 09c、10、10m、11、11m、11b）
- 去重：`douban_id` 部分唯一索引；编辑时 `excludeId` 排除自身；隐藏条目也参与去重

**对话摘要**
- 用户：「开始开发书影音的需求」
- AI：按作者偏好文档阶段不逐项确认，连续完成 define-feature → write-story → write-behavior → design-acceptance → design-ui → design-arch → design-domain；架构与 UI 结论标注"待事后审阅"

## [design-domain] 2026-10-23 · miraclehifi

**关键决策**
- 游戏页不做实体游戏盒、也不做独立 GameCard：与电影海报墙同版式（复用 `MediaPosterWall` / `MediaPoster`），实体盒与 Steam 卡方案移入 admin.pen 存档区，不实现
- 游戏封面全部直接引用 images.igdb.com 大图（规范化为 `t_1080p/{id}.jpg`），不下载到 R2、不接 IGDB API；保存时只向该主机读取图片头得到宽高（ADR-013，ADR-011 §3 / ADR-012 的受限例外）
- 砖块比例与大图实际宽高比一致、不裁切（实测 IGDB 图不一定是 3:4，如 811×1080）；无封面按 3:4
- 悬停不显示游戏名，左下角显示平台徽标（PS5 / PS4 / Switch / Switch 2 / Steam，Simple Icons 官方路径）；翻面背面在名称下方加平台，不显示开发商；触屏正面不显示平台
- 新增平台字段（游戏必填）与 `cover_url` / 宽高，迁移 0005；识别为游戏时不取豆瓣封面；桌游仍为列表行
- Sprint 9 插入任务 12 接口、13 表单、14 读者页

**对话摘要**
- 用户：「开发方案不用各种各样的平台盒子了，统一用steam的样式，悬浮后显示对应的平台图标」→ 随后「图片布局和电影保持一致吧，不用刻意迎合图片比例」「保持图片的原有比例」
- 用户：「hover后显示游戏平台，不要显示游戏名称」「点击游戏卡片翻面的交互也做一下」
- 用户：「我直接用images.igdb.com的大图链接」「所有图片都用images.igdb.com不要考虑steam等比例」「比例和大图比例一样，不要裁剪」
- AI：建议外链图在保存时读取宽高供 Masonry 预排，出站请求只允许 images.igdb.com、不跟随跳转、限 64 KB 与 8 秒；来源说明注明"封面来自 IGDB"
- 用户：「开始写文档」
