# ADR-006: 实况照片在浏览器端配对与转换

## 状态
Accepted（2026-10-12）

## 背景
iPhone 导出的实况照片是 HEIC + MOV（通常为 HEVC 编码），安卓的 Motion Photo 是把 mp4 嵌在 JPEG 里。Chrome、Firefox 不能显示 HEIC，很多环境也播放不了 HEVC。Workers 里不能运行 sharp、ffmpeg、exiftool 这类原生程序。

作者要求参考 Afilmory。调研结论：
- Afilmory 在构建时（Node）用同名文件配对；HEIC 用 heic-convert / libheif 转换。
- 浏览器端它用 WebCodecs，失败时退回 `heic-to`。
- 它的 MOV "转封装"只是改了 Blob 类型，不是真正的转封装，也没有转码。
- Motion Photo 通过解析 XMP（`MotionPhoto` / `MicroVideoOffset`）切出视频。

## 决策
借鉴 Afilmory 的识别逻辑，但把转换放在**浏览器上传前**完成；Worker 只做校验和存储。

1. **配对**：同一批粘贴/拖入的文件中，图片与同 basename 的 `.mov` / `.mp4` 配成一对。JPEG 带 Motion Photo XMP 时，从文件末尾按 `Length` / `MicroVideoOffset` 切出 mp4（校验 `ftyp`）。
2. **HEIC/HEIF**：先尝试浏览器原生解码（Safari 17+ 的 `createImageBitmap`）；失败时按需加载 `heic-to`（libheif WASM）。转成 JPEG（质量 0.9）后再上传。
3. **视频**：用 `mediabunny` 把 MOV 转封装为 MP4。如果 `VideoEncoder` 支持 H.264（avc1），就转码为 H.264（片段约 3 秒，去掉音轨）；否则保留原编码。上传前检查结果 ≤ 10MB。
4. **元数据**：从解码后的位图计算主色；宽高同时上报，但服务端以文件头解析结果为准（缩到 32×32 后取平均色，避开过暗或过亮像素）。
5. **服务端**：校验魔数（图片 png/jpg/webp/gif，视频 `ftyp` mp4）与大小，写入 R2。配对上传在同一个 multipart 请求中完成：图片成功、视频失败时整体失败，不留半对。
6. **读者端**：播放失败（`error` 事件或 `canPlayType` 不支持）时只显示静态图，隐藏 `LIVE` 标记。

## 后果
- 正面：不需要服务端媒体处理，Workers 可以承受；大多数现代浏览器上传后读者都能播放。
- 负面：首次处理 HEIC 或视频时，后台要按需下载 WASM 或库（数 MB）；在不支持 H.264 编码的浏览器上上传的 HEVC 视频，部分读者无法播放（会退回静态图）。
