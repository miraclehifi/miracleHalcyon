# 元数据超过 64KB 的 JPEG 被误判为不支持的格式

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Bug |
| 优先级 | P1-High |
| 来源 | 作者手动测试（上传 OPPO 动态照片 `tests/fixtures/live/IMG20260516172228.jpg`） |
| 日期 | 2026-10-14 |
| 创建者 | miraclehifi |

## 描述

上传 OPPO 动态照片时提示"仅支持 png、jpg、webp、gif"，文件是合法 JPEG（4096×3072）。

**根因**：`upload` 只把文件前 64KB 交给 `sniffImage`（media domain-model §5 第 2 步"`sniffImage(file 前 64KB)`"）。该照片在帧头（SOF）之前有 64KB 的 EXIF（含缩略图）和 6 个约 64KB 的 OPPO 私有段（APP5–APP10），SOF 位于第 460,385 字节，超出读取范围 → 解析失败 → `UNSUPPORTED_TYPE` → 前端显示格式不支持。属于设计缺陷：新款手机照片（厂商私有段、Ultra HDR 元数据）都可能把 SOF 推到 64KB 之后。

## 目标与验收

**验收条件**:
- [x] SOF 位于 64KB 之后的 JPEG 上传成功，尺寸取文件头真实值
- [x] 作者样本 `IMG20260516172228.jpg` 上传成功（作为普通图片，内嵌视频识别属于 add-motion-photo-detection）
- [x] 伪装文件（HTML / SVG / PDF、截断 JPEG）仍被拒绝

## 影响分析

- **修复**: `src/domains/media/service.ts` 把整个图片字节交给 `sniffImage`（上传时文件已整体读入内存；JPEG 扫描只沿段头跳转，不逐字节读，开销可忽略）
- **规格**: media domain-model §5 第 2 步与 `sniffImage` 说明；单元规格 MEDIA-UT-01 增加"SOF 在 64KB 之后"用例
- **不变**: 视频嗅探只看前 12 字节（`ftyp` brand），不受影响；接口与错误码不变

## 路由

SDD-Lite（Bug，单点修复）：排入 Sprint 3 任务 [fix-jpeg-sniff-large-metadata](../tasks/sprint-3/fix-jpeg-sniff-large-metadata.md)。

## 估算

- **规模**: XS
