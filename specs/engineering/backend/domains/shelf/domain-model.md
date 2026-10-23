# shelf 领域模型（书影音）

**最后更新**: 2026-10-23
**状态**: self-checked（§1、§3、§4 已实现：`src/domains/shelf/{entry,errors,repo,cover-store,hooks,service}.ts`，Sprint 9 任务 2；§2、§5 已实现：`src/domains/shelf/douban/{link,map,client}.ts`、`ShelfService.recognize`，任务 3）
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
| platform | `ShelfPlatform?` | `ps5` / `ps4` / `switch` / `switch2` / `steam`；游戏必填，其他分类 `null`（待实现，ADR-013） |
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
| `normalizeIgdbCoverUrl(input)` | 去首尾空白；`new URL` 解析失败 → `null`；协议 `https:` / `http:`、`hostname === 'images.igdb.com'`、无 `username` / `password` / `port`；`pathname` 匹配 `^/igdb/image/upload/t_[a-z0-9_]{1,32}/([a-z0-9]{1,32})\.(jpg|jpeg|png|webp)$`；输入 ≤ 2,000 字符；成功返回 `https://images.igdb.com/igdb/image/upload/t_1080p/{id}.jpg`，否则 `null`（ADR-013 §2） |
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
}
```

| 项 | 规则 |
|----|------|
| Rexxar 地址 | `https://m.douban.com/rexxar/api/v2/{book|movie|game}/{id}`；电影与剧集都走 `movie/{id}`，`is_tv: true` 为剧集；书另请求 `book/{id}/tags`，与条目请求并行 |
| 请求头 | `Referer: https://m.douban.com/`；`User-Agent` 为常见移动端 UA；封面请求 `Referer: https://m.douban.com/` |
| 失败 | 所有请求 `redirect: 'manual'`；非 2xx（含 3xx）、网络错误、超时 → `DoubanFetchError`；返回体非 JSON → `DoubanParseError` |
| 封面大小 | 读取时累计字节数，超过 5,242,880 立即中止 → `DoubanFetchError` |

### 2.3 字段映射（spike 验证，夹具见 `tests/fixtures/douban/README.md`）

| 字段 | 书（`book/{id}` + `book/{id}/tags`） | 影视（`movie/{id}`） | 游戏（`game/{id}`） |
|------|----|------|------|
| title | `title` | `title` | `title` |
| creator | `author[]` 逐项去掉开头国籍括号（`^[\[［(（][^\]］)）]{1,8}[\]］)）]\s*`，如"[美] "），以"、"连接 | `directors[].name` 以"、"连接 | `developers[]` 以"、"连接 |
| year | `pubdate[0]` 开头 4 位数字（"2018-1" → 2018） | `year`（字符串 → 整数） | `release_date` 开头 4 位 |
| coverUrl | `cover_url` \|\| `pic.large` \|\| `pic.normal` | 同 | 同（`cover_url` 为无签名的 `img{n}.doubanio.com`） |
| type 推断 | 标签含"漫画" → `comic`，否则（含标签请求失败）`book` | `is_tv` → `series`（电视剧，含动画剧集）；否则 `movie`（电影，含动画电影） | `genres` 某项含"桌游"（如"问答/桌游"）→ `boardgame`，否则 `game` |

`missing` 取 `creator`、`year`、`cover` 中为空的项（`type`、`title` 不会缺：无标题即 `PARSE_FAILED`）。

## 3. 仓储与存储接口

```ts
interface ShelfRepo {
  listByType(type: ShelfType): Promise<ShelfEntry[]>;          // 含隐藏
  listVisible(): Promise<ShelfEntry[]>;                         // hidden = 0，ORDER BY id DESC
  get(id: number): Promise<ShelfEntry | null>;
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
interface ShelfHooks { onShelfChanged(): Promise<void> }        // 默认 noop；路由层适配 Deploy Hook
interface IgdbImageClient {                                      // 待实现（ADR-013 §3）；路由层用全局 fetch 实现
  readSize(url: IgdbCoverUrl, signal: AbortSignal): Promise<{ width: number; height: number }>;
  // 只请求 normalizeIgdbCoverUrl 的产物；redirect 'manual'；读至多 65,536 字节后取消读取；
  // 非 2xx / 3xx / 网络错误 / readImageSize 为 null → IgdbImageError
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

## 6. 读者端视图模型（`src/lib/reader/shelf.ts`，reader 模块增量）

| 函数 | 规则 |
|------|------|
| `groupShelf(entries)` | 按 `type` 分组，每组 `sortEntries`（公开数据无 id：接口已按 id 降序输出，排序稳定即可保持同日新建在前） |
| `shelfPath(type)` | `book` → `/media`；其余 `/media/{type}` |
| `markedMonth(markedOn)` | 截取 `yyyy-MM` |
| `emptyIcon(type)` | book `book-open`、comic `book-image`、movie `film`、series `tv`、game `gamepad-2`、boardgame `dices` |
| `posterAspect(type, cover)` | movie / series → `"2 / 3"`；game：`cover.width` 与 `cover.height` 都为正整数 → `"{w} / {h}"`，否则 `"3 / 4"`（待实现，ADR-013 §4） |

## 7. 服务的需求（Domain → US）

| US | 本领域能力 |
|----|-----------|
| US-01 manage-entries | `list`、`get`、`create`、`update`、`setHidden`、`remove`、`CoverStore`、`ShelfHooks`、`IgdbImageClient`；`normalizeIgdbCoverUrl`、`readImageSize`、`platformLabel`；`normalizeEntryInput`、`sortEntries`、`statusLabel`、`creatorLabel`、`countLabel` |
| US-02 douban-recognize | `recognize`、`douban/*`、`DoubanClient`；`create` 的豆瓣去重 |
| US-03 media-page | `listPublic`、`GET /covers/*`（`CoverStore.get`）；reader `shelf.ts` |

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
