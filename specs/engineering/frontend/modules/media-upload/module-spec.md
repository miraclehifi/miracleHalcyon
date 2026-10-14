# media-upload 模块（浏览器端预处理与上传）

**最后更新**: 2026-10-13
**状态**: self-checked
**来源**: [ADR-006](../../../features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [media API 契约](../../../backend/domains/media/api-contract.md)
**位置**: `src/lib/upload/`

---

## 1. 流程

```
文件列表（粘贴 / 拖入 / 插入图片多选）
  → pairFiles：按 basename（不区分大小写）配对，保持顺序
  → 逐项（并发 2）：
      插入占位 ![处理中…] ─┐
      ├─ 图片：HEIC/HEIF → decodeHeic → JPEG；其他 → 原文件
      ├─ 安卓：JPEG 带 Motion Photo XMP → extractMotionPhoto → { still, video }
      ├─ 视频：processVideo（mediabunny）→ mp4
      └─ 主色：dominantColor(位图)
      占位改为 ![上传中…] → POST /api/admin/images → 替换为 ![alt](url[#live])
```

占位的插入位置在批次开始时一次确定（按顺序依次排列），之后只按 token 替换，因此乱序完成也保持顺序（US-05 BH-04）。

## 2. 接口

```ts
type Item =
  | { kind: 'image'; file: File }
  | { kind: 'live'; photo: File; video: File }
  | { kind: 'motion'; file: File }               // 运行时检测后展开为 live
  | { kind: 'error'; file: File; code: 'VIDEO_WITHOUT_PHOTO' | 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' };

function pairFiles(files: File[]): Item[];
function extractMotionPhoto(bytes: ArrayBuffer): { still: Blob; video: Blob } | null;
function decodeHeic(file: File): Promise<ImageBitmap>;               // 原生 → heic-to（动态 import）→ 抛 HEIC_DECODE_FAILED
function processVideo(file: Blob): Promise<{ blob: Blob; warning?: 'HEVC_KEPT' } | { dropVideo: true }>;
function dominantColor(bitmap: ImageBitmap): string;                  // 32×32 采样，排除亮度 <8% 和 >92% 的像素
function uploadItem(item: Item, cb: Callbacks): Promise<UploadResult>;
```

## 3. 规则

| 项 | 规则 |
|----|------|
| 可接受的输入 | 扩展名 / MIME：png、jpg、jpeg、webp、gif、heic、heif、mov、mp4；其余 → "仅支持 png、jpg、webp、gif"（US-05） |
| 前端大小检查 | 静态图（转换后）> 50MB → "图片不能超过 50MB"；视频（处理后）> 10MB → 丢弃视频，按普通图片上传并给 `Toast/Warning`（US-11 AC5） |
| HEIC 输出 | JPEG 质量 0.9；转换后仍 > 50MB 时以 0.8、0.7 重试，仍超限则报错 |
| 视频处理 | `mediabunny` 动态 import；`VideoEncoder.isConfigSupported({ codec: 'avc1.640028', … })` 为真 → 转码 H.264、去音轨；否则只转封装，返回 `HEVC_KEPT` → `Toast/Warning`（US-11 AC8） |
| alt | 文件名去扩展名；`[`、`]` 转义；剪贴板无名图片 → `image` |
| 失败 | 任一步失败 → 移除占位 → `Toast/Error`（带文件名），不影响其他项 |
| 懒加载 | `heic-to`、`mediabunny` 只在遇到对应文件时加载；加载期间占位显示"处理中…" |

> 已实现（Sprint 2，静态图）：`src/lib/upload/upload-client.ts`、`upload-queue.ts`（并发 2）、`validate-file.ts`、`use-image-uploads.ts`；HEIC、实况照片、主色在 Sprint 3。

## 4. 单元测试

见 [frontend-unit-tests.md](../../../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) §8（UT-85 – UT-94）、§14（UT-141 – UT-147）。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
