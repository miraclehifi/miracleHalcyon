# media API 契约

**最后更新**: 2026-10-16
**状态**: self-checked

> 通用约定见 [domains/_index.md](../_index.md)；401 / 403 见 [auth/api-contract.md](../auth/api-contract.md)。

---

## POST /api/admin/images

> 已实现（Sprint 2，implement-image-upload-api）：`src/pages/api/admin/images.ts`。`video` 字段已实现（Sprint 3，implement-live-photo-upload-api）；`video` 为 0 字节时 400 `VALIDATION_FAILED`（`fields: ["video"]`）。

上传一张图片，或一张图片 + 一段实况视频。需要会话。

**请求**：`multipart/form-data`

| 字段 | 类型 | 必填 | 规则 |
|------|------|------|------|
| `file` | File | ✅ | png / jpg / webp / gif（按魔数判定），1 B – 50 MiB |
| `video` | File | — | mp4（ISO BMFF，brand 白名单见 domain-model §4.2），≤ 10 MiB；有此字段即为实况照片 |
| `rgb` | string | — | `^[0-9a-f]{6}$`，浏览器计算的主色；缺省为 `808080`（中性灰） |
| `width` / `height` | string | — | 若提供须为 1–20000 的整数；只校验不采用（服务端以文件头为准） |

**201**

```json
{
  "url": "/img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg",
  "width": 4032,
  "height": 3024,
  "rgb": "8a7b6c",
  "live": true,
  "videoUrl": "/img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.live.mp4"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | string | 插入 Markdown 的地址；实况照片由前端追加 `#live` |
| `width` / `height` | integer | 服务端解析的真实尺寸 |
| `rgb` | string | 回显 |
| `live` | boolean | 是否带视频 |
| `videoUrl` | string \| null | — |

**错误**

| 状态 | code | message |
|------|------|---------|
| 400 | `VALIDATION_FAILED` | 缺少 `file` / 0 字节 / 只有视频 / `rgb`、`width`、`height` 不合法（`error.fields` 列出字段） |
| 400 | `UNSUPPORTED_TYPE` | 不支持的图片格式（与 US-05 BH-08 一致；前端在上传前已按扩展名给出"仅支持 png、jpg、webp、gif"） |
| 413 | `FILE_TOO_LARGE` | 图片不能超过 50MB |
| 413 | `VIDEO_TOO_LARGE` | 实况视频不能超过 10MB |
| 413 | `PAYLOAD_TOO_LARGE` | 上传内容过大 |
| 500 | `UPLOAD_FAILED` | 上传失败，请重试（已回滚，无残留） |

## GET /img/{yyyy}/{mm}/{file}

公开读取。路由文件 `src/pages/img/[...key].ts`（已实现，Sprint 2 add-image-read-route）。

| 情况 | 响应 |
|------|------|
| 命中 | 200；`Content-Type` 取 R2 元数据；`Cache-Control: public, max-age=31536000, immutable`；`ETag` |
| `If-None-Match` 命中 | 304 |
| 带 `Range`（视频） | 206 + `Content-Range`、`Accept-Ranges: bytes` |
| 不存在 / key 不匹配 `^img/\d{4}/\d{2}/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png\|jpg\|webp\|gif\|live\.mp4)$` | 404（不访问 R2） |

前端用 `Range: bytes=0-0` 请求 `.live.mp4` 判断某张图是否存有实况视频（图片菜单"实况"项，见 media-upload module-spec"实况视频检查"），不新增接口。

自 2026-10-16 起，编辑器上传的 `file` 一般为浏览器压缩后的 WebP / JPEG / PNG（[media-upload-experience](../../../../backlog/media-upload-experience.md)）；接口规则不变。

图片同时带 `X-Content-Type-Options: nosniff` 与 `Content-Security-Policy: default-src 'none'`（即使被直接打开也不能执行脚本）。

## GET /api/admin/storage/orphans

> F-006 US-01。已实现（Sprint 7 任务 1）：`src/pages/api/admin/storage/orphans.ts`。需要会话（401 见 auth 契约）。

统计未引用资源（规则见 [domain-model](domain-model.md) §9）。只返回数字，不返回 key 列表。

**200**

```json
{
  "summary": {
    "orphanImageCount": 12,
    "orphanImageBytes": 18450120,
    "orphanVideoCount": 3,
    "orphanVideoBytes": 8102340,
    "totalOrphanBytes": 26552460,
    "protectedCount": 2
  },
  "checkedAt": "2026-10-16T06:32:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `summary.orphanImageCount` | integer | 未引用图片张数 |
| `summary.orphanImageBytes` | integer | 未引用图片的图片体积之和（字节，不含其视频） |
| `summary.orphanVideoCount` | integer | 未引用实况视频个数（图片仍被引用） |
| `summary.orphanVideoBytes` | integer | 未引用实况视频体积之和 |
| `summary.totalOrphanBytes` | integer | 预计可释放：以上两项 + 未引用图片自带的视频体积 |
| `summary.protectedCount` | integer | 24 小时内上传、暂不参与的项数 |
| `checkedAt` | 时间戳 | 服务端检测时间（ISO 8601 UTC，前端按本地时区显示） |

**错误**

| 状态 | code | message |
|------|------|---------|
| 500 | `INTERNAL_ERROR` | 检测失败，请重试 |

## POST /api/admin/storage/cleanup

> F-006 US-02。已实现（Sprint 7 任务 2）：`src/pages/api/admin/storage/cleanup.ts`。需要会话 + Origin 校验（401 / 403 见 auth 契约）。

**请求**：无请求体（有也忽略）。服务端重新判定后清理全部未引用资源。

**200**

```json
{ "removedImages": 12, "removedVideos": 3, "freedBytes": 26552460 }
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `removedImages` | integer | 删除的图片数（其自带视频一并删除，不单独计数） |
| `removedVideos` | integer | 只删除视频、图片保留的个数 |
| `freedBytes` | integer | 本次释放的字节数（= 清理时的 `totalOrphanBytes`） |

无未引用资源时返回 `0 / 0 / 0`。

**错误**

| 状态 | code | message |
|------|------|---------|
| 405 | — | 非 POST（Astro 路由只导出 `POST`） |
| 500 | `CLEANUP_FAILED` | 清理未完成，请重试（已删除的不恢复，重试可继续） |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-14 | 1.1 | `file` 上限 5 MiB → 50 MiB（[raise-image-size-limit](../../../../backlog/raise-image-size-limit.md)） | miraclehifi |
| 2026-10-16 | 1.2 | F-006：新增 `GET /api/admin/storage/orphans`、`POST /api/admin/storage/cleanup` | miraclehifi |
