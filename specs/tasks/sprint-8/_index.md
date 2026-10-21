# Sprint 8：Afilmory 外链照片

**状态**: completed（已发布 2026-10-21，版本 cddbd7ac）
**创建**: 2026-10-19
**Feature**: F-001 文章写作（[Backlog: afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：粘贴 Afilmory 分享代码 / 照片页链接就能插入外链照片；预览与读者页按原图比例显示，先缩略图、进入视口换主图，灯箱显示主图，能播放 HEVC 时支持实况（[US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md)、[ADR-010](../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)）。
> 粒度按 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)（功能点粒度，可跨层，测试清单 2–5 项）。测试执行：任务内只跑本任务测试文件（E2E chromium）；Sprint 末统一跑 webkit 补跑、lint、check、全量 `npm test`、`npm run test:e2e`、`npm run test:build`。
> 风险已在规划前验证（2026-10-19）：清单 v10 结构、子目录照片与缩略图位置、GitHub raw 的 Range / CORS（OPTIONS 预检 403，但 Chromium、WebKit 跨域单段 Range 不发预检，均 206）；Playwright Chromium 不支持 HEVC、WebKit 支持。因此不单列 spike。

## 任务索引

| # | Task | 名称 | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|------|---------|----|------|---------|---------|------|
| 1 | [add-afilmory-photo-api](add-afilmory-photo-api.md) | 照片信息接口：站点配置、清单解析、`GET /api/admin/afilmory/photos/{id}` | API | 配置 + 领域 + 接口 | US-13 | — | 1 | 中（Worker 抓外站、thumbhash 平均色） | completed |
| 2 | [render-external-photos](render-external-photos.md) | 渲染：`ext=` / `mp=` 解析，输出缩略图与 `data-thumb` / `data-mp`；构建夹具 | FRONTEND | 表现层（markdown） | US-13 | 1（配置） | 3 | 低 | completed |
| 3 | [add-external-photo-loading](add-external-photo-loading.md) | 预览与读者页：先缩略图、进入视口按字节范围换主图 | FRONTEND | 表现层 | US-13 | 2 | 2 | 中（替换时不重置加载状态） | completed |
| 4 | [add-afilmory-paste](add-afilmory-paste.md) | 粘贴分享代码 / 链接：占位、获取卡片、生成引用、失败重试 | FRONTEND | 表现层 | US-13 | 1、2 | 0 | 中 | completed |
| 5 | [add-external-live-playback](add-external-live-playback.md) | 外链实况：HEVC 判断、按字节范围读视频；图片菜单实况项 | FRONTEND | 表现层 | US-13 | 3 | 0 | 中 | completed |
| 6 | [add-lightbox-external-main](add-lightbox-external-main.md) | 读者页灯箱显示主图、组图主色 | FRONTEND | 表现层（reader） | US-13 | 3 | 0 | 低 | completed |

共 6 个任务。任务 1 涉及外部服务与新依赖，排在最前；任务 2 被 3 / 4 / 5 / 6 依赖。

## 依赖图

```
1 add-afilmory-photo-api → 2 render-external-photos → 3 add-external-photo-loading ─┬─→ 5 add-external-live-playback
                         └────────────────────────→ 4 add-afilmory-paste            └─→ 6 add-lightbox-external-main
```

## 覆盖检查

| 设计元素 | 任务 |
|---------|------|
| US-13 AC1、AC2、AC3、AC4、AC5（粘贴、多张、标签、失败、实况开关） | 4（接口 1） |
| US-13 AC6（缩略图 → 主图、组图主色、灯箱主图） | 2、3、6 |
| US-13 AC7（实况 HEVC / 退回） | 5 |
| US-13 AC8（未登记前缀不解析） | 2 |
| media api-contract `GET /api/admin/afilmory/photos/{id}`、domain-model §10 | 1 |
| components.md：`UploadCard` `fetching`、`ArticleImage` `external` / `live.range` | 3、4、5 |
| 对 F-002 的影响（读者页、灯箱、构建夹具） | 2、3、6 |
| 对 F-006 的影响 | 无（feature-architecture §8.1） |

无 DDL 变更；新增依赖 `thumbhash`（MIT，仅服务端）。

## 审查修复（2026-10-21 轻量审查）

作者先选择轻量审查（6 个风险点：安全、粘贴误判、文件上传回归、资源占用、竞态、预览复用）；之后要求全面审查，结果见 [code-review 增量审查](../../test/features/F-001-文章写作/reviews/code-review.md)（另修 1 项 MUST-FIX：HEVC 判断用简写 `hvc1`，Chrome 返回空串）。

| # | 问题 | 处理 |
|---|------|------|
| 1 | 主图读到但解码失败时显示坏图（BH-12 要求退回缩略图） | 修复：`useMainFallback`（`ArticleImage`、组图单元格）；UT-173 补用例 |
| 2 | 作者只改 `mp=`（原图不变）时，实况层沿用已读取的旧视频：`LivePhotoLayer` 按原图地址判断来源，`video.src` 为命令式设置 | 修复：来源 = 原图 + 字节范围，`video` 以此为 key 重建；UT-174 补用例 |
| 3 | 读取缓存只按地址作 key，改了 `mp=` 仍返回旧字节 | 修复：缓存 key 含字节范围；UT-172 补用例 |
| 4 | 读到的主图 / 视频以 blob 形式在页面会话内常驻（正文与灯箱共用），一篇 20 张动态照片约 60MB 内存 | 按 ADR-010 设计接受；后续 Worker 缓存代理（Backlog 备注）可改为直接用地址、不再常驻 |
| — | 安全（前缀判断含点段 / 前缀子串 / 带用户名的伪装地址、`data-*` 只由插件生成、接口只请求登记站点）、粘贴误判（整段匹配）、文件上传回归（全量 `npm test`、chromium E2E 全过）、预览复用（复用实例每次都传新 content） | 未发现问题 |

## DoD（Sprint 级）

- [x] 所有任务 completed
- [x] `npm run lint`、`npm run check`、`npm test`、`npm run test:e2e`、`npm run test:build` 通过（结果见 [sprint-8-task-results](../../test/features/F-001-文章写作/validation/sprint-8-task-results.md)；WebKit 并行负载失败单 worker 重跑通过，TC-US06-07 为既有不稳定用例）
- [x] Backlog 验收条件逐条勾选；code-review → verify（[validation-report](../../test/features/F-001-文章写作/validation/validation-report.md)"Sprint 8 增量验证"）
