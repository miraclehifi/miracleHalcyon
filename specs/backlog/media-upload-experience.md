# 图片上传体验升级：进度卡片、浏览器端压缩、实况开关

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Enhancement |
| 优先级 | P1-High |
| 来源 | 作者需求（图片上传体验与存储体积） |
| 日期 | 2026-10-16 |
| 创建者 | miraclehifi |

## 描述

现在的图片上传有三个问题：

1. 预览区只有"处理中…"/"上传中…"文字，大图上传时没有缩略图和进度
2. 手机直出的照片（5–20MB+）原图直传 R2，占用存储，也拖慢读者端首屏（LCP）
3. 安卓动态照片一律切出视频并上传 `.live.mp4`，作者不能选择只要静态图

本条目从 [media-orphan-cleanup](media-orphan-cleanup.md) 拆出（该条目只管未引用资源清理）。

> 取代 [raise-image-size-limit](raise-image-size-limit.md) 中"不做浏览器端自动压缩"的决定；50MB 上限保留，作为压缩失败、退回原图时的兜底。

## 模块 1：进度卡片

1. **本地缩略图**：文件进入队列后立即用 `URL.createObjectURL` 显示半透明、微模糊的缩略图卡片，替代纯文字占位；完成或移除后 `revokeObjectURL`
2. **阶段与进度**：

   | 阶段 | 进度 | 文案 | 说明 |
   |------|------|------|------|
   | 压缩 | 0–15% | 正在压缩… | 无真实进度，按时间平滑推进 |
   | 处理实况视频（仅实况开启且识别为动态照片时） | 15–40% | 正在处理实况视频… | mediabunny 转码，通常是最慢的一步 |
   | 上传 | 剩余部分 – 100% | 正在上传… 75% | XHR `upload.onprogress` 的真实字节进度 |

   成功后淡出卡片，替换为正式图片。编辑器源码中的占位 token 机制不变（顺序规则沿用 US-05 BH-04）
3. **失败**：卡片变成红框，显示错误原因（如"网络中断""上传失败，请重试"），提供"重试"和"移除"。**这是对现有行为的修改**：US-05 / US-11 AC7 目前是失败即移除占位并弹 Toast。上传前的校验错误（格式、> 50MB）仍按现状直接提示，不生成卡片
4. **并发**：每张卡片独立显示进度和状态（队列并发 2 不变）

## 模块 2：浏览器端压缩

| 项 | 规则 |
|----|------|
| 时机 | 识别动态照片并切出视频之后，计算主色、上传之前；主色和宽高改为基于压缩后的图片计算 |
| 尺寸 | 长边上限 2560px，不放大 |
| JPEG / WebP | 输出 WebP（质量 0.82）；用 `canvas.toBlob` 实际返回的 `blob.type` 判断是否支持，不支持时输出 JPEG（0.85） |
| PNG | 只缩尺寸、保持 PNG 格式（截图文字不发糊、透明通道不丢）；缩完不比原图小时用原图 |
| GIF | 不压缩（按 MIME / 魔数识别），保留多帧动画 |
| 跳过 | 长边 ≤ 2560 且体积 < 500KB 时原样上传 |
| 兜底 | 压缩后不比原图小 → 用原图；Canvas 分配失败或解码失败 → 用原图，写作流程不中断 |
| 方向 / 元数据 | 解码时按 EXIF 方向转正（`createImageBitmap` 的 `imageOrientation: 'from-image'`）；输出不带 EXIF / GPS（隐私收益） |
| 大小检查 | 50MB 前端检查保持在压缩前执行，不变 |

服务端不变：按魔数判定格式、以文件头解析宽高，WebP 本来就支持；文件名后缀随实际格式变化。压缩后请求体变小，也缓解了 raise-image-size-limit 遗留的 Workers 128MB 内存风险。

## 模块 3：实况照片开关

1. **上传前（编辑器工具栏）**：`EditorToolbar` 增加"实况照片"开关，**默认关闭**，作者的选择记在本地（localStorage，读不到时按关闭处理）
   - 关闭：识别为动态照片时只上传压缩后的静态图，不加载 mediabunny，不生成、不存储视频
   - 开启：按现有 US-11 流程切出视频、转码、同一请求上传，插入时带 `#live`
   - 卡片快捷操作：开启状态下识别出动态照片时，卡片在"处理实况视频"阶段显示"仅转为静态图"按钮，点击后放弃本张的视频，按静态图继续
2. **上传后（ImageMenu）**：单图菜单增加"实况"勾选项，只在该图存在 `.live.mp4` 时显示（打开菜单时检查一次，本次会话内缓存）
   - 取消勾选：从 URL 片段中去掉 `live`（片段按 `,` 拆分，保留 `wide` 等其他标记），可撤销
   - 重新勾选：加回 `live`
   - 视频已被清理（见 [media-orphan-cleanup](media-orphan-cleanup.md)：取消实况后视频可被清理）时不显示勾选项

## 目标与验收

**目标**: 大图上传有直观的进度反馈，存储和传输体积明显下降，实况视频由作者决定是否保留。

**验收条件**:
- [ ] 拖入图片后预览区立即出现缩略图卡片，进度从 0 走到 100%，成功后替换为正式图片；多张同时上传时进度各自独立
- [ ] 上传失败时卡片保留为红框，"重试"能重新上传成功，"移除"会删掉占位
- [ ] 用测试夹具中约 4000px 宽、> 5MB 的 JPEG 上传：R2 中为长边 2560px 的 WebP，体积 < 1.5MB，URL 中的宽高、主色与实际文件一致
- [ ] PNG 截图仍为 PNG；GIF 原样上传、动画完整；小图（< 500KB 且长边 ≤ 2560）原样上传
- [ ] 实况开关关闭（默认）时拖入 OPPO 动态照片样本：只上传静态图，无 `.live.mp4`，插入的引用不带 `#live`
- [ ] 实况开关开启时行为与现有 US-11 一致；ImageMenu 能取消 / 恢复 `live`，并保留 `wide` 等其他标记
- [ ] 单元、集成、E2E（chromium + webkit）测试通过，`npm run lint`、`npm run check` 无报错

## 影响分析

- **US 变更（F-001）**：US-05（占位表现、失败处理、新增压缩）、US-11（默认关闭、开关、AC4 阶段文案、AC7 失败处理）、US-12（AC4 菜单增加实况勾选项）；对应 behaviors、验收用例同步
- **UI**：[admin-post-editor.md](../ui/pages/admin-post-editor.md)（工具栏开关、进度卡片、ImageMenu）、components.md 新增 / 修改组件 → 必须走 design-ui
- **前端规格**：media-upload module-spec（流程图、阶段、压缩规则、`upload-client` 改用 XHR）、markdown module-spec（占位渲染为卡片）、ADR-006（实况默认关闭）
- **代码（预估）**：`src/lib/upload/`（新增 `compress-image.ts`；`upload-client.ts`、`upload-item.ts`、`use-image-uploads.ts`）、`src/lib/markdown/plugins/upload-placeholder.ts`、`src/components/admin/editor/`（`MarkdownPreview.tsx`、`EditorToolbar.tsx`、`ImageMenu.tsx`）
- **F-002 读者端渲染**：读者页 `src/pages/posts/[slug].astro` 与预览共用 `src/lib/markdown/render.ts`，其中 `rehypeUploadPlaceholders` 会把占位渲染成"图片上传中…"块。失败占位会留在源码里（不再自动移除），发布后会出现在读者页 → 读者端渲染必须去掉上传占位（US-05 AC10）；reader module-spec 同步
- **孤立占位**：刷新页面或撤销"移除"后，源码中的占位没有对应任务，原 File 已不在内存 → 卡片显示"上传已中断"，只能移除（US-05 AC9）
- **服务端**：上传接口不变
- **测试**：WebKit 的 canvas 可能不支持导出 WebP，E2E 需覆盖降级为 JPEG 的情况

## 路由

SDD（F-001 增量，涉及 3 个 US，不满足 Lite 条件）：write-story（更新）→ write-behavior → design-acceptance → design-ui → design-domain（media-upload 模块）→ plan-tasks → implement。

与 [media-orphan-cleanup](media-orphan-cleanup.md) 可并行。

## 排期

已排入 [Sprint 6](../tasks/sprint-6/_index.md)（9 个任务，2026-10-16）。规格变更：US-05 / 11 / 12 story、behaviors、验收（含并行会话补充的 AC9、AC10）；admin-post-editor、components.md、admin.pen；media-upload / editor / markdown / reader module-spec、ADR-006。

## 估算

- **规模**: M–L（三个模块可拆成 3 个以上 TASK：压缩 → 进度卡片 → 实况开关）
