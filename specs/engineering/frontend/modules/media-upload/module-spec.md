# media-upload 模块（浏览器端预处理与上传）

**最后更新**: 2026-10-16
**状态**: self-checked
**来源**: [ADR-006](../../../features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [media API 契约](../../../backend/domains/media/api-contract.md)
**位置**: `src/lib/upload/`

---

## 1. 流程

```
文件列表（粘贴 / 拖入 / 插入图片多选）
  → validateFile（US-05：png、jpg、webp、gif，≤ 50MB，按原始大小），不通过 → Toast/Error，不生成任务
  → 每个文件一个 UploadTask（保持顺序）：插入占位 ![处理中…]()，创建缩略图 URL，state = waiting
  → 队列（并发 2）逐个 runTask：
      compressing      toItem：JPEG 识别 Motion Photo → { still, video }（无论实况开关，静态图都去掉视频字节）
                       compressImage(still 或 file) → 压缩后的 Blob；measureImage → 宽高、主色（基于压缩结果）
      processing-live  仅 liveEnabled && 识别为动态照片：processVideo（mediabunny，可被 stillOnly 中止）→ mp4 / 丢弃
      uploading        占位改为 ![上传中…]() → uploadImage（XHR，upload.onprogress）→ 替换为 ![alt](url[#live])，卡片淡出
      失败（任一步）   占位改为 ![上传失败]()，state = error（带原因）；retry → 回到 compressing；remove → 删占位
```

Afilmory 照片（US-13，[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)）：`insertAfilmoryPhotos(ids, at?)` 每个 id 一个任务（来源 `{ kind: 'afilmory', id }`，`name` = `Afilmory {id}`，无缩略图），同样插入 `![处理中…]()`；`fetching`（进度按时间趋近）→ `fetchAfilmoryPhoto(id)`（`src/lib/afilmory/client.ts`，`GET /api/admin/afilmory/photos/{id}`，错误文案取接口 `error.message`，401 同上传）→ `afilmoryMarkdown(info, { storage, live: task.liveEnabled })` → 替换占位，`warning` 经 `onWarning`。不进上传并发队列（只是一次小请求），重试重新请求，移除同上。已实现（Sprint 8 任务 4）：`src/lib/afilmory/`（`paste.ts`、`markdown.ts`、`client.ts`），`use-image-uploads.ts` 任务带 `name` 与可选 `file` / `afilmoryId`，插入公共部分为 `start`。

占位的插入位置在批次开始时一次确定，之后按占位槽位（editor module-spec §1）替换，乱序完成也保持顺序（US-05 BH-04）。

## 2. 接口

```ts
type Stage = 'waiting' | 'compressing' | 'processing-live' | 'fetching' | 'uploading' | 'error';   // fetching：Afilmory 照片
interface UploadTask {
  id: string; file: File; name: string;          // name：alt 用（去扩展名、转义）
  thumbUrl: string;                               // URL.createObjectURL(file)，完成 / 移除 / 卸载时回收
  stage: Stage; progress: number;                 // 0–100，只增不减（重试时归零）
  error?: string;                                 // 失败原因文案
  live: boolean;                                  // 本任务是否保留视频：创建时取 liveEnabled，stillOnly 后为 false
}

type Item =
  | { kind: 'image'; file: File }
  | { kind: 'live'; name: string; still: Blob; video: Blob };

function planCompression(info: { format: 'jpeg' | 'webp' | 'png' | 'gif'; size: number; width: number; height: number }):
  { action: 'keep' } | { action: 'encode'; width: number; height: number; output: 'lossy' | 'png' };
function fitLongEdge(w: number, h: number, max: number): { width: number; height: number };
function compressImage(blob: Blob, name: string): Promise<{ blob: Blob; name: string }>;   // 任何失败都返回原 Blob
function stageProgress(stage: Stage, ratio: number, opts: { live: boolean }): number;
function uploadImage(form: FormData, opts: { onProgress(loaded: number, total: number): void; signal?: AbortSignal }):
  Promise<UploadResponse>;                                                                   // reject UploadError { reason, message }
function readLivePref(): boolean; function writeLivePref(v: boolean): void;
function hasLiveVideo(imageUrl: string): Promise<boolean>;                                   // 会话内按 URL 缓存

// 已有
function extractMotionPhoto(bytes: ArrayBuffer): { still: Blob; video: Blob } | null;
function processVideo(file: Blob, opts?: { signal?: AbortSignal }): Promise<{ blob: Blob; warning?: 'HEVC_KEPT' } | { dropVideo: true }>;
function dominantColor(bitmap: ImageBitmap): string;

// useImageUploads 对外：tasks、upload(files, cursor)、retry(id)、remove(id)、stillOnly(id)
```

## 3. 规则

| 项 | 规则 |
|----|------|
| 可接受的输入 | 沿用 US-05：png、jpg、jpeg、webp、gif；其余（含 heic、heif、mov、mp4）→ "仅支持 png、jpg、webp、gif"。实况照片只来自安卓动态照片（一个 JPEG），不做同名"图片 + 视频"配对 |
| 前端大小检查 | 原始文件 > 50MB → "图片不能超过 50MB"（压缩前检查）；视频（处理后）> 10MB → 丢弃视频，按普通图片上传并给 `Toast/Warning`（US-11 AC5） |
| 格式识别 | 按魔数（`FF D8 FF` / `RIFF….WEBP` / `89 50 4E 47` / `GIF8`），MIME 只作参考；GIF 一律不压缩（保留动画） |
| 压缩计划 `planCompression` | 长边 ≤ 2560 且 size < 512,000 B → keep；JPEG / WebP → encode，`lossy`，尺寸 `fitLongEdge(…, 2560)`（不放大，短边四舍五入）；PNG → 长边 > 2560 时 encode 为 `png`，否则 keep；GIF → keep |
| 编码 `compressImage` | `createImageBitmap(blob, { imageOrientation: 'from-image' })` 解码（EXIF 方向转正）→ 有 `OffscreenCanvas` 用它（`convertToBlob`），否则 `<canvas>`（`toBlob`）；`lossy` 先请求 `image/webp` 0.82，返回 Blob 的 `type` 不是 `image/webp` 时改请求 `image/jpeg` 0.85；`png` 请求 `image/png`。canvas 重新编码天然不带 EXIF / GPS。结果 `size >= 原 size` → 用原 Blob。解码 / 分配 / 编码抛错 → 用原 Blob，不报错。文件名扩展名随实际格式（`photo.jpg` → `photo.webp`），alt 不变。用完 `bitmap.close()`，canvas 宽高置 0 释放内存 |
| 主色与宽高 | 基于压缩后的 Blob 计算（`measureImage`）；keep 时等同原图 |
| 实况开关 | `liveEnabled` 由 `readLivePref()` 初始化（键 `mh:live-photo`，值 `'1'` / `'0'`；读写包 try/catch，异常 → `false`）；任务创建时快照到 `task.live`，之后切换开关不影响已有任务。`live = false` 时：不加载 `mediabunny`、不调用 `processVideo`，请求不含 `video`，引用不带 `#live` |
| 仅转为静态图 | `stillOnly(id)`：只在 `processing-live` 阶段可用；`AbortController.abort()` 中止 `processVideo`（mediabunny 转换支持取消；不支持时忽略其结果），`task.live = false`，直接进入 `uploading` |
| 进度 | `stageProgress`：compressing 0–15，processing-live 15–40，uploading `live ? 40 : 15` → 100。压缩与视频阶段没有真实进度：按时间趋近（每 100ms 走剩余区间的 8%，最多到区间终点前 1），阶段结束跳到区间终点；上传阶段用 `loaded / total` 映射。`progress = max(旧值, 新值)` |
| 上传 `uploadImage` | `XMLHttpRequest`（fetch 拿不到上传进度）：`POST /api/admin/images`，`withCredentials` 同源默认，`timeout` 按大小计算（60 秒等待响应 + 按 256 KiB/s 计的传输时间，`uploadTimeoutMs`）；`upload.onprogress` → `onProgress`；`onerror` → `{ reason: 'network', message: '网络中断' }`；`ontimeout` → `{ reason: 'timeout', message: '上传超时，请重试' }`；4xx / 5xx → 解析响应 `{ error }`，有则用服务端文案（如"不支持的图片格式"），没有 → "上传失败，请重试"；401 → 占位先改为"上传失败"，再沿用会话过期处理（`onUnauthenticated` → 写文章页 `onSessionExpired`：暂存后跳登录）。`signal` 中止 → `abort()`，不再回调 |
| 失败 | 任一步失败 → 占位改为 `![上传失败]()`，`stage = 'error'`、`error = 原因`，不弹 Toast；实况照片的图片与视频不留半对（服务端同一请求，已有）。其他任务不受影响 |
| 重试 / 移除 | `retry(id)`：`progress = 0`，占位改回 `![处理中…]()`，从 compressing 重跑（重新排队，受并发 2 约束），复用原 `File` 与缩略图 URL；`remove(id)`：删占位（`applyEdit`，可撤销）、回收缩略图 URL、移出任务列表 |
| 已中断占位 | 源码中的占位没有对应任务（页面刷新后、撤销"移除"后）→ 预览显示 `UploadCard state="interrupted"`，只有"移除"：按该占位的槽位删除；不可重试 |
| 懒加载 | `mediabunny` 只在 `task.live && 识别为动态照片` 时加载 |
| 实况视频检查 `hasLiveVideo` | 只对站内图片 key（`parseImageKey` 非 null）：`fetch(把扩展名换成 .live.mp4, { headers: { Range: 'bytes=0-0' }, cache: 'no-store' })` → 200 / 206 为 true，其余（含 404、网络错误）为 false；结果按 URL 存在模块级 `Map`（本次页面会话有效），并发请求复用同一个 Promise。复用现有 `GET /img/*` 的 Range 支持，服务端不改 |

> 已实现（Sprint 2，静态图）：`src/lib/upload/upload-client.ts`、`upload-queue.ts`（并发 2）、`validate-file.ts`、`use-image-uploads.ts`。Sprint 3：主色与宽高 `dominant-color.ts`（`measureImage` 用 `createImageBitmap` 解码，解码失败或不支持时返回 null、按缺省主色上传；纯函数 `dominantColorFromPixels` 便于测试）；占位阶段（先插"处理中…"，算完主色经 `markUploading` 改为"上传中…"，再替换 / 移除）。视频处理 `process-video.ts`（`planVideo` 决定原样 / 转码 / 只转封装，mediabunny 由参数注入便于测试）、单项流程 `upload-item.ts`（实况项同一请求上传、警示在上传成功后发出）；`use-image-uploads.ts` 每项经 `toItem`（默认 `fileToItem`：JPEG 用 `extract-motion-photo.ts` 识别 `Item:Length` / `MicroVideoOffset`，命中展开为实况项）→ `uploadItem`。
> 已实现（Sprint 6，add-image-compression）：`src/lib/upload/compress-image.ts`（`sniffFormat`、`planCompression`、`fitLongEdge`、`renameForType`、`compressImage`；解码 / 编码经可注入的 `CompressEnv`，默认 `browserEnv`：有 `OffscreenCanvas` 用它，否则 `<canvas>`；JPEG 输出先铺白底）；`uploadItem` 的可选依赖 `compress` 在测量主色前调用，`useImageUploads` 默认传 `compressImage`。实测（Playwright，Windows）：Chromium 与 WebKit 都能导出 WebP；WebKit 没有 `OffscreenCanvas`，走 `<canvas>`。
> 已实现（Sprint 6，[media-upload-experience](../../../../backlog/media-upload-experience.md)）：`compress-image.ts`（压缩计划 / 编码 / 兜底）、`upload-client.ts` 改 XHR、`progress.ts`（`stageProgress`、`creep`）、`live-pref.ts`、`live-video-check.ts`（`hasLiveVideo`）；`use-image-uploads.ts` 改为占位槽位（绑定 `UploadTask` 或空槽位）+ `retry` / `remove` / `stillOnly`；`upload-item.ts` 增加 `{ live, signal }`（中止时与视频处理赛跑，立即按静态图继续）；`process-video.ts` 改为 `processVideo(video, { signal, load })`，中止时取消 mediabunny 转换；`dominant-color.ts` 采样画布分配失败时主色取缺省、宽高照常（TC-US05-34）。

## 4. 单元测试

见 [frontend-unit-tests.md](../../../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) §8（UT-85 – UT-94）、§14（UT-142、UT-144 – UT-147、UT-152；UT-141、UT-143 已删除）、§16（UT-153 – UT-165）、§17（UT-175）。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-15 | 1.1 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)）：删除 `pairFiles`、`decodeHeic` 与 HEIC 输出规则，`Item` 去掉 `motion` / `error` | miraclehifi |
| 2026-10-16 | 1.2 | 上传体验升级（[media-upload-experience](../../../../backlog/media-upload-experience.md)）：流程改为 `UploadTask` 状态机（等待 / 压缩 / 处理实况视频 / 上传 / 失败）；新增浏览器端压缩、进度映射、XHR 上传、实况开关、仅转为静态图、重试 / 移除 / 已中断、实况视频检查；失败不再移除占位与弹 Toast | miraclehifi |
| 2026-10-19 | 1.x | Afilmory 照片任务（`insertAfilmoryPhotos`、`fetching` 阶段）（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | miraclehifi |
