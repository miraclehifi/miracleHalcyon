# media 领域模型

**最后更新**: 2026-10-19
**状态**: self-checked
**来源**: [feature-architecture.md](../../../features/F-001-文章写作/architecture/feature-architecture.md) §2、§5.3 · [ADR-005](../../../features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) · [ADR-006](../../../features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · F-006 [feature-architecture](../../../features/F-006-媒体存储清理/architecture/feature-architecture.md) · [ADR-009](../../../features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)

---

## 1. 职责与边界

- 负责：上传校验（魔数、大小、配对）、生成自描述 key、写 R2、记录 `images`、公开读取 `/img/*`；未引用资源的检测与清理（F-006，§9）
- 外链照片：只读取登记的 Afilmory 站点的照片信息（§10），外链不进 R2、不记录、不清理
- 不负责：安卓动态照片识别与切视频、视频转封装 / 转码、主色计算——都在浏览器端完成（[media-upload 模块](../../../frontend/modules/media-upload/module-spec.md)）；Markdown 引用的生成与解析（编辑器 / `markdown` 模块）
- 与 `post` 的唯一关联：清理时经 `post` 提供的只读 `ImageReferenceQuery` 判定引用（不读 `posts` 表）；正文只存 URL 字符串；删除文章不删图片（US-09 约束），其图片在 24 小时保护期后由 F-006 按未引用清理

## 2. 聚合：Image

| 属性 | 类型 | 说明 |
|------|------|------|
| key | `ImageKey` | R2 对象 key，同时是聚合标识 |
| mime | `image/png` \| `image/jpeg` \| `image/webp` \| `image/gif` | 由魔数判定 |
| size | integer | 字节数 |
| width / height | integer | **服务端**从文件头解析（客户端上报值只做格式校验，不采用） |
| rgb | `Rgb` | 客户端计算的主色；未提供时为 `808080` |
| video | `LiveVideo?` | 实况视频：`{ key, size }` |
| originalName | string | 客户端文件名（去路径、截断到 128 字符），只做记录 |
| createdAt | 时间戳 | — |

**不变量**
1. 上传时图片与视频要么都写入 R2 和 `images`，要么都不写（不留半对，US-11 AC7）；`images.video_key` 非空时 R2 中必有该视频。清理可以只移除视频（先删 R2 对象，再把 `video_key` / `video_size` 置空），这是图片失去视频的唯一途径
2. key 一经写入不再修改、不覆盖（随机 id 冲突时重新生成）
3. 不接受 SVG 及任何魔数不在白名单内的文件，不论扩展名和 `Content-Type`
4. `width`、`height` 是文件真实尺寸
5. 本领域只管 R2 `img/` 前缀与 `images` 表；`covers/` 前缀归 `shelf`（F-005 书影音封面），上传、读取、清理都不处理它（见 [shared-domains](../../../shared-domains.md)）

## 3. 值对象

| 值对象 | 规则 |
|--------|------|
| `ImageId` | 10 位，字符集 `a-z2-7`（base32 小写），`crypto.getRandomValues` 生成 |
| `ImageKey` | `img/{yyyy}/{mm}/{ImageId}_{w}x{h}_{rgb}.{ext}`；`yyyy/mm` 取上传时 UTC 日期；`ext`：`png`/`jpg`/`webp`/`gif` |
| `LiveVideoKey` | 图片 key 去掉扩展名 + `.live.mp4` |
| `Rgb` | `^[0-9a-f]{6}$` |
| `Dimensions` | 1–20000 的整数 |

URL = `/` + key（如 `/img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg`）。

## 4. 文件校验（纯函数）

### 4.1 图片魔数与尺寸解析

| 类型 | 魔数 | 尺寸来源 |
|------|------|---------|
| PNG | `89 50 4E 47 0D 0A 1A 0A` | IHDR 宽高（偏移 16、20，大端 32 位） |
| JPEG | `FF D8 FF` | 顺序扫描段，取首个 SOF0–SOF15（排除 DHT `C4`、JPG `C8`、DAC `CC`）的高、宽 |
| WebP | `RIFF????WEBP` | `VP8 ` / `VP8L` / `VP8X` 三种块分别解析 |
| GIF | `GIF87a` / `GIF89a` | 逻辑屏幕宽高（偏移 6、8，小端 16 位） |

解析失败（截断、找不到 SOF 等）→ `UNSUPPORTED_TYPE`。

### 4.2 视频

- 偏移 4–8 为 `ftyp`，major brand 属于白名单：`isom`、`iso2`、`iso4`、`iso5`、`iso6`、`mp41`、`mp42`、`avc1`、`M4V `
- 拒绝 `qt  `（未转封装的 MOV）、`heic`/`heix`/`mif1`/`msf1`（HEIF 图片）及其他 brand → `UNSUPPORTED_TYPE`
- 不解析编码（HEVC 与 H.264 都接受，ADR-006 第 3 点）

### 4.3 大小与组合

| 规则 | 错误 |
|------|------|
| 图片 0 字节 | `VALIDATION_FAILED` |
| 图片 > 50 MiB（52,428,800 B） | `FILE_TOO_LARGE`（413） |
| 视频 > 10 MiB（10,485,760 B） | `VIDEO_TOO_LARGE`（413） |
| 只有 `video` 没有 `file` | `VALIDATION_FAILED` |
| `file` 是视频 | `UNSUPPORTED_TYPE` |
| 请求体 > 64 MiB | `PAYLOAD_TOO_LARGE`（413，读取前按 `Content-Length` 拒绝） |

## 5. 领域服务

> 已实现（Sprint 2，implement-image-upload-api）：`src/domains/media/`（`validate.ts`、`key.ts`、`repo.ts`、`service.ts`）。实况视频已实现（Sprint 3，implement-live-photo-upload-api）：`sniffVideo`、`checkVideoSize`、`videoKeyFor`；写入失败按已写对象逐个删除后报 `UPLOAD_FAILED`（删除失败不掩盖原错误）。

```ts
interface MediaService {
  upload(input: { file: Blob & { name: string }; video?: Blob; rgb?: string; width?: string; height?: string; now: Date }):
    Promise<UploadResult>;
  read(key: string, range?: string): Promise<R2ObjectBody | R2Object | null>;
}
type UploadResult = { url: string; width: number; height: number; rgb: string; live: boolean; videoUrl: string | null };

function sniffImage(head: Uint8Array): { mime: ImageMime; width: number; height: number } | null;
function sniffVideo(head: Uint8Array): boolean;
function buildImageKey(p: { id: string; w: number; h: number; rgb: string; ext: string; now: Date }): string;
```

**upload 流程**
1. 校验字段（§4.3、`rgb` 格式、`width`/`height` 若提供须为 1–20000 的整数）
2. `sniffImage(前 64KB)`；JPEG 在前缀中找不到 SOF 时依次扩大到 1MB、8MB、整个文件（SOF 可能在大段 EXIF / 厂商私有段之后，如 OPPO 动态照片在第 450KB 处；扫描只沿段头跳转）；有 `video` 则 `sniffVideo(前 64KB)`。只读前缀切片，不把整个文件复制成字节数组（Workers 每个 isolate 128MB，表单解析已占一份）
3. 生成 key（R2 `head` 命中则重新生成，最多 3 次）
4. `put` 图片（直接传表单里的 `Blob`；`httpMetadata.contentType` = 判定的 mime，`cacheControl` = `public, max-age=31536000, immutable`）
5. 有视频则 `put` 视频（`contentType: video/mp4`）；失败 → `delete` 图片 → 500 `UPLOAD_FAILED`
6. 插入 `images`；失败 → `delete` 图片与视频 → 500 `UPLOAD_FAILED`

## 6. 仓储接口

```ts
interface MediaStore {           // R2
  exists(key: string): Promise<boolean>;
  put(key: string, body: Blob, contentType: string): Promise<void>;
  get(key: string, range?: R2Range): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}
interface MediaCleanupStore {    // R2，F-006 存储清理用（R2MediaStore 同时实现）
  deleteMany(keys: string[]): Promise<void>;   // 按 1000 个一批调用 R2 delete(string[])；不存在的 key 不报错
}
interface ImageRepo {            // D1
  insert(img: ImageRow): Promise<void>;
}
interface ImageCleanupRepo {     // D1，F-006 存储清理用（D1ImageRepo 同时实现；与上传接口分开，上传侧不依赖清理能力）
  listAll(): Promise<ImageRecord[]>;                 // 只取 key、size、video_key、video_size、created_at
  removeOrphans(imageKeys: string[], videoOnlyKeys: string[]): Promise<void>;
  // F-006：一个 batch 内 DELETE … WHERE key IN (SELECT value FROM json_each(?))
  //        + UPDATE … SET video_key = NULL, video_size = NULL WHERE key IN (SELECT value FROM json_each(?))
}
type ImageRecord = { key: string; size: number; videoKey: string | null; videoSize: number | null; createdAt: string };
```

## 7. 服务的需求

| US | 使用的能力 |
|----|-----------|
| US-05 image-upload | `upload`（单图）、魔数校验、大小限制、随机 key、`/img/*` 读取 |
| US-11 live-photo-upload | `upload`（图 + 视频）、视频校验、不留半对、`.live.mp4` 读取（Range） |
| US-12 image-layout-marks | key 中的宽高与主色（由 `markdown` 模块解析） |
| F-002 | `/img/*` 读取 |
| F-006 US-01 detect-orphans | `StorageService.detectOrphans`、`ImageCleanupRepo.listAll`、`ImageReferenceQuery`（post） |
| F-006 US-02 cleanup-orphans | `StorageService.cleanupOrphans`、`MediaCleanupStore.deleteMany`、`ImageCleanupRepo.removeOrphans` |

## 8. 单元测试规格

| UT-ID | 对象 | 用例 | 预期 |
|-------|------|------|------|
| MEDIA-UT-01 | `sniffImage` | 1×1 PNG；4032×3024 JPEG（含 EXIF APP1 在 SOF 前）；SOF 前有 8 个约 64KB APP 段的 JPEG（经上传接口）；渐进式 JPEG（SOF2）；WebP 三种块；GIF89a；SVG 文本；HTML 改名；截断 JPEG；0 字节 | 前五个返回正确 mime 与尺寸；其余 null |
| MEDIA-UT-02 | `sniffVideo` | `isom` mp4；`mp42`；`qt  ` MOV；HEIC；HTML | 前两个 true，其余 false |
| MEDIA-UT-03 | `buildImageKey` | 固定 id 与日期（UTC 月末 23:59 跨月） | `img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg`；UTC 月份正确 |
| MEDIA-UT-04 | 字段校验 | `rgb` = `ZZZZZZ`、`../../x`；`width` = `0`、`-1`、`100000`、`12.5` | 全部 `VALIDATION_FAILED` |
| MEDIA-UT-05 | 大小边界 | 图片 52,428,800 / 52,428,801 B；视频 10,485,760 / 10,485,761 B | 接受 / `FILE_TOO_LARGE`；接受 / `VIDEO_TOO_LARGE` |
| MEDIA-UT-06 | `upload`（Workers 集成 + R2 桩） | 视频 `put` 抛错；D1 插入抛错 | 500 `UPLOAD_FAILED`；R2 与 D1 均无残留 |
| MEDIA-UT-07 | `upload` 采用服务端尺寸 | 客户端报 4032×3024，实际 1×1 | key 中为 `1x1` |
| MEDIA-UT-08 | `/img/*` 读取 | 存在；不存在；`..` 路径；视频 `Range: bytes=0-99` | 200 + 长缓存头；404；404；206 + `Content-Range` |
| MEDIA-UT-09 | `classifyOrphans` / `summarize`（纯函数） | 决策表：referenced {是, 否} × 有视频 {是, 否} × liveReferenced {是, 否} × createdAt {now − 24h + 1ms, now − 24h − 1ms} | 未引用图片 / 未引用视频 / 保护期 / 无动作分类正确；三项体积与 `protectedCount` 正确（F-006 TC-US01-04、05、06） |
| MEDIA-UT-10 | `StorageService.cleanupOrphans`（Workers 集成 + D1 + R2） | F-006 TC-US02-01、02、03、05、07、09 | R2 先删、D1 后改；失败重跑幂等；R2 每批 ≤ 1000；无候选不写 |

## 9. 存储清理（F-006）

> 来源：F-006 [US-01](../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-01-detect-orphans/story.md)、[US-02](../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-02-cleanup-orphans/story.md) · [ADR-009](../../../features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)。实现位置：`src/domains/media/storage.ts`。已实现：`detectOrphans`、`classifyOrphans`、`summarize`、`ImageCleanupRepo.listAll`（Sprint 7 任务 1）、`cleanupOrphans`、`removeOrphans`、`MediaCleanupStore.deleteMany`（任务 2）；`GET /api/admin/storage/orphans`、`POST /api/admin/storage/cleanup`

### 9.1 概念

| 概念 | 定义 |
|------|------|
| 被引用 | `post.ImageReferenceQuery` 判定该 key 的主干（去扩展名、保留点）出现在任一文章的 `body`、`cover`、`pub_body`、`pub_cover` 中 |
| 带实况引用 | 有视频的图片在 `body` / `pub_body` 中有一处引用的 URL 片段含 `live`（不区分大小写），或直接出现视频地址（比 `parseMarks` 宽，ADR-009） |
| 保护期 | `createdAt > now − 24h`（`PROTECTION_MS = 86_400_000`） |
| 未引用图片 | 保护期外、未被引用；清理时连同其视频 |
| 未引用视频 | 保护期外、被引用、有视频、未被带实况引用；清理时只移除视频 |

### 9.2 服务

```ts
interface StorageService {
  detectOrphans(now: Date): Promise<OrphanSummary>;
  cleanupOrphans(now: Date): Promise<CleanupResult>;
}
type OrphanSummary = { orphanImageCount: number; orphanImageBytes: number; orphanVideoCount: number; orphanVideoBytes: number; totalOrphanBytes: number; protectedCount: number };
type CleanupResult = { removedImages: number; removedVideos: number; freedBytes: number };

// 纯函数，便于单测
function classifyOrphans(rows: ImageRecord[], refs: Map<string, ImageReference>, now: Date):
  { images: ImageRecord[]; videos: ImageRecord[]; protectedCount: number };
function summarize(c: { images: ImageRecord[]; videos: ImageRecord[]; protectedCount: number }): OrphanSummary;
```

依赖：`ImageCleanupRepo`、`MediaCleanupStore`、`ImageReferenceQuery`，构造时注入（`createStorageService(deps)`）。

**detectOrphans**：`listAll` → `ImageReferenceQuery.classify(rows)` → `classifyOrphans` → `summarize`。
- `orphanImageBytes` = Σ 未引用图片的 `size`
- `orphanVideoBytes` = Σ 未引用视频的 `videoSize`
- `totalOrphanBytes` = `orphanImageBytes` + Σ 未引用图片自带视频的 `videoSize` + `orphanVideoBytes`
- `protectedCount` = 保护期内、否则会计入两类之一的行数

**cleanupOrphans**：
1. 与 `detectOrphans` 相同的三步，重新得到 `images`、`videos`（不接受前端传入的 key）
2. 两类都为空 → 直接返回 0，不调用 R2 / D1 写
3. `MediaCleanupStore.deleteMany`：`images` 的图片 key 与非空视频 key，加上 `videos` 的视频 key
4. `ImageCleanupRepo.removeOrphans(images 的 key, videos 的 key)`
5. 返回 `removedImages = images.length`、`removedVideos = videos.length`（未引用图片自带的视频不单独计数）、`freedBytes = totalOrphanBytes`

失败：任一步抛错 → `StorageCleanupError` → API 500 `CLEANUP_FAILED`。先删 R2 后改 D1：失败后 D1 行仍在，下次检测仍可见；重跑时 R2 删除已不存在的 key 不报错，因此可重入。

---

## 10. Afilmory 照片信息（F-001 US-13）

> [ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)。只读外部，不建表、不写 R2。已实现（Sprint 8 任务 1）：`src/domains/media/afilmory.ts`（纯函数 + 可注入 fetch）+ `src/pages/api/admin/afilmory/photos/[id].ts`；夹具 `tests/fixtures/afilmory/photo-page.html` 取自真实页面（4 张）。2026-10-21 对真实站点核对：18369、子目录 23473、18382 解析正确。

| 函数 | 说明 |
|------|------|
| `parseAfilmoryManifest(html): AfilmoryPhoto[]` | 取 `<script id="manifest">window.__MANIFEST__ = {…};</script>` 中的 JSON（找不到 / 解析失败 / 无 `data` 数组 → `AfilmoryUpstreamError`）；每项保留 `id`、`originalUrl`、`thumbnailUrl`、`width`、`height`、`thumbHash`、`video` |
| `toPhotoInfo(photo): AfilmoryPhotoInfo` | 校验宽高 1–20000、地址为 https（否则 `AfilmoryUpstreamError`）；`encodeURI` 编码地址（已编码的不重复编码）；`rgb` = `thumbHashToAverageRGBA`（`thumbhash` 包）的结果转 6 位 hex，失败为 `808080`；`video` 仅 motion-photo 且正整数 |
| `fetchAfilmoryPhoto(id, { site, fetch, timeoutMs })` | 校验 id（`AfilmoryValidationError`）→ `fetch(`${site}/photos/${id}`, { redirect: "manual", signal })` → 非 200 / 网络错误 / 超时 → `AfilmoryUpstreamError` → 解析清单 → 找不到 id → `AfilmoryNotFoundError` |

| UT-ID | 用例 | 预期 |
|-------|------|------|
| MEDIA-UT-11 | `parseAfilmoryManifest`：夹具页（10 张）；无 manifest 脚本；JSON 截断；`data` 不是数组 | 10 项且字段正确；其余抛 `AfilmoryUpstreamError` |
| MEDIA-UT-12 | `toPhotoInfo`：18369（有 video）、18382（无）、子目录中文路径、`video.type` 不是 motion-photo、宽为 0、`http:` 地址、thumbHash 非法 | video 有 / 无；地址 `%E6%89%8B%E5%8A%9E/…`；无 video；后两项抛错；rgb `808080` |
| MEDIA-UT-13 | `fetchAfilmoryPhoto`（fake fetch）：非法 id；上游 500 / 302 / 抛错 / 超时；id 不在清单 | 不调用 fetch；502 类错误；`NotFound`；请求地址与 `redirect: "manual"` 正确 |
| MEDIA-UT-14 | 路由（Workers 集成，替换 `fetch`） | US-13 TC-US13-13 全部行 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-14 | 1.1 | 图片上限 5 MiB → 50 MiB，请求体上限 16 MiB → 64 MiB（[raise-image-size-limit](../../../../backlog/raise-image-size-limit.md)） | miraclehifi |
| 2026-10-14 | 1.2 | `sniffImage` 改为扫描整个图片字节（[sniff-jpeg-large-metadata](../../../../backlog/sniff-jpeg-large-metadata.md)） | miraclehifi |
| 2026-10-16 | 1.4 | F-006：新增 §9 存储清理（`StorageService`）、仓储方法 `listAll` / `removeOrphans` / `deleteMany`；不变量 1 允许清理只移除视频（[ADR-009](../../../features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)） | miraclehifi |
| 2026-10-15 | 1.3 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)）：只改职责描述，接口与数据结构不变 | miraclehifi |
| 2026-10-19 | 1.5 | F-001 US-13：新增 §10 Afilmory 照片信息（纯函数 + 只读接口，无表）、MEDIA-UT-11–14（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | miraclehifi |
