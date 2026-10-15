# media 领域模型

**最后更新**: 2026-10-13
**状态**: self-checked
**来源**: [feature-architecture.md](../../../features/F-001-文章写作/architecture/feature-architecture.md) §2、§5.3 · [ADR-005](../../../features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) · [ADR-006](../../../features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)

---

## 1. 职责与边界

- 负责：上传校验（魔数、大小、配对）、生成自描述 key、写 R2、记录 `images`、公开读取 `/img/*`
- 不负责：安卓动态照片识别与切视频、视频转封装 / 转码、主色计算——都在浏览器端完成（[media-upload 模块](../../../frontend/modules/media-upload/module-spec.md)）；Markdown 引用的生成与解析（编辑器 / `markdown` 模块）
- 与 `post` 无关联：正文只存 URL 字符串；删除文章不删图片（US-09 约束）

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
1. 图片与视频要么都存在于 R2 和 `images` 中，要么都不存在（不留半对，US-11 AC7）
2. key 一经写入不再修改、不覆盖（随机 id 冲突时重新生成）
3. 不接受 SVG 及任何魔数不在白名单内的文件，不论扩展名和 `Content-Type`
4. `width`、`height` 是文件真实尺寸

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
interface ImageRepo {            // D1
  insert(img: ImageRow): Promise<void>;
}
```

## 7. 服务的需求

| US | 使用的能力 |
|----|-----------|
| US-05 image-upload | `upload`（单图）、魔数校验、大小限制、随机 key、`/img/*` 读取 |
| US-11 live-photo-upload | `upload`（图 + 视频）、视频校验、不留半对、`.live.mp4` 读取（Range） |
| US-12 image-layout-marks | key 中的宽高与主色（由 `markdown` 模块解析） |
| F-002 | `/img/*` 读取 |

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

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-14 | 1.1 | 图片上限 5 MiB → 50 MiB，请求体上限 16 MiB → 64 MiB（[raise-image-size-limit](../../../../backlog/raise-image-size-limit.md)） | miraclehifi |
| 2026-10-14 | 1.2 | `sniffImage` 改为扫描整个图片字节（[sniff-jpeg-large-metadata](../../../../backlog/sniff-jpeg-large-metadata.md)） | miraclehifi |
| 2026-10-15 | 1.3 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)）：只改职责描述，接口与数据结构不变 | miraclehifi |
