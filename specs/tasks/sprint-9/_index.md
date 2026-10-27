# Sprint 9：书影音

**状态**: in_progress（任务 1–11 已实现并完成 code-review（2026-10-23）；任务 12、13、14 已实现（2026-10-27）；2026-10-23 再插入任务 15–16 豆瓣批量导入）
**创建**: 2026-10-21
**Feature**: F-005 书影音（[Backlog: media-douban-sync](../../backlog/media-douban-sync.md)）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：后台 `/admin/media` 录入、编辑、隐藏、删除书影音条目，粘贴豆瓣分享内容自动填好条目信息；读者在 `/media`、`/media/:type` 按分类浏览（[feature-architecture](../../engineering/features/F-005-书影音/architecture/feature-architecture.md)、[ADR-011](../../engineering/features/F-005-书影音/architecture/adr/ADR-011-shelf-domain-douban-recognition.md)、[ADR-012](../../engineering/features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md)）。
> 粒度按 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)（功能点粒度，可跨层，测试清单 2–5 项；spike 单独成任务排最前）。测试执行：任务内只跑本任务测试文件（E2E chromium）；Sprint 末统一跑 webkit 补跑、lint、check、全量 `npm test`、`npm run test:e2e`、`npm run test:build`。
> 未复用 Sprint 7：它是 F-006 的 Sprint，状态 in_progress 只因等待 F-006 code-review；与 Sprint 8 的做法一致，F-005 单独成 Sprint。

## 任务索引

| # | Task | 名称 | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|------|---------|----|------|---------|---------|------|
| 1 | [spike-douban-rexxar](spike-douban-rexxar.md) | spike：Worker 出口访问豆瓣 Rexxar、各分类字段、分享链接、封面；录制夹具，回写 ADR-011 | SETUP | 验证 | US-02 | — | 1 | 高 → 已验证 | completed |
| 2 | [add-shelf-entry-api](add-shelf-entry-api.md) | 条目接口：迁移 0004、`shelf` 领域、增删改查 / 隐藏、封面上传与 `/covers/*`、重建钩子 | API | 数据 + 领域 + 接口 | US-01 | — | 4 | 低 | completed |
| 3 | [add-douban-recognize-api](add-douban-recognize-api.md) | 识别接口：`douban/` 防腐层、白名单与短链、去重、封面 data URL | API | 领域 + 接口 | US-02 | 1、2 | 1 | 中（豆瓣数据形态以 spike 为准） | completed |
| 4 | [add-admin-media-list](add-admin-media-list.md) | 后台条目列表 `/admin/media`：顶栏"书影音"、分类（`MediaTypeTabs` GooeyNav 岛）、`MediaEntryRow`、隐藏 / 删除、空状态 | FRONTEND | 表现层 | US-01 | 2 | 1 | 低 | completed |
| 5 | [add-admin-media-form](add-admin-media-form.md) | 录入 / 编辑页：`MediaEntryForm`、`ShelfCoverField`、`StarRating`、校验、保存、离开确认 | FRONTEND | 表现层 | US-01 | 2、4、11 | 1 | 中（multipart 与封面替换） | completed |
| 6 | [add-recognize-box](add-recognize-box.md) | 表单识别框：识别填表、高亮、部分 / 失败 / 重复、封面预览随保存提交 | FRONTEND | 表现层 | US-02 | 3、5 | 0 | 中 | completed |
| 7 | [add-shelf-reader-data](add-shelf-reader-data.md) | 读者构建数据：`GET /api/shelf`、`virtual:shelf-data`、`src/lib/reader/shelf.ts` | API | 接口 + 构建 | US-03 | 2 | 1 | 低 | completed |
| 8 | [add-media-reader-page](add-media-reader-page.md) | 读者页 `/media`、`/media/:type`：`MediaHeader` / `MediaTypeTabs` / `MediaCard` / `MediaRow`、空状态、封面占位 | FRONTEND | 表现层（reader） | US-03 | 7 | 0 | 低 | completed |
| 9 | [restyle-blue-accent](restyle-blue-accent.md) | 强调色改蓝（tokens.css）、新增评分令牌、清除暖色投影（插入任务，[restyle-blue-accent](../../backlog/restyle-blue-accent.md)） | FRONTEND | 表现层 | — | — | 0 | 低 | completed |
| 10 | [add-media-poster-wall](add-media-poster-wall.md) | 电影、剧集满宽海报墙：Masonry + FlipCard 翻面、悬停片名、"按时间"分段（GradualBlur 吸顶标题）（插入任务，[media-poster-wall](../../backlog/media-poster-wall.md)） | FRONTEND | 表现层（reader） | US-03 | 8 | 0 | 中（三个 React Bits 组件组合、Masonry 源码改动、无 JS 兜底） | completed |
| 11 | [drop-anime-type](drop-anime-type.md) | 去掉"动画"分类、"剧"改名"剧集"：分类枚举、豆瓣映射、迁移 0004 `CHECK`、后台图标表（插入任务，[drop-anime-type](../../backlog/drop-anime-type.md)） | DOMAIN | 领域 + 数据 + 表现层 | US-01、02、03 | 2、3、4 | 1（任务 5） | 低 | completed |
| 12 | [add-game-platform-api](add-game-platform-api.md) | 游戏平台与 IGDB 封面：迁移 0005、`normalizeIgdbCoverUrl` / `readImageSize` / `IgdbImageClient`、写接口与公开接口字段、识别跳过游戏封面（插入任务，[game-case-shelf](../../backlog/game-case-shelf.md)、[ADR-013](../../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)） | API | 数据 + 领域 + 接口 | US-01、02 | 2、3、11 | 2 | 中（IGDB 图片头解析、出站请求防护） | completed |
| 13 | [add-game-form-fields](add-game-form-fields.md) | 录入表单游戏分支：平台下拉、IGDB 封面链接与原比例预览、切换分类、错误提示（插入任务） | FRONTEND | 表现层（admin） | US-01、02 | 12、5、6 | 0 | 低 | completed |
| 14 | [add-game-poster-wall](add-game-poster-wall.md) | 游戏海报墙：`posterAspect` 原比例砖块、`PlatformBadge`、`MediaPoster` 游戏模式（悬停显示平台、背面加平台）、夹具调整（插入任务） | FRONTEND | 表现层（reader） | US-03 | 12、10 | 0 | 中（非 2:3 砖块与静态网格、外链图片的 E2E 拦截） | completed |
| 15 | [add-time-basis-release-year](add-time-basis-release-year.md) | "按时间"可选标记时间 / 发行年份（电影、剧集、游戏）、`groupByReleaseYear`、`MediaTimeBasis`；游戏悬停 `YearBadge`（插入任务，[media-time-basis](../../backlog/media-time-basis.md)） | FRONTEND | 表现层（reader） | US-03 | 14 | 0 | 低 | pending |
| 16 | [unify-media-poster-wall](unify-media-poster-wall.md) | 书、漫画、桌游改为海报墙（桌游 1:1），所有分类满宽统一；删除 `MediaCard`、`MediaRow`（插入任务，[media-wall-all-types](../../backlog/media-wall-all-types.md)） | FRONTEND | 表现层（reader） | US-03 | 14、15 | 0 | 低 | pending |
| 15 | [add-douban-import-api](add-douban-import-api.md) | 豆瓣批量导入与增量同步接口（6 个类别）：迁移 0006 `shelf_import_state`、`douban/import.ts` 标记映射、`fetchInterests`、`importPage`（全量 / 增量、`types` 类别过滤）/ `importState` / `finishImport`、三个路由、录制 `interests-*` 夹具（插入任务，[douban-bulk-import](../../backlog/douban-bulk-import.md)、[ADR-014](../../engineering/features/F-005-书影音/architecture/adr/ADR-014-douban-bulk-import.md)） | API | 数据 + 领域 + 接口 | US-04 | 12、3 | 1 | 中（豆瓣标记接口改版 / 限流、合并覆盖规则、水位前移时机） | pending |
| 16 | [add-douban-import-dialog](add-douban-import-dialog.md) | 后台"从豆瓣导入"弹窗：6 个类别勾选、同步状态与 ID 带出、"同步新标记" / "全量导入"、逐页导入、进度 / 停止 / 汇总 / 失败列表、结束时重建一次（插入任务） | FRONTEND | 表现层（admin） | US-04 | 15、4 | 0 | 低 | pending |
| 17 | [poster-back-filtered-cover](poster-back-filtered-cover.md) | 海报背面铺滤镜封面：镜像、灰度、30% 不透明 + `flip-surface` 渐变，无封面仍为纯色底（插入任务，[poster-back-filtered-cover](../../backlog/poster-back-filtered-cover.md)） | FRONTEND | 表现层（reader） | US-03 | 10 | 0 | 低 | completed |
| 18 | [remove-poster-hover-title](remove-poster-hover-title.md) | 海报墙去掉悬停浮出名称（游戏悬停徽标不受影响）（插入任务，[poster-no-hover-title](../../backlog/poster-no-hover-title.md)） | FRONTEND | 表现层（reader） | US-03 | 10 | 0 | 低 | completed |

共 16 个任务（任务 15–16 为豆瓣批量导入，6 个类别一次全部支持（作者 2026-10-27）：15 接口依赖任务 12 的游戏平台字段，排在 12 之后；16 弹窗随后；任务 12–14 为 2026-10-23 插入的游戏海报墙增量：先做接口 12，表单 13 与读者页 14 无文件重叠可并行；任务 11 为 2026-10-22 插入的去掉"动画"分类，排在任务 4 之后、任务 5 之前；任务 9 为 2026-10-22 作者插入的全站配色调整，与其他任务无依赖，先做；任务 10 为 2026-10-22 插入的电影、剧集海报墙，接在任务 8 之后，任务 8 先按列表行实现电影、剧集）。任务 1 验证唯一的高风险假设（豆瓣非官方接口在 Worker 出口可用），结论不成立时任务 3、6 回到作者决策（Backlog"技术风险"已列退路）；任务 2 被 3 / 4 / 5 / 7 依赖。任务 7、8 与 3–6 无文件重叠，可在任务 2 之后并行。

## 依赖图

```
1 spike-douban-rexxar ─────────────┐
2 add-shelf-entry-api ─┬───────────┴→ 3 add-douban-recognize-api ─┐
                       ├→ 4 add-admin-media-list → 5 add-admin-media-form ─┴→ 6 add-recognize-box
                       └→ 7 add-shelf-reader-data → 8 add-media-reader-page → 10 add-media-poster-wall
2、3、11 ─→ 12 add-game-platform-api ─┬→ 13 add-game-form-fields（另依赖 5、6）
                                      ├→ 14 add-game-poster-wall（另依赖 10）
                                      └→ 15 add-douban-import-api（另依赖 3）→ 16 add-douban-import-dialog（另依赖 4）
```

## 覆盖检查

| 设计元素 | 任务 |
|---------|------|
| US-01 AC1、AC7、AC8、AC10（列表、隐藏、删除、鉴权页面） | 4（接口 2） |
| US-01 AC2–AC6、AC9（表单、校验、封面、在读 → 读过） | 5（接口 2） |
| US-01 写接口、封面存储、重建、鉴权接口（TC-US01-02–13、15） | 2 |
| US-02 AC1–AC11 前端（TC-US02-14–22） | 6 |
| US-02 识别接口、SSRF、去重（TC-US02-01–13） | 3（数据形态 1） |
| US-03 AC1–AC11（TC-US03-01–18） | 7、8 |
| shelf domain-model §1–§8、api-contract 全部端点、data-model（迁移 0004） | 2、3、7 |
| reader module-spec §1.3 | 7 |
| Backlog [gooey-media-tabs](../../backlog/gooey-media-tabs.md)（分类导航 GooeyNav，2026-10-22 并入） | 4（组件与单元测试）、8（读者页挂载、TC-US03-11 改口径） |
| components.md：`AdminHeader`（书影音）、`MediaEntryRow`、`RecognizeBox`、`StarRating`、`MediaTypeTabs`、`MediaCard`、`MediaRow`、`MediaHeader`、`MediaList`、`MediaEntryForm` | 4、5、6、8 |
| 前端单元测试规格 UT-01–14 | 4（UT-13 后台部分、14）、5（UT-06、07、08）、6（UT-04、09、10、11）、7（UT-01–03、05）、8（UT-12、13） |
| 跨 Feature 影响：F-006（`covers/` 前缀不进 `images`） | 2（集成测试断言封面不写 `images`） |
| 跨 Feature 影响：F-001 `AdminHeader` | 4 |
| 跨 Feature 影响：F-002 `readerData` 插件、`test:build` | 7、8 |
| Backlog [media-poster-wall](../../backlog/media-poster-wall.md)（电影、剧集海报墙，2026-10-22 插入）；US-03 AC12、AC13，TC-US03-19、20，UT-15、16 | 10 |
| Backlog [game-case-shelf](../../backlog/game-case-shelf.md)（游戏海报墙，2026-10-23 插入）；US-01 AC11，US-02 AC9，US-03 AC14；TC-US01-26–29、TC-US02-23、TC-US03-21–23；SHELF-UT-12–15；UT-17–19；ADR-013；迁移 0005 | 12、13、14 |
| Backlog [douban-bulk-import](../../backlog/douban-bulk-import.md)（豆瓣批量导入，2026-10-23 插入）；US-04 AC1–AC12（含增量同步）；TC-US04-01–26；SHELF-UT-16–22；UT-20–22；ADR-014；迁移 0006；admin.pen 11i、Row 8 | 15、16 |
| Backlog [media-time-basis](../../backlog/media-time-basis.md)（"按时间"发行年份、游戏悬停年份、背面去平台）；US-03 AC13、AC14，BH-23；TC-US03-24；UT-20 | 15（背面去平台在 14） |
| Backlog [media-wall-all-types](../../backlog/media-wall-all-types.md)（所有分类统一海报墙）；US-03 AC4、AC10、AC12、AC13，BH-05、06、07、15；TC-US03-05、06、07、11、13、17 | 16 |
| 跨 Feature 影响：F-004 Pagefind 是否索引 `/media` | 不在本 Sprint：记入 F-004 Backlog 备注（任务 8 完成后反哺） |

DDL 变更：迁移 `0004_shelf_entries.sql`（任务 2 实现时追加到 [ddl-changes.md](../../deploy/ddl-changes.md)，必须先于代码部署）；迁移 `0005_shelf_game_platform_cover.sql`（任务 12 实现时追加，线上须在 0004 之后、代码部署之前执行）；迁移 `0006_shelf_import_state.sql`（任务 15 实现时追加，须在代码部署之前执行）。无新增 npm 依赖（GooeyNav 无依赖；海报墙的 Masonry 改用 lucide 图标、FlipCard 用已有 motion、GradualBlur 无依赖；spike 若需 base32 / UA 工具，用内置实现）。

## DoD（Sprint 级）

- [ ] 所有任务 completed（1–14、17、18 完成；15、16 待实现）
- [x] `npm run lint`、`npm run check`、`npm test`、`npm run test:e2e`（chromium + webkit）、`npm run test:build` 通过（2026-10-22：chromium 全过；webkit / chromium-media 的失败为并发负载超时，单独复跑通过，见 validation）
- [ ] Backlog 验收条件逐条勾选；code-review → verify（2026-10-23 任务 1–11 code-review 完成，[报告](../../test/features/F-005-书影音/reviews/code-review.md)；任务 12–14 实现后补审）
- [x] `ddl-changes.md` 有 0004 条目（⏳ 待执行）
