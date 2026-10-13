# post 领域模型

**最后更新**: 2026-10-13
**状态**: self-checked
**来源**: [feature-architecture.md](../../../features/F-001-文章写作/architecture/feature-architecture.md) §2、§3 · [ADR-002](../../../features/F-001-文章写作/architecture/adr/ADR-002-post-snapshot-model.md)

---

## 1. 职责与边界

- 负责：文章新建、自动保存（工作稿）、slug 规则与唯一性、发布 / 发布更新 / 撤回、删除、后台列表与计数、标签补全；对外（F-002）提供已发布只读查询
- 不负责：Markdown 渲染（`markdown` 模块）、图片存储（`media`，正文只含 URL 字符串）、读者缓存实现（F-002 实现 `onPublicationChanged`）

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

**派生属性**

| 名称 | 规则 |
|------|------|
| `status` | `published == null ? 'draft' : 'published'` |
| `hasUnpublishedChanges` | `status == 'published' && contentHash(draft) != contentHash(published)` |

用内容哈希判断"有未发布修改"，而不是比较时间：保存了与已发布内容相同的工作稿（比如改了又改回来）不会误判为有修改（US-08 状态机 S5、"发布后不产生多余的 dirty"）。

### 2.2 PostContent（值对象，不可变）

| 字段 | 类型 | 规则 |
|------|------|------|
| title | string | 去首尾空白；空则存为 `无标题`；≤ 200 字符 |
| slug | `Slug \| ''` | 草稿允许为空；非空时必须合法（见 §3） |
| tags | `Tag[]` | 去重（不区分大小写，保留首次出现的写法），≤ 10 个 |
| summary | string | 去首尾空白；≤ 200 字符（按 Unicode 码点计） |
| body | string | GFM Markdown 原文；≤ 200,000 字符 |
| publishedAt | 日期? | 作者填写的"发布日期"；新建默认当天（由前端按作者本地日期填入） |

`contentHash(c)` = SHA-256（规范化 JSON：上表 6 个字段按固定顺序）。

### 2.3 不变量

1. 自动保存（`saveDraft`）永远不修改 `published` 和 `lastPublishedAt`（US-06 约束）
2. `published != null` 时，`published` 满足发布校验（标题非"无标题"、slug 合法非空、正文非空白）
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
| `unpublish`（草稿） | — | 409 `NOT_PUBLISHED` |
| `delete` | 存在 | 删除整行；若曾发布则触发钩子 |

## 3. 值对象

| 值对象 | 规则 |
|--------|------|
| `PostId` | 正整数；API 中为字符串 |
| `Slug` | `^[a-z0-9]+(?:-[a-z0-9]+)*$`，1–80 字符 |
| `Tag` | 去首尾空白后 1–32 字符，不含 `,` 和换行 |
| `PublishDate` | `yyyy-MM-dd`，合法日历日期 |

**slugify（前端在标题变化时调用，纯函数，放在 `src/domains/post/slug.ts` 供前后端共用）**：
`NFKD` 规范化 → 去掉组合附加符号 → 小写 → 非 `[a-z0-9]` 替换为 `-` → 合并连续 `-` → 去首尾 `-` → 截断到 80 字符（不在 `-` 处结尾）。结果为空（如纯中文标题）时返回 `''`，前端提示"请填写英文 slug"（US-03-2）。

## 4. 领域服务

```ts
interface PostService {
  create(input: DraftInput, now: Date): Promise<PostView>;                 // US-03/06 首次保存
  saveDraft(id: PostId, input: DraftInput, now: Date): Promise<PostView>;  // US-03/06，整份覆盖工作稿
  getForEdit(id: PostId): Promise<PostView | null>;
  list(q: ListQuery): Promise<PostListResult>;                              // US-07
  publish(id: PostId, now: Date): Promise<PostView>;                        // US-08 发布 / 发布更新
  unpublish(id: PostId): Promise<PostView>;                                 // US-08 撤回
  delete(id: PostId): Promise<void>;                                        // US-09
  suggestTags(q: string): Promise<TagSuggestion[]>;                         // US-03-6
}

interface PublishedPostQuery {   // F-002 只读接口（published-query.ts）
  listPublished(q: { page: number; pageSize: number; tag?: string }): Promise<{ items: PublishedPostSummary[]; total: number }>;
  getPublishedBySlug(slug: string): Promise<PublishedPost | null>;
  listPublishedTags(): Promise<{ name: string; count: number }[]>;
}

type PublicationChange = { kind: 'published' | 'updated' | 'unpublished' | 'deleted'; slug: string; prevSlug?: string };
interface PublicationHooks { onPublicationChanged(e: PublicationChange): Promise<void> } // F-001 内为空实现
```

- `DraftInput` = `PostContent` 的全部字段（客户端每次发送整份）；服务端负责规范化（标题空 → `无标题`、标签去重等）
- `PostView` = API 中的文章对象（见 api-contract §2）
- 钩子调用失败只记录日志，不让发布失败（读者缓存最终由 F-002 的 TTL 兜底）
- `publish` 中 `prevSlug` = 发布前快照的 slug（发布更新改了 slug 时，F-002 需要让旧地址失效）

**slug 冲突检查**（`saveDraft` / `create` / `publish` 都执行）：
`SELECT 1 FROM posts WHERE id != ? AND (slug = ? OR pub_slug = ?)`，命中 → 409 `SLUG_TAKEN`，整份保存不生效。

## 5. 仓储接口

```ts
interface PostRepo {
  insert(p: NewPostRow): Promise<PostId>;
  get(id: PostId): Promise<Post | null>;
  updateDraft(id: PostId, c: PostContent, draftHash: string, now: Date): Promise<boolean>;   // false = 不存在
  setPublished(id: PostId, c: PostContent | null, pubHash: string | null, at: Date | null): Promise<boolean>;
  delete(id: PostId): Promise<Post | null>;     // 返回被删行（用于钩子）
  slugTaken(slug: string, exceptId?: PostId): Promise<boolean>;
  list(q: ListQuery): Promise<{ rows: Post[]; total: number; counts: StatusCounts }>;
  tags(q: string, limit: number): Promise<TagSuggestion[]>;
}
```

`publish` 在一个 D1 `batch` 中完成"slug 检查 + 写快照"，避免并发下的 slug 冲突（单作者场景下以防多标签页）。

## 6. 列表查询（US-07）

| 参数 | 规则 |
|------|------|
| `status` | `all`（默认）/ `draft` / `published`；`published` 包含有未发布修改的 |
| `q` | 去首尾空白；对工作稿标题做不区分大小写的包含匹配（`LIKE '%' \|\| ? \|\| '%' ESCAPE '\'`，转义 `%`、`_`、`\`）；空串等于不过滤 |
| `page` | 正整数，默认 1；超出范围返回空 `items`（不报错），前端回到最后一页 |
| `pageSize` | 固定 20 |
| 排序 | `updated_at DESC, id DESC` |
| `counts` | `{ all, draft, published }`：只应用 `q`，不应用 `status`（分段控件的数量） |
| `total` | 应用 `q` + `status` 后的总数（分页用） |

## 7. 服务的需求

| US | 使用的能力 |
|----|-----------|
| US-03 edit-post-info | `create`、`saveDraft`（slug 校验）、`getForEdit`、`suggestTags`、`slugify` |
| US-04 markdown-preview | — （渲染在 `markdown` 模块） |
| US-06 autosave-draft | `create`、`saveDraft`（不变量 1）、`updatedAt` |
| US-07 post-list | `list`（筛选、搜索、分页、计数、`hasUnpublishedChanges`） |
| US-08 publish-post | `publish`、`unpublish`、`PublishedPostQuery`（读者可见性）、`onPublicationChanged` |
| US-09 delete-post | `delete`、`onPublicationChanged` |
| F-002 | `PublishedPostQuery` |

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

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
