# shelf API 契约

**最后更新**: 2026-10-27
**状态**: self-checked（条目、封面端点：Sprint 9 任务 2；识别：任务 3；公开列表：任务 7；游戏 `platform` / `coverUrl` / 宽高、422 `COVER_LINK_UNREACHABLE`：任务 12；导入 `import` / `import/state` / `import/finish`：任务 19）

> 通用约定（错误体、401 / 403、字段格式）见 [domains/_index.md](../_index.md) 与 [auth/api-contract.md](../auth/api-contract.md)"通用 401 / 403"；字段格式见 [shared-field-formats](../../../shared-field-formats.md)。
> 写接口均需会话 + Origin 校验（middleware）；`/api/shelf`、`/covers/*` 公开。

---

## 1. 端点总览

| 方法 | 路径 | 认证 | 领域服务 | US |
|------|------|------|---------|----|
| GET | `/api/admin/shelf/entries?type=` | 会话 | `list` | US-01 |
| POST | `/api/admin/shelf/entries` | 会话 | `create` | US-01、US-02 |
| GET | `/api/admin/shelf/entries/:id` | 会话 | `get` | US-01 |
| PUT | `/api/admin/shelf/entries/:id` | 会话 | `update` | US-01 |
| DELETE | `/api/admin/shelf/entries/:id` | 会话 | `remove` | US-01 |
| POST | `/api/admin/shelf/entries/:id/hide` | 会话 | `setHidden(true)` | US-01 |
| POST | `/api/admin/shelf/entries/:id/unhide` | 会话 | `setHidden(false)` | US-01 |
| POST | `/api/admin/shelf/recognize` | 会话 | `recognize` | US-02 |
| GET | `/api/admin/shelf/import/state` | 会话 | `importState` | US-04 |
| POST | `/api/admin/shelf/import` | 会话 | `importPage` | US-04 |
| POST | `/api/admin/shelf/import/finish` | 会话 | `finishImport` | US-04 |
| GET | `/api/shelf` | 公开 | `listPublic` | US-03（构建） |
| GET | `/covers/{yyyy}/{mm}/{file}` | 公开 | `CoverStore.get` | US-01、US-03 |

`:id` 不是正整数字符串 → 404 `NOT_FOUND`。

## 2. 数据对象

### ShelfEntryView（后台）

```json
{
  "id": "7",
  "type": "book",
  "title": "原则",
  "creator": "瑞·达利欧",
  "year": 2018,
  "status": "completed",
  "rating": 4,
  "markedOn": "2026-10-01",
  "comment": "值得反复读",
  "cover": "/covers/2026/10/k3j9x2m4q1ab.jpg",
  "doubanUrl": "https://book.douban.com/subject/27608239/",
  "doubanId": "27608239",
  "hidden": false,
  "createdAt": "2026-10-21T06:30:00.000Z",
  "updatedAt": "2026-10-21T06:30:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 十进制整数字符串 |
| type | enum | 书影音分类 |
| title | string | 1–200 |
| creator | string \| null | ≤ 200 |
| year | integer \| null | 1000–9999 |
| status | enum | `completed` / `in_progress` |
| rating | integer \| null | 1–5 |
| markedOn | string | `yyyy-MM-dd` |
| comment | string \| null | ≤ 1000 码点，换行为 `\n` |
| cover | string \| null | `/covers/...`；游戏为 IGDB 大图地址（同 `coverUrl`） |
| platform | enum \| null | 游戏：`ps5` / `ps4` / `switch` / `switch2` / `steam`；其他分类 `null` |
| coverUrl | string \| null | 仅游戏：`https://images.igdb.com/igdb/image/upload/t_1080p/{id}.jpg` |
| coverWidth / coverHeight | integer \| null | 与 `coverUrl` 同时有或同时 `null` |
| doubanUrl / doubanId | string \| null | 同时有或同时 `null` |
| hidden | boolean | — |
| createdAt / updatedAt | string | ISO 8601 UTC |

### ShelfPublicEntry（公开）

`ShelfEntryView` 去掉 `id`、`doubanId`、`hidden`、`createdAt`、`updatedAt`（保留 `platform`、`coverWidth`、`coverHeight`；`coverUrl` 不单独输出，游戏的 `cover` 即 IGDB 地址）。

### EntryFields（写入）

`type`、`title`、`creator`、`year`、`status`、`rating`、`markedOn`、`comment`、`doubanUrl`、`doubanId`、`platform`、`coverUrl`。未知字段忽略。

- `platform`：游戏必填（缺失或非法 → 400 `fields: ["platform"]`）；非游戏忽略并存 `null`
- `coverUrl`：游戏可选，按 `normalizeIgdbCoverUrl` 规范化，不合规 → 400 `fields: ["coverUrl"]`；非游戏忽略。**非游戏的封面仍只认上传文件**；游戏不接受上传文件（ADR-013）

## 3. 端点

### GET /api/admin/shelf/entries?type=book

- `type` 缺省 `book`；非法 → 400 `VALIDATION_FAILED`（`fields: ["type"]`）
- 200：`{ "items": ShelfEntryView[] }`，按 `sortEntries`（进行中 → `markedOn` 降序 → `id` 降序），含隐藏条目
- 另返回 `"counts": { "total": 12, "inProgress": 2, "hidden": 1 }`（当前分类；`total` 与 `inProgress` 不含隐藏）

### POST /api/admin/shelf/entries

`Content-Type: multipart/form-data`

| part | 必需 | 内容 |
|------|------|------|
| `fields` | 是 | JSON 字符串：`EntryFields` |
| `cover` | 否 | 封面文件（≤ 5,242,880 B；类型按文件头判定） |

| 状态 | 体 |
|------|----|
| 201 | `ShelfEntryView` |
| 400 | `VALIDATION_FAILED`（`fields` 列出出错字段）/ `COVER_TYPE_INVALID`（"封面只支持 jpg / png / webp"）/ `COVER_TOO_LARGE`（"封面不能超过 5 MB"）/ `BAD_REQUEST`（不是 multipart 或缺 `fields` / 非法 JSON / 游戏带上传封面） |
| 422 | `COVER_LINK_UNREACHABLE`："封面链接打不开，请检查后重试"（读取 IGDB 图片宽高失败：非 2xx、跳转、超时 8 秒、不是 jpg / png / webp） |
| 409 | `DUPLICATE_DOUBAN_ID`：`{ "error": { "code", "message": "这条已经录入过", "existing": { "id", "title" } } }` |

`doubanUrl` 与 `doubanId` 须同时提供或同时为 `null`，且 `doubanUrl === canonicalDoubanUrl(推断 kind, doubanId)`（kind 由 URL 主机推断）；不符 → 400 `VALIDATION_FAILED`（`fields: ["doubanUrl"]`）。成功后触发重建。

### GET /api/admin/shelf/entries/:id

200 `ShelfEntryView`；不存在 404 `NOT_FOUND`。

### PUT /api/admin/shelf/entries/:id

multipart：`fields`（同上，全量）+ 可选 `cover` 文件 + 可选 `coverAction`（`keep` 默认 / `remove`）。同时给 `cover` 文件与 `coverAction=remove` → 400 `BAD_REQUEST`。

- `doubanUrl` / `doubanId`：与原值相同或均为 `null`（清除）有效；其他值忽略并保持原值
- `coverUrl` 规范化后与原值相同时不请求 IGDB；分类改为游戏时原上传封面在更新成功后删除；改为非游戏时平台与 IGDB 封面清空
- 200 `ShelfEntryView`；400 / 422 同新增；404 `NOT_FOUND`
- 成功后触发重建（无论字段是否变化）

### DELETE /api/admin/shelf/entries/:id

204；404。删除行与封面对象，触发重建。

### POST /api/admin/shelf/entries/:id/hide · /unhide

200 `ShelfEntryView`（幂等）；404。状态实际变化时触发重建。

### POST /api/admin/shelf/recognize

请求 `application/json`：

```json
{ "text": "https://www.douban.com/doubanapp/dispatch/movie/37501131", "excludeId": "7" }
```

| 字段 | 规则 |
|------|------|
| text | 必需，去首尾空白后 1–10,000 字符，否则 400 `VALIDATION_FAILED` |
| excludeId | 可选，编辑时传当前条目 id |

成功 200：

```json
{
  "fields": {
    "type": "book",
    "title": "原则",
    "creator": "瑞·达利欧",
    "year": 2018,
    "coverData": "data:image/jpeg;base64,/9j/4AAQ…",
    "doubanUrl": "https://book.douban.com/subject/27608239/",
    "doubanId": "27608239"
  },
  "missing": []
}
```

`creator`、`year`、`coverData` 可为 `null`；`missing` ⊆ `["creator", "year", "cover"]`。识别为游戏时不下载封面：`coverData: null`、`missing` 含 `cover`；不返回 `platform`。

重复 200：

```json
{ "duplicate": { "id": "7", "title": "原则", "type": "book", "status": "completed", "markedOn": "2026-10-01" } }
```

失败 422：`error.code` ∈

| code | message（界面直接展示） |
|------|------------------------|
| `NOT_DOUBAN_LINK` | 不是豆瓣链接 |
| `NOT_SUBJECT_LINK` | 不是豆瓣条目链接，请粘贴书 / 电影 / 游戏条目的分享链接 |
| `FETCH_FAILED` | 链接打不开 |
| `PARSE_FAILED` | 解析不出条目信息 |

总耗时 ≤ 8 秒；无持久化副作用。

### POST /api/admin/shelf/import（US-04，ADR-014；已实现，任务 19：`src/pages/api/admin/shelf/import.ts`、`import/state.ts`、`import/finish.ts`）

请求 `application/json`：

```json
{ "uid": "189806038", "kind": "movie", "status": "done", "types": ["movie", "series"], "mode": "incremental", "start": 0 }
```

| 字段 | 规则 |
|------|------|
| uid | 必需，`isValidDoubanUid` |
| kind | `movie` / `book` / `game`（豆瓣大类：`movie` 含剧集，`book` 含漫画，`game` 含桌游） |
| status | `done` / `doing`（豆瓣标记状态，不是条目 `status`） |
| types | 本步要写入的本站分类：非空、不重复，且属于该 `kind`（movie → movie / series，book → book / comic，game → game / boardgame）；其余分类的标记跳过 |
| mode | `full`（翻到 `total`）/ `incremental`（`types` 各类别该状态都有水位时，按其中最早的水位截断：只处理 `create_time >= 截断点` 的标记，遇更早的即结束本步；任一无水位时同 `full`） |
| start | 整数，0–100,000，20 的倍数 |
| head | `start > 0` 时必需：第 1 页响应的 `head` 原样带回（`null` 或 `yyyy-MM-dd HH:mm:ss`）；`start = 0` 时忽略 |

任一不满足 → 400 `VALIDATION_FAILED`（`fields` 列出字段名），不发外部请求。

成功 200：

```json
{
  "total": 614,
  "head": "2026-10-18 08:25:08",
  "nextStart": 20,
  "created": 15,
  "updated": 3,
  "coverFailed": 1,
  "failed": [{ "doubanId": "26816519", "title": null, "reason": "PARSE_FAILED" }]
}
```

| 字段 | 说明 |
|------|------|
| total | 豆瓣该类该状态的标记总数（含想看过滤前的失效条目），用于进度 |
| head | 本类第 1 页第一条标记的 `create_time`（第 1 页由服务端取，后续页回显请求值）；豆瓣该类为空时 `null` |
| nextStart | 下一页的 `start`；`null` 表示本步已完整同步（全量翻完或增量到达截断点），服务端同时把 `types` 中各类别该状态的水位写为 `head`、`syncedAt` 写为当前时间 |
| created / updated / failed | 只统计 `types` 中分类的标记；跳过的标记不计 |
| created / updated | 本页新增 / 覆盖的条目数 |
| coverFailed | 本页新条目中封面下载失败的数量 |
| failed[] | `doubanId`（字符串，可能为 `null`：标记缺 `subject.id`）、`title`（字符串或 `null`）、`reason` ∈ `PARSE_FAILED` / `FETCH_FAILED` / `WRITE_FAILED` |

失败：

| HTTP | code | message（界面直接展示） |
|------|------|------------------------|
| 404 | `DOUBAN_USER_NOT_FOUND` | 豆瓣上找不到这个用户 |
| 403 | `DOUBAN_FORBIDDEN` | 豆瓣标记未公开或需要登录，无法导入 |
| 502 | `FETCH_FAILED` | 豆瓣暂时无法访问，已导入的条目已保存，可稍后重新导入 |

总耗时 ≤ 25 秒；不触发重建。

### GET /api/admin/shelf/import/state（US-04）

查询参数 `uid` 可选（须通过 `isValidDoubanUid`，否则 400 `VALIDATION_FAILED`）；缺省时取最近一次导入请求用的 ID。

200：

```json
{
  "uid": "189806038",
  "categories": [
    { "type": "movie", "status": "done", "watermark": "2026-10-18 08:25:08", "syncedAt": "2026-10-23T13:30:00.000Z" },
    { "type": "movie", "status": "doing", "watermark": null, "syncedAt": null }
  ]
}
```

`categories` 固定 12 项，按 电影、剧集、书、漫画、游戏、桌游 × done、doing 顺序；从没导入过时 `uid: null`、12 项全空。`watermark` 为豆瓣时间原文（北京时间）；`syncedAt` 为 ISO 8601 UTC。

### POST /api/admin/shelf/import/finish（US-04）

请求 `{ "changed": 18 }`（非负整数，否则 400 `VALIDATION_FAILED`；请求体不是 JSON → 400 `BAD_REQUEST`）。`changed > 0` 时触发一次重建。204。

### GET /api/shelf（已实现，Sprint 9 任务 7：`src/pages/api/shelf.ts`）

200：`{ "items": ShelfPublicEntry[] }`，只含 `hidden = 0`，按 `id` 降序；`Cache-Control: no-store`（只在构建时读取）。

### GET /covers/{yyyy}/{mm}/{file}

- 路径须满足 `isCoverKey`（去掉开头 `/`），否则 404
- 200：对象体；`Content-Type` 取对象元数据；`Cache-Control: public, max-age=31536000, immutable`；`Content-Length`
- 对象不存在 → 404

## 4. 错误码汇总

| code | HTTP | 来源 |
|------|------|------|
| `VALIDATION_FAILED` | 400 | 字段校验 |
| `BAD_REQUEST` | 400 | 请求格式 |
| `COVER_TYPE_INVALID` | 400 | 封面类型 |
| `COVER_TOO_LARGE` | 400 | 封面大小 |
| `COVER_LINK_UNREACHABLE` | 422 | 游戏 IGDB 封面读取失败 |
| `NOT_FOUND` | 404 | 条目不存在 |
| `DUPLICATE_DOUBAN_ID` | 409 | 去重 |
| `NOT_DOUBAN_LINK` / `NOT_SUBJECT_LINK` / `FETCH_FAILED` / `PARSE_FAILED` | 422 | 识别 |
| `DOUBAN_USER_NOT_FOUND` / `DOUBAN_FORBIDDEN` / `FETCH_FAILED` | 404 / 403 / 502 | 导入（同名 `FETCH_FAILED` 在导入接口为 502） |
| `UNAUTHORIZED` / `FORBIDDEN_ORIGIN` | 401 / 403 | middleware（沿用） |
