# ADR-014: 豆瓣批量导入——前端逐页驱动、按水位增量同步

## 状态
Accepted（2026-10-23，F-005 增量 [douban-bulk-import](../../../../../backlog/douban-bulk-import.md)；范围、字段、触发方式、覆盖规则由作者确定，其余为 AI 设计，按作者偏好文档阶段不逐项确认，待事后审阅）

## 背景
- 作者要按豆瓣用户 ID 导入影视、书、游戏的已完成 / 进行中标记（实测约 1,050 条），可重复同步；相同豆瓣 ID 用豆瓣数据覆盖
- 作者补充（2026-10-23）：全量导入一次后，之后只同步增量
- spike：6 类标记列表都按 `create_time` 严格倒序
- spike（Backlog"spike 结论"）：Rexxar `user/{uid}/interests` 不登录可读；每页最多 50 条，单页可能少返回；书的漫画判定要额外请求 `book/{id}/tags`，游戏开发商要请求 `game/{id}`
- Workers 单次调用外部子请求数有限（免费版 50），且每条非游戏条目还要下载封面存 R2；一次请求导完上千条不可行
- 现有识别（ADR-011）已有白名单、`redirect: 'manual'`、条目映射与封面下载，导入应复用而不是另写一套

## 决策

### 1. 前端逐页驱动，服务端只记同步水位
- `POST /api/admin/shelf/import` 一次只处理一页：请求 `{uid, kind, status, start}`，服务端向豆瓣请求 `count = 20` 的一页，写库后返回 `{total, nextStart, created, updated, coverFailed, failed[]}`
- 导入顺序（影视→书→游戏，各自 done→doing）、进度、停止都在前端 `DoubanImportDialog` 里；服务端不存进行中的任务，只存每类的同步水位（§1.1）
- 中途中断后重新导入，没完成的类别从头开始；靠"按豆瓣 ID 覆盖"保证幂等（BH-14），不做页级断点
- 每页外部请求 ≤ 1（列表）+ 20（书 tags 或游戏详情）+ 20（封面）= 41，低于 50；整页共享 25 秒 `AbortSignal`，外部请求并发上限 5

### 1.1 增量同步：按类记水位
- 新表 `shelf_import_state`（迁移 0006）：主键（`uid`, `kind`, `status`），列 `watermark`（豆瓣 `create_time` 原文，可空）、`synced_at`（最近一次完整同步时间，可空）、`attempted_at`（最近一次导入请求时间）
- 请求带 `mode`：`full` 翻到 `total` 为止；`incremental` 且该类有水位时，只处理 `create_time >= watermark` 的标记（含同一秒，重复覆盖无害），本页出现早于水位的标记即结束本类；该类无水位时 `incremental` 等同 `full`
- `head`：本类第一页第一条标记的 `create_time`。第一页响应返回 `head`，前端在后续页原样带回；服务端在本类结束（`nextStart = null`）的那一页把水位写为 `head`（`head` 为空——豆瓣该类为空——时水位不变）、`synced_at` 写为当前时间
- **水位只在一类完整结束时前移**：停止、出错、关掉页面都不写水位。全量从最新往旧翻，若中断后就前移水位，水位之下会留下没导入的空洞；只在完整结束时前移可避免
- 每次导入请求更新 `attempted_at`；`GET /api/admin/shelf/import/state` 不带 `uid` 时取 `attempted_at` 最新的 `uid` 作为"上次用的 ID"——用户 ID 因此存服务端，换设备也能带出，不再用浏览器 `localStorage`
- 已知限制：豆瓣修改旧标记的评分 / 短评若不刷新 `create_time`，增量发现不了；删除标记、改为想看，全量和增量都不处理。界面保留"全量导入"作为兜底

### 2. 重建只触发一次
- 导入接口写库时**不**调用 `ShelfHooks.onShelfChanged`
- 前端结束（完成 / 停止 / 中途出错）后调用 `POST /api/admin/shelf/import/finish {changed}`，`changed > 0` 才触发一次 Deploy Hook

### 3. `douban/` 防腐层扩展
| 新增 | 规则 |
|------|------|
| `DoubanClient.fetchInterests(uid, kind, status, start, count, signal)` | `GET https://m.douban.com/rexxar/api/v2/user/{uid}/interests?type=&status=&start=&count=`；请求头、`redirect: 'manual'` 同识别；404 → `DOUBAN_USER_NOT_FOUND`，403 或返回体要求登录 → `DOUBAN_FORBIDDEN`，其余非 200 / 超时 / 非 JSON → `FETCH_FAILED` |
| `isValidDoubanUid(uid)` | `^[A-Za-z0-9_.-]{1,64}$`，且不能是 `.` / `..`；前后端共用；不通过时不发任何请求 |
| `mapInterest(interest, extra)` | 条目字段复用 `mapSubject` 的规则（标题、作者去国籍、导演、分类推断）；影视用 `subject.type`（`tv` → series）；年份：影视 `year`，书 `pubdate[0]` 前 4 位，游戏 `release_date` 前 4 位；状态 `done` / `doing`（其他值丢弃）；`rating.value` 1–5 否则 `null`；`markedOn` = `create_time` 日期部分；`comment` 空串 → `null`，超长按条目上限截断；游戏 `platform` 按标记 `platforms` 映射（PS5 / PS4 / NS / NS 2 / PC → ps5 / ps4 / switch / switch2 / steam，取第一个能映射的） |
| 封面 | 非游戏：`cover_url` 须在 `.doubanio.com`，复用识别的下载与校验（jpg / png / webp、≤ 5 MB），得到字节后直接 `CoverStore.put`（不经 data URL）；游戏不下载（ADR-013） |

### 4. 写库规则（`ShelfService.importPage`）
- 按本页豆瓣 ID 批量查已有条目（`ShelfRepo.findByDoubanIds`）
- **新条目**：下载封面 → `CoverStore.put` → `insert`；游戏平台映射不上时 `ps5`；封面失败照常插入、`coverFailed + 1`
- **已有条目**：豆瓣有值的字段覆盖（标题、作者 / 导演 / 开发商、年份、分类、豆瓣链接、状态、评分、日期、短评、游戏平台）；豆瓣缺失的字段保留原值；`hidden`、`cover_key`、游戏 `cover_url` / 宽高、`created_at` 不动；已有条目无封面时也不补下载（避免重复同步时反复请求失败的封面）
- 评分为 `null` 属于"豆瓣有值"（作者在豆瓣取消评分 → 本站也清空）；短评同理
- 单条失败（无标题、写库失败）记入 `failed[]`，不中断整页；分类从游戏改为非游戏等跨分类变化按 ADR-013 §5 的规则清理字段
- 不走 `create` / `update` 的 409 豆瓣去重路径，直接按 ID upsert；仍走 `normalizeEntryInput` 校验

### 5. 用户 ID 与水位存服务端
- 见 §1.1；不收集、不存储豆瓣密码或 Cookie

## 后果
- 正面：只加一张小表（每个 ID 6 行），无队列 / Durable Object；日常增量同步通常 6 个请求、几秒完成；复用识别的白名单与映射；每页可测、可重试；SSRF 面仍只有固定主机 `m.douban.com` 与 `.doubanio.com`
- 负面：首次全量导入期间作者需保持页面打开（约 53 页，按单页 3–10 秒估计 3–8 分钟）；关掉页面即停止，没完成的类别下次从头覆盖（只多耗时间，结果相同）
- 负面：增量依赖豆瓣列表按 `create_time` 倒序；若豆瓣改变排序，增量可能漏标记——"全量导入"可补齐
- 负面：导入的游戏没有封面，需作者逐条补 IGDB 链接
- 风险：豆瓣对连续请求限流——单页失败即停止并提示稍后重试；接口改版 → `FETCH_FAILED` / 单条 `PARSE_FAILED`

## 备选方案
| 方案 | 不选原因 |
|------|---------|
| 一次请求导完 | 超出子请求数与时长限制 |
| 服务端后台任务（Queues / Workflows / Durable Object + 任务表） | 单作者、低频操作，引入新基础设施与状态管理不划算；进度推送更复杂 |
| 本地脚本直接写生产 D1 / R2 | 作者选择"后台按钮，可重复同步" |
| 每页触发重建 | 一次导入会排队几十次构建 |
| 增量按"整页都已存在且无变化"截断，不存水位 | 全量中断后会在旧数据处提前截断，留下空洞；判断"无变化"也要逐条比较 |
| 水位取本站条目的最大标记日期 | `marked_on` 只有日期、作者手动录入的条目会干扰；同样有中断空洞问题 |
| 水位存浏览器 `localStorage` | 换设备 / 清缓存后丢失；中断判断仍需服务端配合 |
| 导入时为游戏下载豆瓣封面 | 与 ADR-013（游戏封面只用 IGDB）冲突 |
