# 压缩时按目标尺寸解码大图

| 字段 | 值 |
|------|-----|
| 状态 | idea |
| 类型 | Improvement |
| 优先级 | P3-Low |
| 来源 | Sprint 6 轻量审查（2026-10-19） |
| 日期 | 2026-10-19 |
| 创建者 | miraclehifi |

## 描述

`compress-image.ts` 先用 `createImageBitmap(file)` 按原尺寸解码整张图，再画到长边 2560 的画布。8000×6000 的照片解码后约 190MB（RGBA），内存小的手机上可能解码失败。失败时会退回原图上传（不打断写作），但这些大图就享受不到压缩。

## 目标与验收

**验收条件**:
- [ ] 需要缩小的图解码时直接按目标尺寸解码（`createImageBitmap` 的 `resizeWidth` / `resizeHeight` + `resizeQuality: "high"`），EXIF 方向仍正确（TC-US05-35 通过）
- [ ] PNG 只缩尺寸、WebP / JPEG 压缩结果与现有 E2E（TC-US05-29 ~ 35）一致
- [ ] 先确认 WebKit 对 `resizeWidth` 与 `imageOrientation: "from-image"` 组合的支持；不支持时保持现有做法

## 影响分析

- `src/lib/upload/compress-image.ts`（`browserEnv.decode` 接收目标尺寸），单元测试 `compress-image.test.ts`
- 不涉及服务端与界面
