# ADR-009: 未引用判定由 post 领域提供引用查询，正文扫描在 D1 内完成

## 状态

Accepted（2026-10-16，F-006 design-arch；同日 implement 任务 1 实测后修订方案 C 的实现方式）

## 背景

判定一张图片是否被引用，需要在全部文章的 `body`、`cover`、`pub_body`、`pub_cover` 中查找它的 key。可选做法：

| 方案 | 做法 | 问题 |
|------|------|------|
| A. Worker 内全文扫描 | 读出全部文章四列，在 JS 里用正则提取 key | 读出与解析全部正文都计入 Worker CPU。Workers 免费版每次请求 CPU 上限 10ms（[nfr](../../../../../product/nfr.md)），正文总量到几 MB 就会超限 |
| B. 引用索引表 | 文章保存 / 发布时提取引用，写入 `post_image_refs` | 要改 F-001 自动保存与发布写路径，还要迁移和回填，改动面最大 |
| C1. D1 内逐图匹配 | 候选 key 以 JSON 参数传入，`json_each` × `posts` 用 `instr` 判定 | **实测不可行**：300 篇 / 3,000 张需 34 秒。每张图片都要扫一遍全部正文，复杂度为图片数 × 文章数 × 正文长度 |
| C2. D1 内抽取片段 | 递归 CTE 把每列正文扫一遍，取出每处 `img/` 之后 120 个字符的片段（`DISTINCT`），Worker 只用正则解析这些短片段 | 复杂度为正文总长 + 引用处数；实测 300 篇 / 3,000 张 711 ms |

## 决策

采用 **C2**。

1. **领域边界**：`posts` 表只由 `post` 领域访问。`post` 新增只读查询 `ImageReferenceQuery`（`src/domains/post/image-reference-query.ts`），入参是候选图片列表，返回每个 key 是否被引用、是否被带实况的方式引用。`media` 不读 `posts`，`post` 也不读 `images`。
2. **抽取**：一条递归 CTE。`src` 先挑出含 `img/` 的列（`body` / `pub_body` 记为 `b`，`cover` / `pub_cover` 记为 `c`）；`hit` 反复用 `instr` 找下一处 `img/`，取 `substr(rest, pos, 120)` 作为片段，剩余部分继续递归；最后 `SELECT DISTINCT kind, snippet`。不用 `LIKE`：D1 限制 LIKE 模式不超过 50 字节（post domain-model §6）。
3. **被引用**：片段开头能解析出 `img/{yyyy}/{mm}/{id}_{w}x{h}_{rgb}.` 主干，且主干与图片 key 的主干（去掉扩展名、保留点）相同。这一规则同时覆盖图片地址与视频地址（`.live.mp4`），也覆盖任何写法（Markdown、链接、HTML、完整地址、代码块）。id 后必须是 `_`，正则不会把其他字符当通配。
4. **带实况引用**（只对有视频的图片判定，只看 `b` 类片段）：满足以下任一条件即算。
   - 地址后的 URL 片段（从 `#` 起，到空白、引号、括号、尖括号为止）转小写后包含 `live`。
   - 片段本身就是视频地址。

   这条规则比 markdown 的 `parseMarks`（片段按 `,` 拆分后只认小写的 `live`）宽：`#LIVE`、`#lively` 也算带实况。所以 markdown 判定为实况的引用，这里一定也判定为实况，只会多保留，不会多删。
5. **保护期**在 `media` 中按 `images.created_at` 过滤。
6. **删除参数**：key 列表以一个 JSON 数组字符串绑定，写成 `key IN (SELECT value FROM json_each(?))`，不受 D1 每条语句 100 个绑定参数的限制。

## 后果

- 正面：不改 F-001 写路径，没有回填。Worker 只解析去重后的短片段：每处引用 120 字符，数量与引用处数相同，与正文长度无关。检测与清理共用同一判定。
- 实测（miniflare 本地 D1，`tests/integration/media/storage-orphans-perf.test.ts`）：300 篇（工作稿、快照各约 10 KB、各 10 处引用）/ 3,000 张，检测 711 ms。线上 D1 尚未实测，上线后用存储页观察。
- 负面：URL 片段超过约 70 字符时会被截断，截断部分里的 `live` 看不到。实际片段最长是 `#wide,accordion,live`，可接受。
- 竞态：判定与删除不在同一事务中，中间有毫秒级窗口（单作者场景可接受）。清理前必定重新判定，满足 US-02 AC4。
- `media` 领域不变量 1（"不留半对"）调整为：上传时不留半对；清理可以只移除视频（`video_key` / `video_size` 置空）。
- 若文章数到上千篇、正文总量到几十 MB，再评估方案 B。
