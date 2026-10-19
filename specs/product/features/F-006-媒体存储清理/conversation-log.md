# 对话记录 — F-006

> 本文件由 sdd:log-conversation 自动维护，记录每个 SDD 阶段结束时的关键决策与对话摘要。

## [define-feature] 2026-10-16 · miraclehifi

**关键决策**
- 原 Backlog（上传体验 + 清理四合一）拆为两条：上传体验 → media-upload-experience（F-001 增量，由并行会话负责）；清理 → 本 Feature
- 新建 F-006 而非 F-001 增量：F-001 明确把"图片库管理"列为范围外，清理是独立工作流、可独立交付
- 扫描四列 `body` / `cover` / `pub_body` / `pub_cover`（原稿只写了不存在的 `posts.content` 与 `cover`，漏掉已发布快照会误删线上图片）
- 取消 `#live` 后的视频允许清理：只删视频，`video_key` / `video_size` 置空
- 24 小时保护期：防止刚上传、尚未自动保存的图片被删
- 页面与接口用 `/admin/storage`、`/api/admin/storage/*`，避免与 F-005 书影音 `/media` 及其后台冲突
- 清理接口无请求体，只支持全量清理，服务端重新扫描后执行

**对话摘要**
- 用户：「读一下这个需求文档看一下有没有需要修改的」
- AI：指出扫描字段错误与漏扫已发布快照、缺保护期、取消实况与清理的冲突、清理接口请求体矛盾、缺影响分析与估算，建议拆分
- 用户：「允许清理，默认关闭实况」
- 用户：「开始做 media-orphan-cleanup」（上传体验由另一会话并行推进）

## [design-domain] 2026-10-16 · miraclehifi

**关键决策**
- 判定在 D1 内完成（ADR-009）：Workers 免费版每请求 CPU 10ms，Worker 内全文正则扫描不可行；引用索引表要改 F-001 写路径，放弃
- `post` 提供只读 `ImageReferenceQuery.classify`，`media` 不读 `posts` 表；候选以一个 JSON 数组参数经 `json_each` 传入，避开 100 个绑定参数限制
- 被引用 = key 主干（去扩展名保留点）出现在四列任一；带实况 = `key#` 之后出现 live（不区分大小写）或直接出现视频 key——偏保守，宁可少删
- 用 `instr` 不用 `LIKE`：D1 限制 LIKE 模式 ≤ 50 字节，key 已约 45 字节
- 清理先删 R2 后改 D1，失败可重入；`media` 不变量 1 改为"上传不留半对，清理可单独移除视频"
- 视频被清理后再加 `#live`：沿用 `LiveBadge` 现有降级（播放失败后隐藏），US-02 AC6 同步改写
- 性能基线改为 300 篇 / 3,000 张 < 2s

**对话摘要**
- AI：发现 F-005 计划新建的 `media` Domain 与现有图片领域重名，记入跨 Feature 影响，留给 F-005 design-arch 改名
- AI：admin.pen 与并行会话 b9 协调先后顺序，在同一打开文档上修改，待用户 Ctrl+S 保存
