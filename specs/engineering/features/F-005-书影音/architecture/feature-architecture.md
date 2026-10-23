# F-005 书影音 — 架构设计

**最后更新**: 2026-10-23
**状态**: draft

> 来源：[feature-scope](../../../../product/features/F-005-书影音/feature-scope.md) · [Feature NFR](../../../../product/features/F-005-书影音/nfr.md) · [US-01](../../../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md) · [US-02](../../../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/story.md) · [US-03](../../../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) · [US-04](../../../../product/features/F-005-书影音/stories/media-shelf/US-04-douban-import/story.md) · [admin-media.md](../../../../ui/pages/admin-media.md) · [reader-media.md](../../../../ui/pages/reader-media.md)

---

## 1. 架构概览

```
后台（SSR + React 岛）                                 读者端（构建时预渲染，分类导航岛 + 电影 / 剧集海报墙岛）
/admin/media[?type] · /admin/media/new · /admin/media/:id   /media · /media/:type
   │ GET/POST/PUT/DELETE /api/admin/shelf/entries[/:id]          ▲  virtual:shelf-data
   │ POST /api/admin/shelf/entries/:id/{hide,unhide}             │  （readerData 插件，构建时 GET /api/shelf）
   │ POST /api/admin/shelf/recognize                             │
   │ GET  /api/admin/shelf/import/state（US-04，ADR-014）        │
   │ POST /api/admin/shelf/import[/finish]                       │
   ▼                                                             │
middleware（会话 + Origin，沿用 auth；/api/shelf 公开）        GET /api/shelf ── 显示中条目
   ▼                                                             │
API 路由 src/pages/api/admin/shelf/*、src/pages/api/shelf.ts ────┘
   ▼
shelf · ShelfService（新领域，src/domains/shelf/）
   ├─ entry.ts      纯领域：校验、排序、状态与分类规则
   ├─ repo.ts       ShelfRepo（D1 shelf_entries）
   ├─ cover-store.ts CoverStore（R2 MEDIA，前缀 covers/）
   ├─ douban/       防腐层：链接提取、白名单、Rexxar 客户端（不跟随跳转）、字段映射、封面下载（ADR-011）；用户标记列表与 mapInterest（ADR-014）
   └─ hooks.ts      ShelfHooks.onShelfChanged → 路由层适配 createDeployHookHooks（ADR-012）
                                                                 GET /covers/{yyyy}/{mm}/{file} ← R2 covers/
```

新增一个领域 `shelf`；不改 `post`、`media`、`auth` 的领域逻辑。有 DDL 变更（新表 `shelf_entries`，迁移 `0004`）。

## 2. Domain 边界与职责

| Domain / 模块 | 变更 | 新增 / 变更接口 |
|---------------|------|----------------|
| `shelf`（新增） | 条目增删改、隐藏、读者端只读列表、豆瓣识别、封面存取 | `ShelfService.list(type)`、`get(id)`、`create(input, coverFile?)`、`update(id, input, coverChange)`、`setHidden(id, hidden)`、`remove(id)`、`listPublic()`、`recognize(text, excludeId?)`、`importState(uid?)`、`importPage(uid, kind, status, mode, start, head?)`、`finishImport(changed)`（US-04）；`ImportStateRepo`（D1 `shelf_import_state`）；`ShelfRepo`、`CoverStore`、`DoubanClient`（接口注入，测试替身） |
| `auth` | 无 | 沿用 middleware：`/admin/**` 页面 302、`/api/admin/**` 401 / Origin 403 |
| `reader` 模块 | 增量 | `readerData()` 新增 `virtual:shelf-data`；新纯函数 `src/lib/reader/shelf.ts`（分组、排序、计数文案、状态动词） |
| `rebuild` | 无改动，复用 | `createDeployHookHooks` 适配 `ShelfHooks` |
| `post`、`media` | 无 | — |

**依赖方向**：API 路由 → `ShelfService` → `ShelfRepo` / `CoverStore` / `DoubanClient` / `ShelfHooks`。`shelf` 不依赖其他领域；读者页只经公开接口与虚拟模块读取。

## 3. 数据流

### US-01 录入与管理

```
新增：POST /api/admin/shelf/entries（multipart：fields JSON + 可选 cover 文件）
→ ShelfService.create
   1. entry.normalize(fields) 校验（标题、分类、状态、评分、年份、日期、长度）→ 400 VALIDATION_FAILED
   2. doubanId 非空且已存在 → 409 DUPLICATE_DOUBAN_ID
   3. 有封面文件：文件头校验 jpg/png/webp、≤ 5 MB → 400 COVER_TYPE_INVALID / COVER_TOO_LARGE；CoverStore.put → key
   4. ShelfRepo.insert；失败 → CoverStore.delete(key) 回滚
   5. hooks.onShelfChanged()（waitUntil，失败只记日志）→ 201 entry

编辑：PUT /api/admin/shelf/entries/:id（multipart：fields + coverChange = keep | remove | 新文件）
   新封面先 put → 更新行 → 成功后删除旧对象（失败只记日志，不影响响应）；remove 同理先更新行再删对象
   内容无变化也视为编辑（触发重建）

隐藏 / 取消隐藏：POST …/:id/hide | unhide → ShelfRepo.setHidden；状态实际变化时才触发重建（幂等）
删除：DELETE …/:id → ShelfRepo.delete → CoverStore.delete（失败只记日志）→ 重建 → 204
列表：GET /api/admin/shelf/entries?type= → 全部条目（含隐藏），按 entry.sort 排序
```

后台页面为 SSR：`/admin/media` 的 Astro 页面在服务端直接调用 `ShelfService.list(type)` 渲染首屏（与文章列表同模式），React 岛只处理隐藏 / 删除交互。

### US-02 识别

```
POST /api/admin/shelf/recognize { text, excludeId? }
→ ShelfService.recognize（8 秒总时限）
   1. douban.extractDoubanLink(text) → 无 / 非白名单 → 422 NOT_DOUBAN_LINK；非条目链接 → 422 NOT_SUBJECT_LINK
   2. App 分享链接（dispatch）与条目链接直接解析出条目 ID，不发请求；所有外发请求 redirect: manual
   3. ShelfRepo.findByDoubanId(id)（排除 excludeId）→ 有 → 200 { duplicate: { id, title, status, type, markedOn } }
   4. DoubanClient.fetchSubject(kind, id)（Rexxar，Referer）→ 非 200 / 超时 → FETCH_FAILED；无标题 / 非 JSON → PARSE_FAILED
   5. douban.mapSubject → RecognizedFields + missing
   6. 有封面地址（白名单图片域）→ 下载、校验 → coverData（data: URL）；失败 → coverData null，missing 加 cover
   7. 200 { fields, missing }
保存时封面以文件随表单提交（同 US-01），保存接口不接受外部 URL（ADR-011 §3）
```

### US-04 豆瓣批量导入（ADR-014）

```
打开：GET /api/admin/shelf/import/state[?uid=] → { uid, steps[6]: { kind, status, watermark, syncedAt } }
        → 有任一 syncedAt：主按钮"同步新标记"（mode=incremental），否则只有"全量导入"（mode=full）
DoubanImportDialog（前端驱动，顺序 movie·done → movie·doing → book·done → book·doing → game·done → game·doing）
  每类循环：POST /api/admin/shelf/import { uid, kind, status, mode, start, head? }（第 2 页起带回第 1 页的 head）
  → ShelfService.importPage（25 秒总时限，外部并发 ≤ 5）
     1. isValidDoubanUid / kind / status / start 校验 → 400 VALIDATION_FAILED（不发外部请求）
     2. DoubanClient.fetchInterests(count=20) → 404 DOUBAN_USER_NOT_FOUND / 403 DOUBAN_FORBIDDEN / 其余 502 FETCH_FAILED
     2b. ImportStateRepo.touch(uid, kind, status)（attempted_at）；mode=incremental 且有 watermark → 只保留 create_time >= watermark 的标记，出现更早的标记 → reached = true
     3. 过滤 status ∉ {done, doing}；ShelfRepo.findByDoubanIds(本页 ID)
     4. 每条：书 → fetchBookTags；游戏 → fetchSubject(game)（开发商）；失败按缺失处理
        mapInterest → normalizeEntryInput；新条目且非游戏 → 下载封面 → CoverStore.put
        新 → insert；已有 → 合并覆盖（hidden / 封面不动）→ update；单条异常记 failed[]
     5. nextStart = reached || start+20 >= total ? null : start+20
        nextStart = null → ImportStateRepo.complete(uid, kind, status, head)（watermark = head ?? 原值，synced_at = now）
     6. 200 { total, head, nextStart, created, updated, coverFailed, failed }
  nextStart 为 null → 下一步骤；停止 / 出错 → 结束
  结束：POST /api/admin/shelf/import/finish { changed } → changed > 0 时 hooks.onShelfChanged() 一次
```

### US-03 读者页

```
构建：readerData() → GET {READER_API_ORIGIN}/api/shelf → virtual:shelf-data
预渲染 /media、/media/{6 类}：shelf.ts 分组排序 → MediaHeader / MediaTypeTabs / MediaList（Astro 组件）
运行时：读者只请求静态 HTML 与 /covers/*（R2，immutable 缓存）；游戏页另直接加载 images.igdb.com 的 t_1080p 封面（ADR-013）
写操作 → onShelfChanged → Deploy Hook → 重建（P95 ≤ 5 分钟）
```

## 4. 前端组件架构

### 4.1 路由 → 入口

| 路由 | 入口文件 | 渲染 | 变更 |
|------|---------|------|------|
| `/admin/media` | `src/pages/admin/media/index.astro`（`prerender = false`） | SSR 首屏 + `MediaEntryList client:load` | 新增 |
| `/admin/media/new` | `src/pages/admin/media/new.astro` | `MediaEntryForm client:load`（`mode="create"`、`defaultType` 取查询参数） | 新增 |
| `/admin/media/:id` | `src/pages/admin/media/[id].astro` | 服务端取条目，不存在 → 404；`MediaEntryForm client:load`（`mode="edit"`） | 新增 |
| `/admin`、`/admin/storage` | 现有页面 | `AdminHeader` 导航新增项 | 修改（组件内） |
| `/media` | `src/pages/media/index.astro`（`prerender = true`） | Astro 组件；仅 `MediaTypeTabs client:load` | 新增 |
| `/media/:type` | `src/pages/media/[type].astro`（`getStaticPaths` 6 类） | 同上 | 新增 |
| `/covers/*` | `src/pages/covers/[...key].ts` | R2 读取 | 新增 |
| API（US-04） | `src/pages/api/admin/shelf/import.ts`、`import/finish.ts`、`import/state.ts` | — | 新增 |
| API | `src/pages/api/admin/shelf/entries/index.ts`、`entries/[id].ts`、`entries/[id]/hide.ts`、`entries/[id]/unhide.ts`、`recognize.ts`；`src/pages/api/shelf.ts` | — | 新增 |

### 4.2 组件 / 模块

| 组件 / 模块 | 路径 | 变更 |
|------------|------|------|
| `AdminHeader` | `src/components/admin/AdminHeader.tsx` | 修改：导航"书影音"（`library` 图标）、`current="media"`、手机站点名 18px、图标间距 0 |
| `MediaTypeTabs` | `src/components/reader/MediaTypeTabs.tsx` | 新增：React 岛（`client:load`），内部渲染 vendor `GooeyNav`（`src/components/vendor/react-bits/GooeyNav.tsx`）；`hrefFor` 由页面算好的 `items`（`label`、`href`）传入（函数不能跨岛序列化）；读者页与后台列表页共用（[gooey-media-tabs](../../../../backlog/gooey-media-tabs.md)，原为 `.astro` 零 JS） |
| `MediaHeader`、`MediaList` | `src/components/reader/*.astro` | 新增（先行稿组件首次实现）；`MediaCard`、`MediaRow` 已实现后于 2026-10-23 废弃删除（所有分类改为海报墙，[media-wall-all-types](../../../../backlog/media-wall-all-types.md)） |
| `MediaPosterWall`、`MediaPoster`、`MediaTimeHeading`、`MediaTimeToggle`、`MediaTimeBasis`、`PlatformBadge`、`YearBadge` | `src/components/reader/*.tsx` | 新增：所有分类的满宽海报墙（2026-10-23 起书、漫画、桌游也用，砖块比例见 `posterAspect`）；电影、剧集、游戏满宽海报墙（游戏砖块按 `posterAspect` 保持封面原比例、`MediaPoster` 游戏模式悬停显示 `PlatformBadge` 不显示名称、背面加平台，ADR-013）；电影、剧集 React 岛（`client:load`）；内部渲染 vendor `Masonry`（加 `renderTile`、hugeicons 换 lucide、导出 caption 样式）、`FlipCard`、`GradualBlur`（`src/components/vendor/react-bits/`）；分段用纯函数 `groupByTime`（reader module-spec §2），在浏览器按当天日期计算；"按时间"按钮经 `createPortal` 挂到页面槽位，选择存 `localStorage`；服务端输出不分段静态网格兜底，`BaseLayout` 内联脚本加 `<html data-js>`（[media-poster-wall](../../../../backlog/media-poster-wall.md)） |
| `MediaEntryList` | `src/components/admin/media/MediaEntryList.tsx` | 新增：行列表 + 隐藏 / 删除状态、`ConfirmDialog`、`Toast` |
| `MediaEntryRow` | `src/components/admin/media/MediaEntryRow.tsx` | 新增（components.md）；手机 ⋯ 用已有 `Menu` |
| `MediaEntryForm` | `src/components/admin/media/MediaEntryForm.tsx` | 新增（页面区块）：表单状态、校验、提交、离开确认 |
| `RecognizeBox` | `src/components/admin/media/RecognizeBox.tsx` | 新增 |
| `DoubanImportDialog` | `src/components/admin/media/DoubanImportDialog.tsx` | 新增（US-04）：打开时读同步状态、ID 输入、"同步新标记" / "全量导入"、逐页调用导入接口、进度 / 停止 / 汇总 / 失败列表、结束调用 finish；`MediaEntryList` 标题行旁的"从豆瓣导入"按钮打开，`onFinished` 后 `location.reload()` 刷新 SSR 列表；弹窗外壳参照 `ConfirmDialog` 的焦点管理（不改 `ConfirmDialog`） |
| `StarRating` | `src/components/ui/StarRating.tsx` | 新增（通用输入，放 ui/） |
| 封面区 | `MediaEntryForm` 内复用 `src/components/admin/editor/CoverField.tsx` | **评估复用**：现有 CoverField 是 96×96 方形 + 立即上传到 `/api/admin/images`；书影音需要 2:3、保存时随表单提交。改为给 CoverField 加 `aspect` 与"只选文件不上传"模式会侵入写文章页，故新建轻量 `ShelfCoverField`（`src/components/admin/media/ShelfCoverField.tsx`），沿用 CoverField 的样式类与拖放交互写法 |
| 已有复用 | `PageHeader`、`Button`、`IconButton`、`Field`、`SegmentedItem`（文章列表筛选所用）、`ConfirmDialog`、`Toast`、`EmptyState`、`Menu` | 不改 |
| 后台接口客户端 | `src/lib/admin/shelf-client.ts` | 新增（沿用 `src/lib/api/http.ts` 约定；multipart 提交） |
| 读者纯函数 | `src/lib/reader/shelf.ts` | 新增 |
| 共享纯函数 | `src/domains/shelf/entry.ts`（`statusLabel`、`creatorLabel`、`sortEntries`、校验） | 新增；前端表单校验与后台排序共用（纯 TS，无 I/O，可被前端导入） |

### 4.3 组件树

```
admin/media/index.astro
├── AdminHeader(current="media")
├── PageHeader（书影音 + 计数 + 从豆瓣导入 + 新增条目）
├── DoubanImportDialog                         ← client:load（US-04，由"从豆瓣导入"打开）
├── MediaTypeTabs(items, value)               ← client:load（href=/admin/media?type=）
└── MediaEntryList(entries, type)            ← client:load
    ├── MediaEntryRow ×N（编辑链接 / 隐藏 / 删除；手机 ⋯ Menu）
    ├── EmptyState（无条目）
    └── ConfirmDialog(danger)；Toast 经 ToastProvider

admin/media/new.astro · [id].astro
├── AdminHeader(current="media")
└── MediaEntryForm(mode, entry?, defaultType)  ← client:load
    ├── BackLink / 标题
    ├── RecognizeBox(excludeId) → onRecognized / onDuplicate
    ├── ShelfCoverField
    ├── Field ×N（分类 select、标题、作者、年份、短评）+ 豆瓣链接只读行
    ├── SegmentedItem ×2（状态）+ Field（日期）+ StarRating
    ├── 底部：取消 / 保存（编辑页另有删除）
    └── ConfirmDialog(default)（放弃改动 / 去编辑前确认）；Toast

media/index.astro · [type].astro（ReaderLayout）
├── SiteHeader(current="media")
├── MediaHeader
├── MediaTypeTabs(items, value)               ← client:load（href=/media、/media/{type}）
├── MediaList → MediaPosterWall（全部分类，client:load）→ [MediaTimeHeading + GradualBlur] → Masonry → MediaPoster(FlipCard) ×N；MediaTimeToggle → 页面槽位 | EmptyState
├── 来源说明
└── BackLink、SiteFooter
```

全部为本地组件，无外部 SDK。前置确认项：无（豆瓣接口可用性由 spike 验证，见 §7）。

## 5. 数据模型概要（详见 design-domain）

`shelf_entries`：`id`、`type`、`title`、`creator`、`year`、`status`、`rating`、`marked_on`、`comment`、`cover_key`、`platform`、`cover_url`、`cover_width`、`cover_height`（迁移 0005，游戏专用）、`douban_id`（部分唯一索引 `WHERE douban_id IS NOT NULL`）、`douban_url`、`hidden`、`created_at`、`updated_at`、审计列。索引 `(type, hidden)`。

`shelf_import_state`（迁移 0006，US-04 增量同步）：主键 (`uid`, `kind`, `status`)，`watermark`、`synced_at`、`attempted_at`、审计列。

## 6. 跨 Feature 影响

| 已有 Feature | 影响维度 | 描述 | 需要的动作 |
|-------------|---------|------|-----------|
| F-006 媒体存储清理 | 共享资源（R2 `MEDIA`） | 封面与文章图片同桶。F-006 只处理 `images` 表登记的 key（`ImageCleanupRepo.listAll`），封面不写 `images`、前缀为 `covers/`，**不会被误删**；F-006 统计也不含封面体积 | 无代码改动；在 media domain-model 不变量处补一句"`covers/` 前缀归 `shelf`，存储清理不处理"；shelf 自己负责封面生命周期（换封面、删条目时删除） |
| F-001 文章写作 | UI（`AdminHeader`） | 导航新增"书影音"，手机端 5 个图标 | 本 Feature 任务内修改组件；admin.pen 已同步 |
| F-001 | 共享模块（Deploy Hook） | 复用 `createDeployHookHooks`；条目写操作会触发与文章发布相同的重建 | 无改动；连续操作各触发一次构建（与 ADR-007 一致） |
| F-001 | 组件复用评估（`CoverField`） | 不修改，新建 `ShelfCoverField`（理由见 §4.2） | 无 |
| F-002 博客首页与阅读 | 构建（`readerData` 插件） | 新增 `virtual:shelf-data` 与一个构建请求；接口 404 时回退空数组（首次部署兼容） | 修改插件；README 首次部署步骤不变 |
| F-002 | 读者外壳 | `SiteNav current="media"` 已预留；`/media` 由 404 变为真实页面 | `test:build` 增加 `/media` 产物检查；flows.md 已更新 |
| F-002 | 404 | `/media/book`、未知分类命中站点 404 | 无改动 |
| F-005 自身（游戏平台任务 12–14） | 依赖 | 导入写入游戏 `platform`，依赖迁移 0005 与平台字段（Sprint 9 任务 12 `add-game-platform-api`，未实现） | 导入任务排在任务 12–14 之后 |
| F-006 媒体存储清理 | 共享资源（R2） | 导入新增的封面同样在 `covers/` 前缀下，由 shelf 管理 | 无 |
| F-004 互动与发现（未开始） | 搜索 / RSS | Pagefind 若索引全部读者页，会包含 `/media`——F-004 设计时决定是否排除 | 记入 F-004 Backlog 备注 |

## 7. 外部依赖与 TODO

| 依赖 | 说明 |
|------|------|
| ⚠️ 豆瓣 Rexxar 接口（非官方） | plan-tasks 第一个任务为 spike：Worker 出口可达性、各分类路径与字段、分享链接、封面域名；已完成（2026-10-21），结论见 ADR-011 |
| Cloudflare | R2 `put` / `delete`；D1 部分唯一索引（SQLite 支持）；`fetch` `redirect: 'manual'`（Workers 支持） |
| `DEPLOY_HOOK_URL` | 已配置（F-002） |

## 8. 关键决策

| ADR | 决策 |
|-----|------|
| [ADR-014](adr/ADR-014-douban-bulk-import.md) | 豆瓣批量导入：前端逐页驱动，每页 20 条（子请求 ≤ 41）；全量 + 按水位增量（`shelf_import_state`，一类完整结束才前移水位）；按豆瓣 ID 覆盖（hidden、封面不动）；整次只在 finish 时重建一次；游戏不下载封面 |
| [ADR-011](adr/ADR-011-shelf-domain-douban-recognition.md) | 新领域 `shelf`；豆瓣识别为 `shelf/douban/` 防腐层（Rexxar + 白名单 + 逐跳校验）；**封面在识别时下载并以 data URL 返回**，保存接口不接受外部 URL |
| [ADR-012](adr/ADR-012-shelf-reader-build-and-covers.md) | 公开 `GET /api/shelf` + `virtual:shelf-data`；路径路由预渲染；封面经 `/covers/*` 读取、key 不可变 |
| [ADR-013](adr/ADR-013-game-cover-igdb-link.md) | 游戏新增平台字段；游戏封面直接引用 images.igdb.com 大图（规范化为 t_1080p，保存时只向该主机读取宽高），是 ADR-011 §3"不接受外部 URL"与 ADR-012"封面为站内路径"的受限例外 |

### design-arch 决策导致的上游同步

ADR-011 §3 把封面下载从"保存时"移到"识别时"，以下文档已同步（2026-10-21）：

| 文档 | 改动 |
|------|------|
| US-02 story AC9 | 识别时下载封面并预览；失败时"未识别：封面，可手动上传"；保存不再有封面降级 |
| US-02 behaviors BH-20 / BH-21 | 改写为识别时下载 / 识别时封面失败 |
| US-02 验收 TC-US02-01 / 09 / 11 / 12 / 22 | 字段 `coverSource` → `coverData`；SSRF 用例改为保存接口拒收外部地址；TC-22 改为识别结果提示 |
| admin-media.md | 封面说明文字、保存成功提示去掉封面警告分支 |
| feature NFR | 封面校验时机改为识别时 |

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-21 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-22 | 1.1 | `MediaTypeTabs` 改为 React 岛（GooeyNav），读者页不再零 JS（[gooey-media-tabs](../../../../backlog/gooey-media-tabs.md)） | miraclehifi |
| 2026-10-23 | 1.4 | 所有分类统一为海报墙，`MediaCard`、`MediaRow` 废弃；"按时间"可选发行年份（[media-wall-all-types](../../../../backlog/media-wall-all-types.md)、[media-time-basis](../../../../backlog/media-time-basis.md)） | miraclehifi |
| 2026-10-23 | 1.3 | 游戏改为海报墙：平台字段、IGDB 外链封面与原比例砖块（[ADR-013](adr/ADR-013-game-cover-igdb-link.md)、[game-case-shelf](../../../../backlog/game-case-shelf.md)） | miraclehifi |
| 2026-10-22 | 1.2 | 电影、剧集改为满宽海报墙岛 `MediaPosterWall`（Masonry + FlipCard + GradualBlur），可按时间分段（[media-poster-wall](../../../../backlog/media-poster-wall.md)） | miraclehifi |
| 2026-10-23 | 1.4 | US-04 豆瓣批量导入：导入 / 结束接口、`DoubanImportDialog`、数据流（[ADR-014](adr/ADR-014-douban-bulk-import.md)、[douban-bulk-import](../../../../backlog/douban-bulk-import.md)） | miraclehifi |
| 2026-10-23 | 1.5 | US-04 增量同步：`shelf_import_state`（迁移 0006）、状态接口、`mode` / `head`（ADR-014 §1.1） | miraclehifi |
