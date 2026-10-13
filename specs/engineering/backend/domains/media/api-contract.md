# media API 契约

**最后更新**: 2026-10-13
**状态**: self-checked

> 通用约定见 [domains/_index.md](../_index.md)；401 / 403 见 [auth/api-contract.md](../auth/api-contract.md)。

---

## POST /api/admin/images

上传一张图片，或一张图片 + 一段实况视频。需要会话。

**请求**：`multipart/form-data`

| 字段 | 类型 | 必填 | 规则 |
|------|------|------|------|
| `file` | File | ✅ | png / jpg / webp / gif（按魔数判定），1 B – 5 MiB |
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
| 413 | `FILE_TOO_LARGE` | 图片不能超过 5MB |
| 413 | `VIDEO_TOO_LARGE` | 实况视频不能超过 10MB |
| 413 | `PAYLOAD_TOO_LARGE` | 上传内容过大 |
| 500 | `UPLOAD_FAILED` | 上传失败，请重试（已回滚，无残留） |

## GET /img/{yyyy}/{mm}/{file}

公开读取。路由文件 `src/pages/img/[...key].ts`。

| 情况 | 响应 |
|------|------|
| 命中 | 200；`Content-Type` 取 R2 元数据；`Cache-Control: public, max-age=31536000, immutable`；`ETag` |
| `If-None-Match` 命中 | 304 |
| 带 `Range`（视频） | 206 + `Content-Range`、`Accept-Ranges: bytes` |
| 不存在 / key 不匹配 `^img/\d{4}/\d{2}/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png\|jpg\|webp\|gif\|live\.mp4)$` | 404（不访问 R2） |

图片同时带 `X-Content-Type-Options: nosniff` 与 `Content-Security-Policy: default-src 'none'`（即使被直接打开也不能执行脚本）。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
