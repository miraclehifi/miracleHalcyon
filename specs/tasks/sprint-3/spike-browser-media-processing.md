# spike-browser-media-processing: 浏览器端媒体处理验证（spike）

**Sprint**: Sprint 3
**序号**: 1
**状态**: pending
**类别**: SETUP（spike）
**架构层级**: 表现层（spike 测试页，不进入正式代码）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 在接入正式上传链路前，验证 ADR-006 的三个未验证假设：① `heic-to`（libheif WASM）能在 Vite / Astro 构建下动态 import 并解码 HEIC，WebKit 原生 `createImageBitmap` 能解码 HEIC；② `mediabunny` 能把 iPhone HEVC MOV 转封装为 mp4，`VideoEncoder` 支持 avc1 时转码为 H.264 并去音轨，产出 ≤ 10MB 且 `ftyp` brand 在服务端白名单内；③ 两个库只进入后台 chunk，不进入读者页与线上 Worker 包
- **影响范围**: `src/pages/spike/`（spike 测试页）、`tests/spike/`、`tests/fixtures/live/`（新建夹具目录）、`package.json`（新增 `heic-to`、`mediabunny`，装最新主版本）
- **不变量**: 正式页面与已有测试不受影响
- **不在本任务**: 正式的 `decodeHeic` / `processVideo`（add-heic-upload、add-live-photo-pair-upload）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11 手机照片与实况照片上传](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) |
| 设计依据 | [ADR-006](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [media-upload module-spec §3](../../engineering/frontend/modules/media-upload/module-spec.md) · [US-11 测试数据策略](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | spike（chromium）：动态 import `heic-to` 解码 `IMG_5678.HEIC` → JPEG 0.9，尺寸 4032×3024；记录 chunk 体积与首次耗时 | spike E2E |
| 2 | spike（webkit）：`createImageBitmap(IMG_5678.HEIC)` 原生解码成功，不加载 `heic-to` | spike E2E |
| 3 | spike（chromium）：`mediabunny` 处理 `IMG_1234.MOV` → H.264 mp4、无音轨、≤ 10MB，前 64B 经 `sniffVideo` 规则判定为白名单 brand；`isConfigSupported` 被改写为不支持时只转封装，brand 同样合法 | spike E2E |
| 4 | `npm run build` 后检查产物：`heic-to`、`mediabunny` 只出现在后台 chunk，不在读者页与 `_worker.js` 中 | 构建检查（脚本） |

## DoD（完成定义）

### 实现类
- [ ] `tests/fixtures/live/` 按 US-11 夹具清单就位（真实设备样本，去 GPS；超限样本由脚本生成）
- [ ] spike 结论回写 [ADR-006](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)"验证结果"：库版本、chunk 体积、首次处理耗时、WebKit 能力、转码后体积

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] `npm run lint` 与 `npm run check` 无错误

## ⚠️ 前置确认项

- **真实设备夹具**：`IMG_1234.HEIC/.MOV`、`IMG_5678.HEIC`、`PXL_0001.MP.jpg`、`MVIMG_0002.jpg`、`IMG_2000.HEIC/.MOV` 需作者从 iPhone / Pixel 导出提供（或确认改用公开样本）
- spike 若证明某假设不成立（如 WebKit 不能原生解码、转码后仍 > 10MB 比例高），先回到 ADR-006 修订，再继续后续任务

## 依赖

无

## 影响的文件

- `src/pages/spike/media-processing.astro`（新建）、`tests/spike/media-processing.spec.ts`（新建）
- `tests/fixtures/live/*`（新建）、`package.json`

## 回滚策略

删除 spike 页、spike 测试与新增依赖；夹具保留

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [ADR-006](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) | 验证结果 |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
