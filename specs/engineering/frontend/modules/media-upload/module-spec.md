# media-upload 模块（浏览器端预处理与上传）

**最后更新**: 2026-10-15
**状态**: self-checked
**来源**: [ADR-006](../../../features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [media API 契约](../../../backend/domains/media/api-contract.md)
**位置**: `src/lib/upload/`

---

## 1. 流程

```
文件列表（粘贴 / 拖入 / 插入图片多选）
  → validateFile（US-05：png、jpg、webp、gif，≤ 50MB），每个文件一项，保持顺序
  → 逐项（并发 2）uploadItem：
      插入占位 ![处理中…] ─┐
      ├─ 安卓动态照片：JPEG 带 Motion Photo XMP → extractMotionPhoto → { still, video }，按 live 处理
      ├─ 视频：processVideo（mediabunny）→ mp4 / 丢弃
      └─ 主色：dominantColor(位图)，宽高随请求上报
      占位改为 ![上传中…] → POST /api/admin/images（live：file + video 同一请求）→ 替换为 ![alt](url[#live])
```

占位的插入位置在批次开始时一次确定（按顺序依次排列），之后只按 token 替换，因此乱序完成也保持顺序（US-05 BH-04）。

## 2. 接口

```ts
type Item =
  | { kind: 'image'; file: File }                                    // JPEG 在 uploadItem 中检测 Motion Photo，命中则展开为 live
  | { kind: 'live'; name: string; still: Blob; video: Blob };

function extractMotionPhoto(bytes: ArrayBuffer): { still: Blob; video: Blob } | null;
function processVideo(file: Blob): Promise<{ blob: Blob; warning?: 'HEVC_KEPT' } | { dropVideo: true }>;
function dominantColor(bitmap: ImageBitmap): string;                  // 32×32 采样，排除亮度 <8% 和 >92% 的像素
function uploadItem(item: Item, cb: Callbacks): Promise<UploadResult>;
```

## 3. 规则

| 项 | 规则 |
|----|------|
| 可接受的输入 | 沿用 US-05：png、jpg、jpeg、webp、gif；其余（含 heic、heif、mov、mp4）→ "仅支持 png、jpg、webp、gif"。实况照片只来自安卓动态照片（一个 JPEG），不做同名"图片 + 视频"配对 |
| 前端大小检查 | 静态图 > 50MB → "图片不能超过 50MB"；视频（处理后）> 10MB → 丢弃视频，按普通图片上传并给 `Toast/Warning`（US-11 AC5） |
| 视频处理 | `mediabunny` 动态 import；`VideoEncoder.isConfigSupported({ codec: 'avc1.640028', … })` 为真 → 转码 H.264、去音轨；否则（或源编码无法解码）只转封装，返回 `HEVC_KEPT` → `Toast/Warning`（US-11 AC8）；源已是无音轨的 H.264 mp4 → 原样使用 |
| alt | 文件名去扩展名；`[`、`]` 转义；剪贴板无名图片 → `image` |
| 失败 | 任一步失败 → 移除占位 → `Toast/Error`（带文件名），不影响其他项；实况照片的图片与视频不留半对 |
| 懒加载 | `mediabunny` 只在识别出动态照片时加载；加载与处理期间占位显示"处理中…" |

> 已实现（Sprint 2，静态图）：`src/lib/upload/upload-client.ts`、`upload-queue.ts`（并发 2）、`validate-file.ts`、`use-image-uploads.ts`。Sprint 3：主色与宽高 `dominant-color.ts`（`measureImage` 用 `createImageBitmap` 解码，解码失败或不支持时返回 null、按缺省主色上传；纯函数 `dominantColorFromPixels` 便于测试）；占位阶段（先插"处理中…"，算完主色经 `markUploading` 改为"上传中…"，再替换 / 移除）。视频处理 `process-video.ts`（`planVideo` 决定原样 / 转码 / 只转封装，mediabunny 由参数注入便于测试）、单项流程 `upload-item.ts`（实况项同一请求上传、警示在上传成功后发出）；`use-image-uploads.ts` 每项经 `toItem`（默认 `fileToItem`：JPEG 用 `extract-motion-photo.ts` 识别 `Item:Length` / `MicroVideoOffset`，命中展开为实况项）→ `uploadItem`。

## 4. 单元测试

见 [frontend-unit-tests.md](../../../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) §8（UT-85 – UT-94）、§14（UT-142、UT-144 – UT-147、UT-152；UT-141、UT-143 已删除）。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-15 | 1.1 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)）：删除 `pairFiles`、`decodeHeic` 与 HEIC 输出规则，`Item` 去掉 `motion` / `error` | miraclehifi |
