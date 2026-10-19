# F-006 媒体存储清理 — 架构设计

**最后更新**: 2026-10-16
**状态**: draft

> 来源：[feature-scope](../../../../product/features/F-006-媒体存储清理/feature-scope.md) · [US-01](../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-01-detect-orphans/story.md) · [US-02](../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-02-cleanup-orphans/story.md) · [admin-storage.md](../../../../ui/pages/admin-storage.md)

---

## 1. 架构概览

```
浏览器 /admin/storage（StoragePage，React）
   │  GET  /api/admin/storage/orphans
   │  POST /api/admin/storage/cleanup
   ▼
middleware（会话 + Origin，沿用 auth）
   ▼
API 路由 src/pages/api/admin/storage/{orphans,cleanup}.ts
   ▼
media · StorageService（新增，src/domains/media/storage.ts）
   ├─ ImageRepo（D1 images）：列出保护期外的候选、批量删除、置空视频列
   ├─ MediaStore（R2 MEDIA）：批量删除对象
   └─ ImageReferenceQuery（post 领域提供，只读 posts 四列）——ADR-009
```

不新增领域。`media` 扩展清理能力；`post` 新增一个只读查询（D1 递归 CTE 抽取引用片段，Worker 只解析片段，ADR-009 方案 C2）。没有 DDL 变更。

## 2. Domain 边界与职责

| Domain | 变更 | 新增 / 变更接口 |
|--------|------|----------------|
| `media` | 新增 `StorageService`（检测、清理）；新增清理用接口 `ImageCleanupRepo`、`MediaCleanupStore`（与上传用的 `ImageRepo`、`MediaStore` 分开）；不变量 1 调整（见 ADR-009） | `detectOrphans(now)`、`cleanupOrphans(now)`；`ImageCleanupRepo.listAll()`、`removeOrphans(imageKeys, videoOnlyKeys)`；`MediaCleanupStore.deleteMany(keys)` |
| `post` | 新增只读查询，不改写路径 | `ImageReferenceQuery.classify(images: { key, videoKey }[]) → Map<key, { referenced, liveReferenced }>` |
| `auth` | 无 | 沿用 middleware |
| `markdown` | 无 | 片段语义的权威定义仍是 `parseMarks`；引用查询的实况判定比它宽（ADR-009） |

**依赖方向**：`media.StorageService → post.ImageReferenceQuery`（以接口注入，便于测试）。`post` 不依赖 `media`。

## 3. 数据流

### US-01 检测

```
GET /api/admin/storage/orphans
→ StorageService.detectOrphans(now)
   1. ImageCleanupRepo.listAll() → 全部 images 行（key、size、videoKey、videoSize、createdAt）
   2. ImageReferenceQuery.classify(全部行) → 每个 key 的 { referenced, liveReferenced }
   3. 分类：未被引用 → 未引用图片（size 计入图片体积，videoSize 计入合计）；
            被引用、有视频、未被带实况引用 → 未引用视频
   4. createdAt 晚于 now − 24h 的从两类中移出，计入 protectedCount
   5. 返回 summary
```

`protectedCount` 的定义：保护期内、按规则本会计入未引用的行数（图片或视频各算 1 项）。

### US-02 清理

```
POST /api/admin/storage/cleanup
→ StorageService.cleanupOrphans(now)
   1. 重新执行检测步骤 1–3，得到 images[]、videos[]（不信任前端）
   2. R2：MediaCleanupStore.deleteMany(images 的图片 key + 视频 key + videos 的视频 key)，每批 ≤ 1000
   3. D1：ImageCleanupRepo.removeOrphans——一个 batch 内 DELETE images WHERE key IN json_each(images) + UPDATE images SET video_key = NULL, video_size = NULL WHERE key IN json_each(videos)
   4. 返回 { removedImages, removedVideos, freedBytes }
   任一步失败 → 500 CLEANUP_FAILED；先 R2 后 D1，重跑幂等（R2 删除不存在的 key 不报错；D1 行还在，下次检测可见）
```

## 4. 前端组件架构

| 路由 | 入口 | 组件 | 变更类型 |
|------|------|------|---------|
| `/admin/storage` | `src/pages/admin/storage.astro`（`prerender = false`，同 `admin/index.astro` 模式） | `AdminHeader current="storage"`、`StoragePage client:load` | 新增 |
| `/admin` | `src/pages/admin/index.astro` | `AdminHeader current="posts"` | 修改（传 prop） |

| 组件 / 模块 | 路径 | 变更 |
|------------|------|------|
| `AdminHeader` | `src/components/admin/AdminHeader.tsx` | 修改：`current` prop、导航"文章 / 存储"（桌面文字、手机图标） |
| `StatCard` | `src/components/ui/StatCard.tsx` | 新增（components.md"业务区块"） |
| `StoragePage` | `src/components/admin/storage/StoragePage.tsx` | 新增：检测 / 清理状态机、确认框、提示 |
| 已有：`PageHeader`、`Button`、`IconButton`、`ConfirmDialog`、`Toast`（`ToastProvider`）、`Alert` | `src/components/admin/PageHeader.tsx`、`src/components/ui/*` | 复用，不改 |
| `formatBytes` | `src/lib/format/bytes.ts` | 新增（shared-field-formats"文件体积"） |
| 存储接口客户端 | `src/lib/admin/storage-client.ts` | 新增（沿用 `src/lib/api/http.ts` 的请求与错误约定） |

组件树：

```
storage.astro
├── AdminHeader(current="storage")
└── StoragePage
    ├── PageHeader（标题"存储" + 重新检测）
    ├── 说明行（检测时间）
    ├── section 统计区：StatCard ×2 + StatCard(highlight) | Alert/Error（失败）
    ├── 保护期提示
    ├── 操作区：Button(danger) + 良好状态文案
    └── ConfirmDialog(danger)；Toast 经 ToastProvider
```

全部是本地组件，无外部 SDK。前置确认项：无。

## 5. 跨 Feature 影响

| 已有 Feature | 影响维度 | 描述 | 需要的动作 |
|-------------|---------|------|-----------|
| F-001 | 共享实体（`images`、R2） | F-006 删除 F-001 上传的文件；`images` 行可能失去视频 | media 领域不变量 1 改写；domain-model 增加清理章节 |
| F-001 | 生命周期 | 图片新增"被清理"终态；视频新增"被单独移除"状态 | 引用规则与保护期写进 media domain-model |
| F-001 | 数据依赖（只读） | 读 `posts` 四列 | `post` 提供 `ImageReferenceQuery`，写进 shared-domains |
| F-001 | UI | `AdminHeader` 增加导航；文章列表页传 `current` | 本 Feature 任务内完成 |
| F-001 / F-002 | 降级显示 | 视频被清理后又加 `#live`：`LiveBadge` 在 `error`、`play()` 失败或 `canPlayType` 为空时隐藏（components.md）。视频 404 时，首次尝试播放前 `LIVE` 仍显示，尝试后隐藏、只剩静态图 | 不改组件；US-02 AC6 / BH-11 / TC-US02-08 按此行为调整（"播放失败后只显示静态图"） |
| F-002 | 读者页 | 读者页使用 `pub_body` / `pub_cover`，已在判定范围内；构建产物引用的图片不会被删 | 无 |
| F-005 | 路由名 | 本 Feature 用 `/admin/storage`、`/api/admin/storage/*`，`media` 路由名留给书影音。⚠️ F-005 Backlog 计划"新增 media Domain"，与现有 `media`（图片）领域重名 | F-005 design-arch 时改名（如 `media-library` / `douban`），本 Feature 不处理 |
| F-001 US-06 | 已知风险 | 401 本地暂存超过 24 小时才恢复时，其中新上传的图片可能已被清理 | 接受（feature-scope 已记录） |

## 6. 外部依赖与 TODO

无外部团队依赖。Cloudflare 能力：R2 `delete(string[])`（每次 ≤ 1000 个 key）、D1 `batch`、SQLite `json_each`（D1 支持）。

## 7. 关键决策

| ADR | 决策 |
|-----|------|
| [ADR-009](adr/ADR-009-orphan-detection-in-d1.md) | 由 post 领域提供引用查询；D1 递归 CTE 抽取引用片段（逐图匹配实测 34s 已弃用）；带实况判定偏保守 |

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-16 | 1.0 | 初始版本 | miraclehifi |
