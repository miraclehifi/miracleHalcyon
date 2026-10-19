# post 领域模型

**最后更新**: 2026-10-15
**状态**: self-checked
**来源**: [feature-architecture.md](../../../features/F-001-文章写作/architecture/feature-architecture.md) §2、§3 · [ADR-002](../../../features/F-001-文章写作/architecture/adr/ADR-002-post-snapshot-model.md)

---

## 1. 职责与边界

- 负责：文章新建、自动保存（工作稿）、slug 规则与唯一性、发布 / 发布更新 / 撤回、删除、后台列表与计数、标签补全；对外（F-002）提供已发布只读查询
- 不负责：Markdown 渲染（`markdown` 模块）、图片存储（`media`，正文只含 URL 字符串）、读者页重建（F-002 实现 `onPublicationChanged`，调用 Deploy Hook）

## 2. 聚合：Post

### 2.1 Post（聚合根）

| 属性 | 类型 | 说明 |
|------|------|------|
| id | `PostId` | D1 自增整数 |
| draft | `PostContent` | 工作稿：作者正在编辑的内容，自动保存只改这里 |
| published | `PostContent?` | 已发布快照；null = 草稿 |
| lastPublishedAt | 时间戳? | 最近一次发布 / 发布更新的时间；撤回时清空 |
| createdAt | 时间戳 | — |
| updatedAt | 时间戳 | 最近一次工作稿保存时间（列表排序用） |

**派生属性**（已实现：`deriveStatus`，`src/domains/post/post.ts`，比较库中存的 `draft_hash` / `pub_hash`）

| 名称 | 规则 |
|------|------|
| `status` | `published == null ? 'draft' : 'published'` |
| `hasUnpublishedChanges` | `status == 'published' && contentHash(draft) != contentHash(published)` |

用内容哈希判断"有未发布修改"，而不是比较时间：保存了与已发布内容相同的工作稿（比如改了又改回来）不会误判为有修改（US-08 状态机 S5、"发布后不产生多余的 dirty"）。

### 2.2 PostContent（值对象，不可变）

> 已实现：`normalizeContent`（`src/domains/post/content.ts`）；校验失败抛 `ValidationError`（`fields` 按 title、slug、tags、summary、body、publishedAt 顺序列出全部出错字段），字符数按 Unicode 码点计。

| 字段 | 类型 | 规则 |
|------|------|------|
| title | string | 去首尾空白；空则存为 `无标题`；≤ 200 字符 |
| slug | `Slug \| ''` | 草稿允许为空；非空时必须合法（见 §3） |
| tags | `Tag[]` | 去重（不区分大小写，保留首次出现的写法），≤ 10 个 |
| summary | string | 去首尾空白；≤ 200 字符（按 Unicode 码点计） |
| body | string | GFM Markdown 原文；≤ 200,000 字符 |
| publishedAt | 日期? | 作者填写的"发布日期"；新建默认当天（由前端按作者本地日期填入） |
| cover | `CoverUrl?`（已实现：`isCoverUrl`，`src/domains/post/content.ts`） | 封面图片地址（F-002 US-06）；`null` = 无封面。必须是站内图片地址（`parseImageKey` 能解析：`/img/yyyy/mm/{10 位 id}_{宽}x{高}_{6 位 hex}.{jpg|png|webp|gif}`，不带查询串与片段）；不校验对象是否存在（与正文图片一致）|

`contentHash(c)` = SHA-256（规范化 JSON：title、slug、tags、summary、body、publishedAt 按固定顺序组成数组；**`cover` 非空时追加为第 7 项，为空时不追加**——迁移 0003 前存下的哈希保持有效，旧文章不会因迁移变成"有未发布修改"）。已实现：`src/domains/post/content-hash.ts`（标签顺序计入哈希）。

### 2.3 不变量

1. 自动保存（`saveDraft`）永远不修改 `published` 和 `lastPublishedAt`（US-06 约束）
2. `published != null` 时，`published` 满足发布校验（标题非"无标题"、slug 合法非空、正文非空白）（已实现：`validateForPublish`，`src/domains/post/post.ts`）
3. 任意两篇文章之间，`{draft.slug, published.slug}` 中的非空值互不相同（slug 全站唯一，含工作稿与已发布）
4. 读者端查询只读 `published`，永远读不到 `draft`（ADR-002）
5. 删除是物理删除；删除后同 id 不复用（`AUTOINCREMENT`）

### 2.4 状态机

```
            publish                save(变化)
  draft ───────────────▶ published ─────────────▶ published·modified
    ▲                     (clean)   ◀─────────────       │
    │                        │       publish（发布更新）  │
    └──── unpublish ─────────┴───────────────────────────┘
  任意状态 ── delete ──▶ （不存在）
```

| 操作 | 前置 | 结果 |
|------|------|------|
| `publish` | 任意存在的文章；工作稿通过发布校验 | `published = draft'`（`draft'` = 工作稿，若 publishedAt 为空则补当天并同时写回工作稿），`lastPublishedAt = now` |
| `publish`（已发布且无修改） | — | 幂等：返回当前状态，不更新时间、不触发钩子 |
| `unpublish` | `status == 'published'` | `published = null`，`lastPublishedAt = null`；工作稿保持（含未发布修改）（US-08 S11） |
| `unpublish`（草稿） | — | 409 `NOT_PUBLISHED`（已实现：`NotPublishedError`；撤回成功触发 `unpublished` 钩子） |
| `delete` | 存在 | 删除整行；当前已发布时触发 `deleted` 钩子（快照 slug；已撤回的不再触发）。已实现（Sprint 2） |

## 3. 值对象

| 值对象 | 规则 |
|--------|------|
| `PostId` | 正整数；API 中为字符串 |
| `Slug` | `^[a-z0-9]+(?:-[a-z0-9]+)*$`，1–80 字符 |
| `Tag` | 去首尾空白后 1–32 字符，不含 `,` 和换行 |
| `PublishDate` | `yyyy-MM-dd`，合法日历日期 |
| `CoverUrl` | 站内图片地址，`parseImageKey(url) != null` 且以 `/img/` 开头；≤ 200 字符 |

**slugify（前端在标题变化时调用，纯函数，放在 `src/domains/post/slug.ts` 供前后端共用；已实现，含 `isValidSlug`）**：
`NFKD` 规范化 → 去掉组合附加符号 → 小写 → 非 `[a-z0-9]` 替换为 `-` → 合并连续 `-` → 去首尾 `-` → 截断到 80 字符（不在 `-` 处结尾）。结果为空（如纯中文标题）时返回 `''`，前端提示"请填写英文 slug"（US-03-2）。

## 4. 领域服务

```ts
interface PostService { // 已实现 create / saveDraft / getForEdit：createPostService（src/domains/post/service.ts）
  create(input: DraftInput, now: Date): Promise<PostView>;                 // US-03/06 首次保存
  saveDraft(id: PostId, input: DraftInput, now: Date): Promise<PostView>;  // US-03/06，整份覆盖工作稿
  getForEdit(id: PostId): Promise<PostView | null>;
  list(q: ListQuery): Promise<PostListResult>;                              // US-07
  publish(id: PostId, now: Date): Promise<PostView>;                        // US-08 发布 / 发布更新
  unpublish(id: PostId): Promise<PostView>;                                 // US-08 撤回
  delete(id: PostId): Promise<void>;                                        // US-09
  suggestTags(q: string): Promise<TagSuggestion[]>;                         // US-03-6
}

interface PublishedPostQuery {   // F-002 只读接口（published-query.ts，已实现：D1PublishedPostQuery；tag 过滤与标签统计不区分大小写）
  listPublished(q: { page: number; pageSize: number; tag?: string }): Promise<{ items: PublishedPostSummary[]; total: number }>;
  getPublishedBySlug(slug: string): Promise<PublishedPost | null>;
  listPublishedTags(): Promise<{ name: string; count: number }[]>;
}

type PublicationChange = { kind: 'published' | 'updated' | 'unpublished' | 'deleted'; slug: string; prevSlug?: string };
interface PublicationHooks { onPublicationChanged(e: PublicationChange): Promise<void> } // F-001 内为空实现
```

- `DraftInput` = `PostContent` 的全部字段（客户端每次发送整份）；服务端负责规范化（标题空 → `无标题`、标签去重等）
- `PostView` = API 中的文章对象（见 api-contract §2）
- 钩子调用失败只记录日志，不让发布失败（作者可在 Cloudflare 控制台手动重建）
- 已实现 `publish`、`PublicationHooks` / `noopHooks`（`src/domains/post/hooks.ts`）、`MissingFieldsError`（422 `MISSING_FIELDS`）；`publishedAt` 为空时补 **UTC** 当天（新建时前端已按作者本地日期填入，此处只是兜底）
- `publish` 中 `prevSlug` = 发布前快照的 slug（发布更新改了 slug 时，重建后旧地址不再生成页面）

**slug 冲突检查**（`saveDraft` / `create` / `publish` 都执行）：
`SELECT 1 FROM posts WHERE id != ? AND (slug = ? OR pub_slug = ?)`，命中 → 409 `SLUG_TAKEN`，整份保存不生效。已实现于 `create` / `saveDraft`（`SlugTakenError`；`saveDraft` 先确认文章存在再查 slug）；`publish` 随发布服务实现。

## 5. 仓储接口

```ts
interface PostRepo { // 已实现 insert / get / updateDraft / setPublished / slugTaken：D1PostRepo（src/domains/post/repo.ts）
  insert(p: NewPostRow): Promise<PostId | null>;   // null = slug 已被占用
  get(id: PostId): Promise<Post | null>;
  updateDraft(id: PostId, c: PostContent, draftHash: string, now: Date): Promise<boolean>;   // false = 不存在或 slug 已被占用
  setPublished(id: PostId, c: PostContent | null, pubHash: string | null, at: Date | null): Promise<boolean>;   // 同上
  delete(id: PostId): Promise<Post | null>;     // 返回被删行（用于钩子）
  slugTaken(slug: string, exceptId?: PostId): Promise<boolean>;
  list(q: ListQuery): Promise<{ rows: Post[]; total: number; counts: StatusCounts }>;
  tags(q: string, limit: number): Promise<TagSuggestion[]>;
}
```

`insert` / `updateDraft` / `setPublished` 的写入语句自带"slug 未被其他文章的工作稿或快照占用"条件（`WHERE NOT EXISTS …`），检查与写入原子完成，并发写同一 slug 只有一个成功（单作者场景下以防多标签页）。服务层仍先 `slugTaken` 预检以便给出 `SLUG_TAKEN`；写入未生效时再查一次，区分 `SLUG_TAKEN` 与 `POST_NOT_FOUND`。

## 6. 列表查询（US-07）

> 已实现：`PostService.list` + `D1PostRepo.list`（一个 D1 `batch` 取列表、total、counts）。仓储返回 `PostSummary`（只含列表所需列，不读正文），而非 §5 写的完整 `Post`。

| 参数 | 规则 |
|------|------|
| `status` | `all`（默认）/ `draft` / `published`；`published` 包含有未发布修改的 |
| `q` | 去首尾空白；对工作稿标题做不区分大小写（ASCII）的包含匹配：`instr(lower(title), lower(?)) > 0`。不用 LIKE：D1 限制 LIKE 模式 ≤ 50 字节，100 字中文搜索词会报 "pattern too complex"；instr 也无需转义 `%`、`_`、`\`；空串等于不过滤 |
| `page` | 正整数，默认 1；超出范围返回空 `items`（不报错），前端回到最后一页 |
| `pageSize` | 固定 20 |
| 排序 | `updated_at DESC, id DESC` |
| `counts` | `{ all, draft, published }`：只应用 `q`，不应用 `status`（分段控件的数量） |
| `total` | 应用 `q` + `status` 后的总数（分页用） |

## 6.1 图片引用查询（F-006）

> 来源：F-006 [ADR-009](../../../features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)。只读，不改写路径。已实现（Sprint 7 任务 1）：`src/domains/post/image-reference-query.ts`（`D1ImageReferenceQuery`、`keyStem`、`collectReferences`）

```ts
interface ImageReferenceQuery {   // media.StorageService 的依赖
  classify(images: { key: string; videoKey: string | null }[]): Promise<Map<string, ImageReference>>;
}
type ImageReference = { referenced: boolean; liveReferenced: boolean };
function keyStem(key: string): string;   // 去掉最后一个扩展名、保留点："img/…_112233.jpg" → "img/…_112233."
function collectReferences(rows: { kind: 'b' | 'c'; snippet: string }[]): { stems: Set<string>; liveStems: Set<string> };
```

**D1 部分**：一条递归 CTE，把每列正文扫一遍。
1. `src`：挑出含 `img/` 的列，`body`、`pub_body` 记为 `b`，`cover`、`pub_cover` 记为 `c`。
2. `hit`：每一步用 `instr` 找下一处 `img/`，取 `substr(rest, pos, 120)` 作为片段，剩余部分继续递归。
3. 输出 `SELECT DISTINCT kind, snippet`。

不用 `LIKE`：§6 记录了 D1 限制 LIKE 模式不超过 50 字节。

**Worker 部分**：`collectReferences` 用 `^(img/\d{4}/\d{2}/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.)(live\.mp4|[a-z0-9]+)(#[^\s"'()<>[\]]*)?` 解析片段。
- 主干放入 `stems`。
- `b` 类片段若片段地址是视频地址，或 URL 片段转小写后含 `live`，主干再放入 `liveStems`（比 `parseMarks` 宽，宁可少删）。
- `classify` 按 `keyStem(key)` 查这两个集合；没有视频的图片，`liveReferenced` 恒为 false。
- 空列表直接返回空 Map，不查询。

实测：300 篇 / 3,000 张 711 ms（ADR-009）。

## 7. 服务的需求

| US | 使用的能力 |
|----|-----------|
| US-03 edit-post-info | `create`、`saveDraft`（slug 校验）、`getForEdit`、`suggestTags`、`slugify` |
| US-04 markdown-preview | — （渲染在 `markdown` 模块） |
| US-06 autosave-draft | `create`、`saveDraft`（不变量 1）、`updatedAt` |
| US-07 post-list | `list`（筛选、搜索、分页、计数、`hasUnpublishedChanges`） |
| US-08 publish-post | `publish`、`unpublish`、`PublishedPostQuery`（读者可见性）、`onPublicationChanged` |
| US-09 delete-post | `delete`、`onPublicationChanged` |
| F-002 US-03、US-04、US-05、US-07–US-10 | `PublishedPostQuery`（经公开接口，构建时读取）、`onPublicationChanged`（Deploy Hook 实现） |
| F-006 US-01、US-02 | `ImageReferenceQuery.classify`（只读四列，§6.1） |
| F-002 US-06 post-cover | `PostContent.cover`、`saveDraft`、`publish`（快照含封面）、`contentHash` 兼容 |

## 8. 单元测试规格

| UT-ID | 对象 | 用例 | 预期 |
|-------|------|------|------|
| POST-UT-01 | `slugify` | `Hello Astro` → `hello-astro`；`Café  Déjà-vu!` → `cafe-deja-vu`；`你好世界` → `''`；`Astro 5 入门` → `astro-5`；100 字符英文 → ≤ 80 且不以 `-` 结尾 | 如左 |
| POST-UT-02 | `normalizeContent` | 标题 `'  '` → `无标题`；标签 `['Astro','astro',' TS ']` → `['Astro','TS']`；201 字摘要；11 个标签；非法 slug `Hello_World` | 前两项规范化；后三项抛 `VALIDATION_FAILED`（带字段名） |
| POST-UT-03 | `contentHash` | 相同内容不同对象；只改标签顺序；改任一字段 | 相同；不同（顺序有意义）；不同 |
| POST-UT-04 | 派生状态 | 无快照；快照 = 工作稿；快照 ≠ 工作稿 | `draft`/false；`published`/false；`published`/true |
| POST-UT-05 | `validateForPublish` | 决策表：标题 {正常, `无标题`} × slug {合法, 空} × 正文 {有, 空白} | 只有全部满足才通过；缺失字段列表按 `title, slug, body` 顺序返回 |
| POST-UT-06 | `PostService.publish`（内存仓储） | 草稿发布；publishedAt 为空时补当天；已发布无修改再发布；有修改发布更新；发布更新改了 slug | 状态与快照正确；幂等不触发钩子；钩子收到 `prevSlug` |
| POST-UT-07 | `saveDraft` 不变量 | 已发布文章保存新内容 | `published` 与 `lastPublishedAt` 不变，`hasUnpublishedChanges` 为 true |
| POST-UT-08 | `unpublish` | 有修改的已发布文章；草稿 | 工作稿保留为修改后内容、快照清空；草稿 → `NOT_PUBLISHED` |
| POST-UT-09 | slug 唯一 | 与他人工作稿冲突；与他人快照冲突；与自己快照相同；空 slug | 前两个 `SLUG_TAKEN`；后两个通过 |
| POST-UT-10 | 列表（Workers 集成 + D1） | 25 篇混合状态；`q` 含 `%`、`_`；page 3 | 计数口径、排序、转义、空页如 §6 |
| POST-UT-11 | `PublishedPostQuery` | 草稿、有修改的已发布文章 | 草稿查不到；有修改的返回快照内容而非工作稿 |
| POST-UT-12 | `normalizeContent` 封面 | `null`；合法站内地址；外链、`/img/../x`、key 格式不符、带 `?x=1`、数字、`javascript:` | 前两项通过；其余抛 `VALIDATION_FAILED`（`fields` 含 `cover`）（TC-US06-08） |
| POST-UT-13 | `contentHash` 兼容 | 同一内容 `cover: null` 与 0003 前的 6 字段结果；`cover` 非空 | 前者相等（与旧算法同值）；后者不同（TC-US06-09） |
| POST-UT-14 | 封面随快照（Workers 集成 + D1） | 已发布 clean 文章改封面后保存；再发布 | 保存后 `hasUnpublishedChanges` 为 true、公开接口 cover 不变；发布后为新封面（TC-US06-05、06） |
| POST-UT-15 | `keyStem` | `img/2026/10/a_1x1_000000.jpg`；`.webp`；无扩展名 | `img/2026/10/a_1x1_000000.`；同理；原样 |
| POST-UT-16 | `ImageReferenceQuery.classify`（Workers 集成 + D1） | F-006 TC-US01-02、03、05、07 的数据 | 四列、各种写法、key 中 `_` 不作通配、视频地址、保守 live 判定如 ADR-009 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-13 | 1.1 | `onPublicationChanged` 用途改为触发读者页重建（ADR-001 修订） | miraclehifi |
| 2026-10-15 | 1.2 | F-002：`PostContent` 新增 `cover`（`CoverUrl`），`contentHash` 兼容规则；POST-UT-12–14 | miraclehifi |
| 2026-10-16 | 1.3 | F-006：新增 §6.1 `ImageReferenceQuery`（只读，图片引用判定，[ADR-009](../../../features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)） | miraclehifi |
