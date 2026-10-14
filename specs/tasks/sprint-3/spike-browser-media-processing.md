# spike-browser-media-processing: 浏览器端媒体处理验证（spike）

**Sprint**: Sprint 3
**序号**: 1
**状态**: completed
**类别**: SETUP（spike）
**架构层级**: 表现层（spike 测试页，不进入正式代码）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 在接入正式上传链路前，验证 ADR-006 的三个未验证假设：① `heic-to`（libheif WASM）能在 Vite / Astro 构建下动态 import 并解码 HEIC，WebKit 原生 `createImageBitmap` 能解码 HEIC；② `mediabunny` 能把 iPhone HEVC MOV 转封装为 mp4，`VideoEncoder` 支持 avc1 时转码为 H.264 并去音轨，产出 ≤ 10MB 且 `ftyp` brand 在服务端白名单内；③ 两个库只进入后台 chunk，不进入读者页与线上 Worker 包
- **影响范围**: `src/pages/admin/_spike-media.astro`（spike 测试页，dev 注入 `/_spike/media`）、`tests/spike/`、`tests/fixtures/live/`（新建夹具目录）、`package.json`（新增 `mediabunny`，装最新主版本；`heic-to` 随 iPhone 部分延后）
- **本次实际验证**：假设 ② 用 OPPO 主视频验证，并新增"OPPO 动态照片切出视频"；假设 ①、③ 延后（见下方"范围调整"）
- **不变量**: 正式页面与已有测试不受影响
- **不在本任务**: 正式的 `decodeHeic` / `processVideo`（add-heic-upload、add-live-photo-pair-upload）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11 手机照片与实况照片上传](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) |
| 设计依据 | [ADR-006](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [media-upload module-spec §3](../../engineering/frontend/modules/media-upload/module-spec.md) · [US-11 测试数据策略](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md) |

## 范围调整（2026-10-14 作者决定）

- **iPhone 暂不考虑**：手上暂无 iPhone 样本，HEIC 解码（原测试 1、2）与 iPhone MOV 转码延后，`heic-to` 本任务不安装；恢复时机见 [sprint-3/_index.md](_index.md) 前置确认项
- **安卓样本改用 OPPO**：作者提供 `IMG20260516172228.jpg`（ColorOS 动态照片，23.7MB）代替 Pixel 样本。结构核查：Google Motion Photo v1 XMP（`Container:Directory`）+ OPPO 扩展（`OpCamera:OLivePhotoVersion=2`、`OpCamera:VideoLength`）；主图后依次为 Ultra HDR 增益图、主视频（HEVC 3840×2880 + AAC，≈ 16.4MB）、副视频（HEVC 1920×1440，≈ 1.9MB）与 OPPO 私有尾部。`Item:Length` 覆盖到文件末尾，**按长度切出的数据不是单个 mp4**
- **不处理 GPS**：夹具保留原始 EXIF，原"去 GPS"要求取消
- 原测试 4（构建产物检查）移到 [add-live-photo-pair-upload](add-live-photo-pair-upload.md)：spike 页只在 dev 注入，正式代码引入 `mediabunny` 前产物检查恒为真，没有验证意义

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | spike（chromium）：解析 OPPO 动态照片 XMP，按 `Item:Length` 定位视频起点，按 MP4 顶层 box（`ftyp` → … → `mdat`）截出主视频；结果以 `ftyp` 开头、可被 `mediabunny` 打开，含 HEVC 视频轨 | spike E2E |
| 2 | spike（chromium）：`mediabunny` 把主视频转码为 H.264 mp4、无音轨、≤ 10MB，前 12B 经 `sniffVideo` 规则判定为白名单 brand；记录 chunk 体积、首次处理耗时与产出体积 | spike E2E |
| 3 | spike（chromium）：`isConfigSupported` 被改写为不支持时只转封装（保留 HEVC、去音轨），brand 同样合法；记录产出体积是否超过 10MB | spike E2E |

## DoD（完成定义）

### 实现类
- [x] `tests/fixtures/live/` 放入 OPPO 动态照片（保留原始 EXIF）；iPhone 与其余夹具随后续任务补充
- [x] spike 结论回写 [ADR-006](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)"验证结果"：库版本、chunk 体积、首次处理耗时、Chromium 编解码能力、转码后体积（WebKit / HEIC 随 iPhone 部分延后）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] `npm run lint` 与 `npm run check` 无错误

## ⚠️ 前置确认项

- ~~**真实设备夹具**~~：已确认（2026-10-14）——见上方"范围调整"
- spike 若证明某假设不成立（如 WebKit 不能原生解码、转码后仍 > 10MB 比例高），先回到 ADR-006 修订，再继续后续任务

## 依赖

无

## 影响的文件

- `src/pages/admin/_spike-media.astro`（新建）、`astro.config.mjs`（spikeRoutes 注入 `/_spike/media`）、`tests/spike/media-processing.spec.ts`（新建）
- `tests/fixtures/live/*`（新建）、`package.json`

## 回滚策略

删除 spike 页、spike 测试与新增依赖；夹具保留

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [ADR-006](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) | 验证结果 |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
