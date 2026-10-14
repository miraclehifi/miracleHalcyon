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

1. **配对**：同一批粘贴/拖入的文件中，图片与同 basename 的 `.mov` / `.mp4` 配成一对。JPEG 带 Motion Photo XMP 时，从文件末尾按 `Length` / `MicroVideoOffset` 定位视频起点（校验 `ftyp`），再按 MP4 顶层 box 走到 `mdat` 结束为止截断——OPPO 等厂商在主视频后追加副视频与私有数据，`Length` 覆盖到文件末尾（见"验证结果"）。
2. **HEIC/HEIF**：先尝试浏览器原生解码（Safari 17+ 的 `createImageBitmap`）；失败时按需加载 `heic-to`（libheif WASM）。转成 JPEG（质量 0.9）后再上传。
3. **视频**：用 `mediabunny` 把 MOV 转封装为 MP4。如果 `VideoEncoder` 支持 H.264（avc1），就转码为 H.264（片段约 3 秒，去掉音轨，**长边缩到 1920、码率 6 Mbps**）；不支持编码、或源编码无法解码（转换报 `undecodable_source_codec`）时只转封装，保留原编码。上传前检查结果 ≤ 10MB。
4. **元数据**：从解码后的位图计算主色；宽高同时上报，但服务端以文件头解析结果为准（缩到 32×32 后取平均色，避开过暗或过亮像素）。
5. **服务端**：校验魔数（图片 png/jpg/webp/gif，视频 `ftyp` mp4）与大小，写入 R2。配对上传在同一个 multipart 请求中完成：图片成功、视频失败时整体失败，不留半对。
6. **读者端**：播放失败（`error` 事件或 `canPlayType` 不支持）时只显示静态图，隐藏 `LIVE` 标记。

## 验证结果（spike-browser-media-processing，2026-10-14）

> 范围：作者暂不提供 iPhone 样本，HEIC 解码与 `heic-to` 未验证（留到 add-heic-upload 前）；构建产物检查移到 add-live-photo-pair-upload。样本为 OPPO（ColorOS）动态照片 `tests/fixtures/live/IMG20260516172228.jpg`。环境：Windows 11，Playwright 1.64，Chromium 156，`mediabunny` 1.61.4。

| 项 | 结果 |
|----|------|
| OPPO 动态照片结构 | Motion Photo v1 XMP（`Container:Directory`）+ `OpCamera:*` 扩展（`OLivePhotoVersion=2`、`VideoLength`）；主图后依次为 Ultra HDR 增益图、主视频、副视频（HEVC 1920×1440）、OPPO 私有尾部。`Item:Length`（18,339,214）覆盖到文件末尾，按 box 截出的主视频为 16,423,579 B，与 `OpCamera:VideoLength` 一致 |
| 主视频 | HEVC 3840×2880 + AAC，2.74s，16.4MB |
| H.264 编码能力 | 4K（3840×2880）在所有测试环境均不支持；1920×1440 及以下支持（High profile）→ 转码前必须缩放 |
| HEVC 解码能力 | Playwright 默认的 headless shell 不支持；完整 Chromium（`channel: "chromium"` 的新 headless / 有头）、Edge 支持（依赖系统硬件解码） |
| 转码（1920×1440、6 Mbps、去音轨） | 2,692,784 B，H.264，brand 通过 `sniffVideo`；首次处理含加载 ≈ 6.3s |
| 默认质量转码 | 不限码率时 1920×1440 约 115 Mbps，2.7s 产出 39MB → 必须显式限码率（`bitrate` 在 1.61 标为 deprecated，正式实现可改用 `quality`，以产出体积为准） |
| 只转封装（不支持 H.264） | 16,389,677 B（HEVC，去音轨），brand 合法，但 > 10MB → 按 SC-LIVE-06 退回普通图片 |
| 能编码不能解码 | headless shell 下 `Conversion` 无效（`undecodable_source_codec`）→ 正式实现需退回只转封装 |
| `mediabunny` 体积 | 最小化 691KB，gzip 177KB；dev 下动态 import ≈ 100ms |

对测试的影响：US-11 涉及 HEVC 转码的 E2E 需要 `channel: "chromium"`（spike 配置已改）。

## 后果
- 正面：不需要服务端媒体处理，Workers 可以承受；大多数现代浏览器上传后读者都能播放。
- 负面：首次处理 HEIC 或视频时，后台要按需下载 WASM 或库（数 MB）；在不支持 H.264 编码的浏览器上上传的 HEVC 视频，部分读者无法播放（会退回静态图）。
