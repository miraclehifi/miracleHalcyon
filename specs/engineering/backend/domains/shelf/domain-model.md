# shelf 领域模型（书影音）

**最后更新**: 2026-10-27
**状态**: self-checked（US-04 导入（§2.2 `fetchInterests`、§2.4、§3 `findByDoubanIds` / `ImportStateRepo`、§4 `importState` / `importPage` / `finishImport`、§5.1）已实现：`douban/import.ts`、`import-state-repo.ts`、`importer.ts`（由 `createShelfService` 并入），任务 19；§1、§3、§4 已实现：`src/domains/shelf/{entry,errors,repo,cover-store,hooks,service}.ts`，Sprint 9 任务 2；§2、§5 已实现：`src/domains/shelf/douban/{link,map,client}.ts`、`ShelfService.recognize`，任务 3；游戏平台与 IGDB 封面（§1 platform / coverUrl、§3 `IgdbImageClient`、§4 游戏分支、§5 游戏跳过封面）已实现：`entry.ts`、`igdb.ts`、`service.ts`，任务 12）
**来源**: [F-005 feature-architecture](../../../features/F-005-书影音/architecture/feature-architecture.md) · [ADR-011](../../../features/F-005-书影音/architecture/adr/ADR-011-shelf-domain-douban-recognition.md) · [ADR-012](../../../features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md) · [ADR-013](../../../features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)

> 命名对照：界面叫"书影音"，路由 `/media`、`/admin/media`，组件 `Media*`；领域、表、接口叫 `shelf`。现有 `media` 领域指图片，与本领域无关。
> 分层按 [domains/_index.md](../_index.md)"通用约定"：`src/domains/shelf/`。

---

## 1. 聚合：ShelfEntry（书影音条目）

| 属性 | 类型 | 规则 |
|------|------|------|
| id | `EntryId` | D1 自增整数；JSON 中为字符串（shared-field-formats"书影音条目 ID"） |
| type | `ShelfType` | `book` / `comic` / `movie` / `series` / `game` / `boardgame` |
| title | `string` | 去首尾空白后 1–200 字符 |
| creator | `string?` | 作者 / 导演 / 开发商；去首尾空白，空串 → `null`；≤ 200 字符 |
| year | `number?` | 1000–9999 整数 |
| status | `ShelfStatus` | `completed` / `in_progress` |
| rating | `number?` | 1–5 整数 |
| markedOn | `DateOnly` | `yyyy-MM-dd`，合法日历日期；进行中时语义为开始日期 |
| comment | `string?` | 纯文本，保留换行（`\r\n` 统一为 `\n`），去首尾空白，空串 → `null`；≤ 1000 码点 |
| coverKey | `CoverKey?` | `covers/{yyyy}/{mm}/{12 位 base32}.{jpg|png|webp}`；对外以 URL `/{coverKey}` 表示；**游戏恒为 `null`** |
| platform | `ShelfPlatform?` | `ps5` / `ps4` / `switch` / `switch2` / `steam`；游戏必填，其他分类 `null`（ADR-013） |
| coverUrl | `IgdbCoverUrl?` | 仅游戏：`https://images.igdb.com/igdb/image/upload/t_1080p/{图片ID}.jpg`（由 `normalizeIgdbCoverUrl` 生成） |
| coverWidth / coverHeight | `number?` | 1–20000 整数；与 `coverUrl` 同时有或同时无，保存时由 `IgdbImageClient` 读取 |
| douban | `DoubanRef?` | `{ id: string(纯数字 1–12 位), url: string }`，两者同时有或同时无；`url` 为规范条目链接 |
| hidden | `boolean` | 默认 `false` |
| createdAt / updatedAt | `Timestamp` | ISO 8601 UTC |

### 不变量

1. `douban.id` 在所有条目中唯一（`null` 不受限）——保存时检查，D1 部分唯一索引兜底（并发时返回 409）
2. `douban.id` 与 `douban.url` 同时存在或同时为空；`url` 必须由 `canonicalDoubanUrl(kind, id)` 生成，客户端只能"保留"或"清除"，不能改写为任意地址
3. `coverKey` 指向的对象由本领域独占：换封面 / 移除 / 删除条目时删除旧对象；不写入 `images` 表
4. `rating`、`comment` 与 `status` 无关联约束（进行中也可以有评分与短评）
5. 隐藏只影响读者端可见性，不影响去重与后台列表
6. `type = game` ⇔ `platform` 非空；`coverUrl` 只出现在游戏；游戏没有 `coverKey`
7. `coverUrl`、`coverWidth`、`coverHeight` 同时为空或同时非空；`coverUrl` 必为规范形式
8. 只有 `coverUrl` 变化时才重新读取宽高；保存为游戏时原 `coverKey` 对象在更新成功后删除

### 值对象与纯函数（`src/domains/shelf/entry.ts`，无 I/O，前端可导入）

| 函数 | 规则 |
|------|------|
| `SHELF_TYPES`、`isShelfType(v)` | 6 个分类，顺序即界面顺序；显示名 书 / 漫画 / 电影 / 剧集 / 游戏 / 桌游 |
| `statusLabel(type, status)` | 书 / 漫画 → 读过 / 在读；电影 / 剧集 → 看过 / 在看；游戏 / 桌游 → 玩过 / 在玩 |
| `creatorLabel(type)` | 作者 / 导演 / 开发商 |
| `countLabel(type, total, inProgress)` | `"{total} {本|部|款}"` + （`inProgress > 0` 时）`" · {在读|在看|在玩} {n}"` |
| `normalizeEntryInput(raw)` | 按上表校验并规范化；失败抛 `ValidationError(fields: string[])`（→ 400 `VALIDATION_FAILED`，`fields` 列出字段名）；未知字段忽略 |
| `sortEntries(entries)` | `in_progress` 在前 → `markedOn` 降序 → `id` 降序（同日新建的在前，确定） |
| `canonicalDoubanUrl(kind, id)` | `book` → `https://book.douban.com/subject/{id}/`；`movie`（含剧集）→ `https://movie.douban.com/subject/{id}/`；`game` → `https://www.douban.com/game/{id}/`（与 Rexxar 返回的 `url` 一致，spike 确认） |
| `detectCoverType(bytes)` | 文件头：`FF D8 FF` → jpeg；`89 50 4E 47 0D 0A 1A 0A` → png；`RIFF....WEBP` → webp；否则 `null` |
| `newCoverKey(now, ext, random)` | `covers/{yyyy}/{mm}/{random}.{ext}`（UTC 年月；`random` 为 12 位小写 base32，注入以便测试） |
| `isCoverKey(s)` | 匹配上式 |
| `SHELF_PLATFORMS`、`isShelfPlatform(v)`、`platformLabel(p)` | 顺序 ps5、ps4、switch、switch2、steam；显示名 PS5 / PS4 / Switch / Switch 2 / Steam；`platformIcon(p)`：ps5 / ps4 → `playstation`，switch / switch2 → `nintendoswitch`，steam → `steam`（Simple Icons 路径名） |
| `normalizeIgdbCoverUrl(input)` | 去首尾空白；原文含 `..` 或 `\` → `null`（`new URL` 会消去 `../`、把 `\` 当 `/`）；`new URL` 解析失败 → `null`；协议 `https:` / `http:`、`hostname === 'images.igdb.com'`、无 `username` / `password` / `port`；`pathname` 匹配 `^/igdb/image/upload/t_[a-z0-9_]{1,32}/([a-z0-9]{1,32})\.(jpg|jpeg|png|webp)$`；输入 ≤ 2,000 字符；成功返回 `https://images.igdb.com/igdb/image/upload/t_1080p/{id}.jpg`，否则 `null`（ADR-013 §2） |
| `readImageSize(bytes)` | 由文件头解析宽高：PNG 读 IHDR（偏移 16 / 20，大端）；JPEG 逐段扫描到 SOF0–SOF3 / SOF5–SOF7 / SOF9–SOF11 / SOF13–SOF15（高在前、宽在后）；WebP 按 `VP8 ` / `VP8L` / `VP8X` 三种块解析；数据不足或格式不认 → `null` |

## 2. 豆瓣防腐层（`src/domains/shelf/douban/`）

### 2.1 纯函数（`link.ts`、`map.ts`）

| 函数 | 规则 |
|------|------|
| `isDoubanHost(host)` | `host === 'douban.com' \|\| host.endsWith('.douban.com')`（小写比较） |
| `isDoubanImageHost(host)` | `host.endsWith('.doubanio.com')` |
| `isSafeUrl(u: URL)` | 协议 `https:` 或 `http:`；无 `username` / `password`；端口为空；`hostname` 不是 IP 字面量 |
| `extractDoubanLink(text)` | 取 `text` 中所有 `https?://` 片段（遇空白、中文标点 `，。！？；：”’）】》` 或 `<>"'` 截断），按出现顺序找第一个 `isSafeUrl` 且 `isDoubanHost` 的；返回 `{ kind: 'subject', ref: SubjectRef } \| { kind: 'not_subject' }`；一个都没有 → `null` |
| `parseSubjectUrl(u)` | 识别：`book.douban.com/subject/{id}` → `book`；`movie.douban.com/subject/{id}` → `movie`；`m.douban.com/{book|movie|game}/subject/{id}` → 同；`www.douban.com/game/{id}` → `game`；App 分享 `www.douban.com/doubanapp/dispatch/{book|movie|game}/{id}` → 同（剧集也是 movie）；路径允许末尾 `/`、查询与片段；`id` 为 1–12 位数字；不匹配 → `null`（主机是豆瓣但不是条目 → `not_subject`） |
| `mapSubject(kind, json, tags)` | Rexxar JSON（+ 书的标签）→ `{ fields: RecognizedFields, coverUrl?: string, missing: FieldName[] }`；见 2.3 |

### 2.2 `DoubanClient`（`client.ts`，I/O，接口注入）

```ts
interface DoubanClient {
  fetchSubject(ref: SubjectRef, signal: AbortSignal): Promise<unknown>;                       // Rexxar JSON
  fetchBookTags(id: string, signal: AbortSignal): Promise<string[]>;                         // book/{id}/tags；失败抛错，调用方按空数组处理
  fetchCover(url: string, signal: AbortSignal): Promise<Uint8Array>;                          // 只允许 isDoubanImageHost
  fetchInterests(q: InterestQuery, signal: AbortSignal): Promise<unknown>;                   // US-04，用户标记列表一页
}
type InterestQuery = { uid: string; kind: 'movie' | 'book' | 'game'; status: 'done' | 'doing'; start: number; count: number };
```

| 项 | 规则 |
|----|------|
| Rexxar 地址 | `https://m.douban.com/rexxar/api/v2/{book|movie|game}/{id}`；电影与剧集都走 `movie/{id}`，`is_tv: true` 为剧集；书另请求 `book/{id}/tags`，与条目请求并行 |
| 请求头 | `Referer: https://m.douban.com/`；`User-Agent` 为常见移动端 UA；封面请求 `Referer: https://m.douban.com/` |
| 失败 | 所有请求 `redirect: 'manual'`；非 2xx（含 3xx）、网络错误、超时 → `DoubanFetchError`；返回体非 JSON → `DoubanParseError` |
| 封面大小 | 读取时累计字节数，超过 5,242,880 立即中止 → `DoubanFetchError` |
| 标记列表（US-04） | `https://m.douban.com/rexxar/api/v2/user/{uid}/interests?type={kind}&status={status}&start={start}&count={count}`，`uid` 调用前必须通过 `isValidDoubanUid`（`encodeURIComponent` 后放入路径）；404 → `DoubanUserNotFoundError`；403 或 JSON 中 `code` 为 1000 / `msg` 含 `need_login` → `DoubanForbiddenError`；其余同上 |

### 2.3 字段映射（spike 验证，夹具见 `tests/fixtures/douban/README.md`）

| 字段 | 书（`book/{id}` + `book/{id}/tags`） | 影视（`movie/{id}`） | 游戏（`game/{id}`） |
|------|----|------|------|
| title | `title` | `title` | `title` |
| creator | `author[]` 逐项去掉开头国籍括号（`^[\[［(（][^\]］)）]{1,8}[\]］)）]\s*`，如"[美] "），以"、"连接 | `directors[].name` 以"、"连接 | `developers[]` 以"、"连接 |
| year | `pubdate[0]` 开头 4 位数字（"2018-1" → 2018） | `year`（字符串 → 整数） | `release_date` 开头 4 位 |
| coverUrl | `cover_url` \|\| `pic.large` \|\| `pic.normal` | 同 | 同（`cover_url` 为无签名的 `img{n}.doubanio.com`） |
| type 推断 | 标签含"漫画" → `comic`，否则（含标签请求失败）`book` | `is_tv` → `series`（电视剧，含动画剧集）；否则 `movie`（电影，含动画电影） | `genres` 某项含"桌游"（如"问答/桌游"）→ `boardgame`，否则 `game` |

`missing` 取 `creator`、`year`、`cover` 中为空的项（`type`、`title` 不会缺：无标题即 `PARSE_FAILED`）。

### 2.4 标记映射（US-04，`import.ts`，纯函数；spike 2026-10-23，ADR-014 §3）

| 函数 | 规则 |
|------|------|
| `isValidDoubanUid(uid)` | `^[A-Za-z0-9_.-]{1,64}$` 且不为 `.` / `..`；前端导入 |
| `IMPORT_STEPS` | `[movie·done, movie·doing, book·done, book·doing, game·done, game·doing]`；`IMPORT_PAGE_SIZE = 20` |
| `KIND_TYPES`、`importPlan(types)` | `movie → [movie, series]`、`book → [book, comic]`、`game → [game, boardgame]`；`importPlan` 按 `IMPORT_STEPS` 顺序只保留含勾选类别的大类，每步附该大类内勾选的 `types`（前端导入） |
| `isDoubanTimestamp(s)` | `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`（水位 / `head` / `create_time` 格式；同格式字符串按字典序比较即时间先后） |
| `parseInterestPage(json)` | 取 `total`（非负整数，否则 `DoubanParseError`）与 `interests[]`；`interests` 缺失视为空数组 |
| `mapInterest(kind, interest, extra)` | 输入一条标记与补充数据（`extra.tags`：书的标签，`extra.game`：游戏详情 JSON，均可缺）→ `{ doubanId, fields: ImportedFields, coverUrl? }`，或 `{ skip: true }`（`status` 不是 `done` / `doing`），或抛 `ImportItemError(doubanId, 'PARSE_FAILED')`（无 `subject.id` 或无标题） |

`ImportedFields` 映射（条目字段复用 §2.3 的作者去国籍、导演连接、桌游 / 漫画推断，入口改为标记 JSON）：

| 字段 | 规则 |
|------|------|
| doubanId / douban.url | `subject.id`（1–12 位数字，否则 `PARSE_FAILED`）；`canonicalDoubanUrl(kind, id)` |
| type | 影视：`subject.type === 'tv'` → `series`，否则 `movie`；书：`extra.tags` 含"漫画" → `comic`，否则 `book`；游戏：`subject.genres` 某项含"桌游" → `boardgame`，否则 `game` |
| title | `subject.title`；超过 200 字符截断 |
| creator | 书 `subject.author[]`、影视 `subject.directors[].name`、游戏 `extra.game.developers[]`；规则同 §2.3；超过 200 截断；取不到 → 缺失（`undefined`，不是 `null`，见 §4 合并） |
| year | 影视 `subject.year`；书 `subject.pubdate[0]` 开头 4 位；游戏 `subject.release_date` 开头 4 位；不在 1000–9999 → 缺失 |
| status | `done` → `completed`；`doing` → `in_progress` |
| rating | `interest.rating.value` 为 1–5 整数 → 该值；否则 `null`（有值，表示未评分） |
| markedOn | `interest.create_time` 前 10 位（`yyyy-MM-dd`，豆瓣为北京时间，原样取日期）；非法日期 → `PARSE_FAILED` |
| comment | `interest.comment` 规范同 `normalizeEntryInput`，空串 → `null`；超过 1000 码点截断 |
| platform | 仅 `type = game`：`interest.platforms[]` 按 `abbreviation`（大小写不敏感）映射 `PS5`→`ps5`、`PS4`→`ps4`、`NS`→`switch`、`NS 2`/`NS2`→`switch2`、`PC`→`steam`，取第一个能映射的；都不能 → 缺失 |
| coverUrl | 非游戏：`subject.cover_url` \|\| `subject.pic.large`；游戏不取 |

## 3. 仓储与存储接口

```ts
interface ShelfRepo {
  listByType(type: ShelfType): Promise<ShelfEntry[]>;          // 含隐藏
  listVisible(): Promise<ShelfEntry[]>;                         // hidden = 0，ORDER BY id DESC
  get(id: number): Promise<ShelfEntry | null>;
  findByDoubanIds(ids: string[]): Promise<Map<string, ShelfEntry>>;  // US-04：本页批量查询（≤ 20 个）
  findByDoubanId(doubanId: string): Promise<{ id: number; title: string; type: ShelfType; status: ShelfStatus; markedOn: string } | null>;
  insert(e: NewEntry): Promise<ShelfEntry>;                    // 唯一冲突 → DuplicateDoubanError
  update(id: number, e: EntryData): Promise<ShelfEntry | null>;
  setHidden(id: number, hidden: boolean): Promise<{ changed: boolean } | null>;
  delete(id: number): Promise<ShelfEntry | null>;              // 返回被删行（取 coverKey）
}
interface CoverStore {
  put(key: CoverKey, bytes: Uint8Array, contentType: string): Promise<void>; // cacheControl immutable
  get(key: CoverKey): Promise<{ body: ReadableStream; contentType: string; size: number } | null>;
  delete(key: CoverKey): Promise<void>;                         // 不存在不报错
}
interface ImportStateRepo {                                     // US-04 增量同步（D1 shelf_import_state，ADR-014 §1.1）
  get(uid: string): Promise<ImportCategoryState[]>;              // 按 电影、剧集、书、漫画、游戏、桌游 × [done, doing] 顺序补齐 12 项（KIND_TYPES 顺序，与 api-contract 一致），没有的行 watermark / syncedAt 为 null
  lastUid(): Promise<string | null>;                             // attempted_at 最新的 uid
  touch(uid: string, types: ShelfType[], status: ImportStatus, now: string): Promise<void>;          // 逐类别 upsert attempted_at
  complete(uid: string, types: ShelfType[], status: ImportStatus, head: string | null, now: string): Promise<void>; // 逐类别 watermark = COALESCE(head, watermark)，synced_at = now
}
type ImportCategoryState = { type: ShelfType; status: ImportStatus; watermark: string | null; syncedAt: string | null };
interface ShelfHooks { onShelfChanged(): Promise<void> }        // 默认 noop；路由层适配 Deploy Hook
interface IgdbImageClient {                                      // ADR-013 §3，`igdb.ts`；路由层用全局 fetch 实现
  readSize(url: IgdbCoverUrl, signal: AbortSignal): Promise<{ width: number; height: number }>;
  // 只请求 normalizeIgdbCoverUrl 的产物；redirect 'manual'；读至多 65,536 字节后取消读取；
  // 非 2xx / 3xx / 网络错误 / readImageSize 为 null / 宽或高 > 20000 → IgdbImageError；8 秒超时由服务计时
}
```

## 4. 服务（`src/domains/shelf/service.ts`）

| 方法 | 规则 | 错误 |
|------|------|------|
| `list(type)` | `sortEntries(repo.listByType(type))` | `type` 非法 → `VALIDATION_FAILED` |
| `get(id)` | — | 不存在 → `NOT_FOUND` |
| `create(raw, cover?: CoverUpload)` | ⓪ 游戏：带 `cover` 文件 → `BAD_REQUEST`；`coverUrl` 非空时 `igdb.readSize`（8 秒，失败 → `COVER_LINK_UNREACHABLE`）① `normalizeEntryInput` ② `douban` 非空时 `findByDoubanId` → 已有则 `DUPLICATE_DOUBAN_ID` ③ 有封面：`detectCoverType` 为空 → `COVER_TYPE_INVALID`，> 5,242,880 B → `COVER_TOO_LARGE`；`put` ④ `insert`，失败删除刚写的封面再抛出 ⑤ `hooks.onShelfChanged()` | 400 / 409 / 422 |
| `update(id, raw, coverChange: 'keep' \| 'remove' \| CoverUpload)` | 读旧行（无 → `NOT_FOUND`）；游戏：`coverChange` 为上传 → `BAD_REQUEST`，规范化后的 `coverUrl` 与旧值不同才 `readSize`，相同沿用旧宽高；由非游戏改为游戏时，更新成功后删除旧 `coverKey` 对象；由游戏改为非游戏时 `platform` / `coverUrl` / 宽高置空；`douban` 只能保持原值或清除（请求带的 `doubanUrl` 与原值不同且非 `null` → 忽略并保持原值）；新封面先 `put` 再 `update`，成功后删旧对象（失败只记日志 `shelf_cover_delete_failed`）；`remove` 先 `update` 再删对象；触发钩子 | 400 / 404 / 422 |
| `setHidden(id, hidden)` | `changed` 为真才触发钩子 | 404 |
| `remove(id)` | `repo.delete` → 删封面（失败只记日志）→ 钩子 | 404 |
| `listPublic()` | `repo.listVisible()` 映射为 `ShelfPublicEntry`（不含 id、doubanId、hidden、时间戳）；游戏的 `cover` 取 `coverUrl`，并带 `platform`、`coverWidth`、`coverHeight` | — |
| `recognize(text, excludeId?)` | 见 §5 | 400 / 422 |
| `importState(uid?)` | `uid` 缺省 → `stateRepo.lastUid()`（为 `null` 时 12 项全空）；有 `uid` 须通过 `isValidDoubanUid`；返回 `{ uid, categories }` | 400 |
| `importPage(uid, kind, status, types, mode, start, head?)` | 见 §5.1；**不**触发钩子 | 400 / 403 / 404 / 502 |
| `finishImport(changed)` | `changed` 为非负整数；`> 0` 时 `hooks.onShelfChanged()` 一次 | 400 |

`CoverUpload = { bytes: Uint8Array; declaredType?: string }`；以文件头判定类型，`declaredType` 不参与判定。

## 5. 识别流程（`recognize`）

```
signal = AbortSignal.timeout(8000)
link = extractDoubanLink(text)              → null: NOT_DOUBAN_LINK；not_subject: NOT_SUBJECT_LINK
ref  = link.ref
dup  = repo.findByDoubanId(ref.id)；dup && dup.id !== excludeId → return { duplicate: dup }
[json, tags] = await Promise.all([client.fetchSubject(ref, signal), ref.kind==='book' ? client.fetchBookTags(ref.id, signal).catch(() => []) : []])
                                            → DoubanFetchError: FETCH_FAILED；DoubanParseError: PARSE_FAILED
{fields, coverUrl, missing} = mapSubject(ref.kind, json, tags)   → 无 title: PARSE_FAILED
coverData = null
if fields.type === 'game': missing.push('cover')          // 游戏不取豆瓣封面（ADR-013 §5）
else if coverUrl && isSafeUrl && isDoubanImageHost:
   try bytes = client.fetchCover(coverUrl, signal)；t = detectCoverType(bytes)；t ? coverData = `data:${t};base64,…` : missing.push('cover')
   catch → missing.push('cover')（封面失败不使整次识别失败）
else if coverUrl: missing.push('cover')
return { fields: { ...fields, coverData, doubanUrl: canonicalDoubanUrl(ref.kind, ref.id), doubanId: ref.id }, missing }
```

识别不写 D1、不写 R2。超时在任何一步发生都归为 `FETCH_FAILED`。

### 5.1 导入一页（`importPage`，US-04，ADR-014）

```
校验 isValidDoubanUid(uid)、kind ∈ movie/book/game、status ∈ done/doing、types 非空且不重复且 ⊆ KIND_TYPES[kind]、mode ∈ full/incremental、start 为 0–100000 的整数且为 20 的倍数、
     start > 0 时 head 必须为 null 或 isDoubanTimestamp（start = 0 时忽略请求里的 head）→ 否则 VALIDATION_FAILED（不发外部请求）
stateRepo.touch(uid, types, status, now)
ws = types 各类别该 status 的 watermark
watermark = mode === 'incremental' && ws 全部非空 ? min(ws) : null        // 截断取最早；任一为空不截断
signal = AbortSignal.timeout(25000)；外部请求经并发上限 5 的队列
page = parseInterestPage(client.fetchInterests({uid, kind, status, start, count: 20}))
        → DoubanUserNotFoundError: DOUBAN_USER_NOT_FOUND；DoubanForbiddenError: DOUBAN_FORBIDDEN；其余 / 超时: FETCH_FAILED
head = start === 0 ? (page.interests[0]?.create_time ?? null) : 请求的 head
reached = false
if watermark：page.interests 中 create_time < watermark（字典序）的项被丢弃，出现任一则 reached = true
            （create_time 缺失或格式非法的项按单条 PARSE_FAILED 处理，不影响截断判断）
items = 剩余项中 status ∈ {done, doing} 的项
existing = repo.findByDoubanIds(items 的 subject.id)
对每项（并发，单项异常只进 failed[]）：
  extra：book → fetchBookTags（失败 → 该项 ImportItemError(FETCH_FAILED) 进 failed[]，不按书写入：免得漫画写成书、已有漫画被覆盖；与识别的降级不同）；game → fetchSubject(game)（失败 → 缺失）
  m = mapInterest(...)；skip → 不计数；m.fields.type ∉ types → 跳过（不写入、不下载封面、不计数；书仍需先取标签才能判定）
  if 已有 e：
     data = merge(e, m.fields)：m.fields 中非 undefined 的字段覆盖；hidden、coverKey、coverUrl/宽高、createdAt 不动；
            type 由游戏变非游戏 → platform/coverUrl/宽高置空；由非游戏变游戏 → platform 缺失时 ps5，旧 coverKey 在更新后删除
     normalizeEntryInput(data) → repo.update → updated++
  else：
     游戏：platform 缺失 → ps5，无封面
     非游戏：coverUrl 合法（isSafeUrl + isDoubanImageHost）→ fetchCover → detectCoverType → CoverStore.put(newCoverKey)；任何失败 → coverFailed++，无封面
     normalizeEntryInput → repo.insert（DuplicateDoubanError：并发时视为已有，转 update 一次）→ created++；insert 失败删除刚写的封面
nextStart = reached || start + 20 >= page.total ? null : start + 20
nextStart === null → stateRepo.complete(uid, types, status, head, now)      // 只有一步完整结束才前移水位，只动 types 中的类别
返回 { total: page.total, head, nextStart, created, updated, coverFailed, failed }
```

超时发生在列表请求前后：列表未取到 → `FETCH_FAILED`；单项处理中超时 → 该项进 `failed`（`FETCH_FAILED`），已写入的保留。

## 6. 读者端视图模型（`src/lib/reader/shelf.ts`，reader 模块增量）

| 函数 | 规则 |
|------|------|
| `groupShelf(entries)` | 按 `type` 分组，每组 `sortEntries`（公开数据无 id：接口已按 id 降序输出，排序稳定即可保持同日新建在前） |
| `shelfPath(type)` | `book` → `/media`；其余 `/media/{type}` |
| `markedMonth(markedOn)` | 截取 `yyyy-MM` |
| `emptyIcon(type)` | book `book-open`、comic `book-image`、movie `film`、series `tv`、game `gamepad-2`、boardgame `dices` |
| `posterAspect(type, cover)` | book / comic / movie / series → `"2 / 3"`；boardgame → `"1 / 1"`；game：`cover.width` 与 `cover.height` 都为正整数 → `"{w} / {h}"`，否则 `"3 / 4"`（待实现，ADR-013 §4） |

## 7. 服务的需求（Domain → US）

| US | 本领域能力 |
|----|-----------|
| US-01 manage-entries | `list`、`get`、`create`、`update`、`setHidden`、`remove`、`CoverStore`、`ShelfHooks`、`IgdbImageClient`；`normalizeIgdbCoverUrl`、`readImageSize`、`platformLabel`；`normalizeEntryInput`、`sortEntries`、`statusLabel`、`creatorLabel`、`countLabel` |
| US-02 douban-recognize | `recognize`、`douban/*`、`DoubanClient`；`create` 的豆瓣去重 |
| US-03 media-page | `listPublic`、`GET /covers/*`（`CoverStore.get`）；reader `shelf.ts` |
| US-04 douban-import | `importState`、`importPage`（全量 / 增量）、`finishImport`、`ImportStateRepo`、`isDoubanTimestamp`、`DoubanClient.fetchInterests`、`isValidDoubanUid`、`IMPORT_STEPS`、`parseInterestPage`、`mapInterest`、`ShelfRepo.findByDoubanIds`、`CoverStore.put` |

## 8. 单元测试规格

| UT-ID | 对象 | 用例 | 预期 | 关联 TC |
|-------|------|------|------|---------|
| SHELF-UT-01 | `normalizeEntryInput` | TC-US01-04 数据表全部行；`comment` 含 `\r\n`；`creator` 为 `"  "` | 与表一致；换行统一为 `\n`；`creator` → `null` | TC-US01-04、15 |
| SHELF-UT-02 | `sortEntries` | TC-US01-02 数据（含同日） | D、B、E、C、A | TC-US01-02、TC-US03-04 |
| SHELF-UT-03 | `statusLabel` / `creatorLabel` / `countLabel` | 7 类 × 2 状态；`(book,10,2)`、`(movie,5,0)`、`(boardgame,0,0)` | 见 §1 | TC-US03-03、UT-01、02 |
| SHELF-UT-04 | `detectCoverType` | jpg / png / webp 头；svg 文本；gif；空数组；扩展名 jpg 的文本 | 前三者正确，其余 `null` | TC-US01-05 |
| SHELF-UT-05 | `newCoverKey` / `isCoverKey` | 2026-10-21、`png`、固定随机串；`covers/../x.jpg`、`covers/2026/10/ABC.jpg`、`img/...` | 生成 `covers/2026/10/{random}.png`；后三者 `false` | — |
| SHELF-UT-06 | `extractDoubanLink` | TC-US02-02、05、09 输入表 | 与表一致（含 `douban.com.evil.example`、userinfo、IP、中文标点截断、多个链接取第一个） | TC-US02-02、05、09 |
| SHELF-UT-07 | `parseSubjectUrl` / `canonicalDoubanUrl` | 桌面、移动、带查询与片段、`http:`、非数字 id | 规范链接一致；非数字 → `null` | TC-US02-01 |
| SHELF-UT-08 | `mapSubject` | 每个录制夹具（TC-US02 夹具表） | 字段、分类推断、`missing` 与夹具期望一致 | TC-US02-01、03、04、07 |
| SHELF-UT-09 | `ShelfService.recognize`（替身 client / repo） | 成功；dispatch 链接；重复（有 / 无 excludeId）；Rexxar 404 / 418 / 挂起；无标题；封面 svg / 6 MB / 超时 / 非豆瓣图片域 | 结果与错误码同 TC；挂起在 8s 内 `FETCH_FAILED`（假计时器）；封面失败只加 `missing`；替身记录的请求主机全在白名单 | TC-US02-05–09、12、13 |
| SHELF-UT-10 | `ShelfService` 写操作（替身 repo / store / hooks） | 新增带封面且 insert 失败；换封面后删旧失败；删除；隐藏幂等；`doubanUrl` 改为他址 | 封面回滚；响应成功且记日志；封面删除；钩子次数同 TC-US01-10；豆瓣保持原值 | TC-US01-07、09、10、11 |
| SHELF-UT-11 | `groupShelf` / `shelfPath` / `markedMonth` | 构建夹具 | 分组与顺序同 TC-US03-04；`/media`、`/media/movie`；`2026-10` | TC-US03-04、05 |
| SHELF-UT-12 | `normalizeIgdbCoverUrl` | TC-US01-27 输入表全部行；`t_cover_big/co8h3y.webp`、`t_720p/co5vmg.png`、`http:` | 合法的都得 `t_1080p/{id}.jpg`；其余 `null` | TC-US01-26、27 |
| SHELF-UT-13 | `readImageSize` | 810×1080 jpg（含 EXIF 段在 SOF 前）、渐进式 jpg（SOF2）、png、webp 三种块；截断到 20 字节；svg 文本；gif | 宽高正确；后三者 `null` | TC-US01-26、27 |
| SHELF-UT-14 | `ShelfService` 游戏写操作（替身 repo / store / igdb） | TC-US01-26 #1–8、TC-US01-28 全部行；`readSize` 抛 `IgdbImageError` / 超时；`normalizeEntryInput` 对 `platform` 的校验 | 字段、错误码、`readSize` 调用次数（编辑未改链接为 0）、旧 R2 对象删除与 TC 一致 | TC-US01-26、27、28 |
| SHELF-UT-15 | `ShelfService.recognize` 游戏 | 游戏夹具；桌游夹具 | 游戏 `missing` 含 `cover` 且替身无封面请求；桌游照常下载 | TC-US02-23 |

集成测试（workers 池，真实 D1 / R2）覆盖仓储 SQL、唯一索引冲突、`/covers/*` 读取与各 API 路由，见验收用例 `type: api` / `security`。
| SHELF-UT-16 | `isValidDoubanUid` | TC-US04-10 输入表 | 与表一致 | TC-US04-10 |
| SHELF-UT-17 | `mapInterest` / `parseInterestPage` | `interests-*` 夹具每条；TC-US04-02 / 03 决策表；`status: mark`；无标题；`create_time` 非法；`rating: null`；`comment: ""`；1,200 字短评；`total` 缺失 | 字段与 TC 一致；`mark` → skip；无标题 / 非法日期 → `PARSE_FAILED`；评分 `null`；短评 `null` / 截断到 1000 码点；`total` 缺失 → `DoubanParseError` | TC-US04-01–05 |
| SHELF-UT-18 | `ShelfService.importPage`（替身 client / repo / store / hooks） | 新增与覆盖混合页；已有条目隐藏 + 封面；游戏详情失败；封面 418；insert 唯一冲突；19 条 / total 45 分页；404 / 403 / 挂起；非法参数 | 计数与 TC-US04-06–08 一致；钩子 0 次；非法参数时 client 无调用；挂起在 25s 内 `FETCH_FAILED`（假计时器）；外部请求 ≤ 41、并发 ≤ 5 | TC-US04-04–11、13 |
| SHELF-UT-20 | `importPage` 增量与水位（替身 stateRepo） | TC-US04-18–21 场景；`start > 0` 缺 `head`；`head` 非法；`create_time` 非法的项 | 截断位置、同一秒、`complete` 只在 `nextStart = null` 时调用且参数为第 1 页 `head`；无水位按全量；后两者 400 / 单条 `PARSE_FAILED` | TC-US04-18–21 |
| SHELF-UT-22 | `importPage` 类别过滤与类别水位 | TC-US04-24、25 全部行 | 写入数、跳过项无封面请求、`touch` / `complete` 只含 `types`、截断取最早水位 | TC-US04-24、25 |
| SHELF-UT-21 | `importState` | 无记录；`lastUid`；指定 uid；非法 uid | TC-US04-22 | TC-US04-22 |
| SHELF-UT-19 | `ShelfService.finishImport` | `changed` 0 / 3 / -1 / 1.5 | 钩子 0 / 1 次；后两者 `VALIDATION_FAILED` | TC-US04-09 |
