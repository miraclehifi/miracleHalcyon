# US-11 手机照片与实况照片上传 验收测试

**US ID**: US-11
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/behaviors.md)
**最后更新**: 2026-10-12
**Version Tag**: v1.0

> 验收用例来自 behaviors.md 的 Given-When-Then，另外补充了等价类、边界值、错误猜测和 NFR 用例（nfr.md §2.2：存储格式只允许 png/jpg/webp/gif；实况视频为 mp4，≤ 10MB；服务端按文件头判断类型）。
> 写法和 R2 key 以 [ADR-005](../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) 为准，浏览器端处理以 [ADR-006](../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) 为准。
> 接口路径暂写为 `POST /api/admin/images`（multipart：`file`，可选 `video`、`width`、`height`、`rgb`），**最终以 design-domain 的 API 契约为准**。
> 普通图片的占位、大小、类型、失败处理由 US-05 覆盖，这里不重复。

---

## 测试数据策略

| 类别 | 策略 |
|------|------|
| 媒体夹具 | 放在 `tests/fixtures/live/`，提交 git（真实设备导出的样本，已去掉 EXIF 中的 GPS 信息）；超限样本由脚本生成 |
| 测试文章 | 每个 TC 通过 API 新建独立草稿，标题前缀 `[E2E-US11]` |
| 登录态 | 沿用 US-05 的 `storageState` |
| R2 对象 | 每个 TC 记录响应中的 key，`afterEach` 删除图片和同名 `.live.mp4`；断言"无残留"时比较测试前后的 `list` 差集 |
| 浏览器能力 | 用 Playwright 项目矩阵区分：`chromium`（不能解码 HEIC，能编码 H.264）、`webkit`（原生解码 HEIC）。"不支持 H.264 编码"通过 `addInitScript` 改写 `VideoEncoder.isConfigSupported`，让它返回 `{ supported: false }` 来模拟 |
| 处理组件加载 | "首次加载"用全新 context（无缓存），并通过 `page.route` 给 `heic-to` / `mediabunny` 的 chunk 加 1.5s 延迟 |

**夹具清单**：

| 夹具 | 内容 | 用途 |
|------|------|------|
| `IMG_1234.HEIC` + `IMG_1234.MOV` | iPhone 实况照片，4032×3024，HEVC 视频约 3s、≈ 4MB | 主路径 |
| `IMG_5678.HEIC` | 单张 HEIC 4032×3024 | 单图转换 |
| `PXL_0001.MP.jpg` | Pixel 动态照片（XMP `Container:Directory` + `Item:Semantic=MotionPhoto`），内嵌 mp4 ≈ 2MB | 安卓 |
| `MVIMG_0002.jpg` | 旧版 `MicroVideoOffset` 格式 | 安卓旧格式（等价类） |
| `IMG_2000.HEIC` + `IMG_2000.MOV` | 视频处理后 ≈ 12MB | 超限 |
| `IMG_2100.JPG` + `IMG_2100.MP4` | 视频为 H.264 mp4，恰好 10,485,760 B，已是 mp4，无需处理 | 上边界（接受） |
| `IMG_2101.JPG` + `IMG_2101.MP4` | 10,485,761 B | 上边界 +1 |
| `clip.mov` | 独立视频 | 无配对 |
| `IMG_6000.heic` + `img_6000.mov` | 文件名大小写不同 | 配对规则（错误猜测） |
| `broken.heic` | 前 2KB 是 HEIC 头，后面是随机字节 | 无法解码 |
| `a.png`、`b.jpg` | 普通图片 | 混合批次 |
| `fake.mp4` | 改名的 HTML（`<script>`） | 魔数伪造 |

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | 优先级 |
|-------|--------|------|------|--------|
| TC-US11-01 | SC-LIVE-01 | 拖入同名 HEIC + MOV，插入一条 `#live` 引用 | e2e | P0 |
| TC-US11-02 | SC-LIVE-01 | 上传结果：R2 中有 jpg 和 `.live.mp4`，key 格式与宽高、主色正确 | api | P0 |
| TC-US11-03 | SC-LIVE-02 | Chromium 拖入单张 HEIC，上传的是 JPEG | e2e | P0 |
| TC-US11-04 | SC-LIVE-02 | WebKit 原生解码 HEIC，结果与 Chromium 一致 | e2e | P1 |
| TC-US11-05 | SC-LIVE-03 | Pixel MotionPhoto 识别为实况照片 | e2e | P0 |
| TC-US11-06 | SC-LIVE-03 | 等价类：旧版 MicroVideoOffset 格式 | e2e | P2 |
| TC-US11-07 | SC-LIVE-04 | 混合批次按顺序插入，只有配对项带 `#live` | e2e | P1 |
| TC-US11-08 | SC-LIVE-04 | 错误猜测：文件名大小写不同仍然配对 | e2e | P2 |
| TC-US11-09 | SC-LIVE-06 | 视频处理后 12MB，退回普通图片并提示 | e2e | P0 |
| TC-US11-10 | SC-LIVE-06 | 边界：视频恰好 10MB 接受 / 10MB+1 退回 | e2e | P1 |
| TC-US11-11 | SC-LIVE-06 | 绕过前端直接上传 > 10MB 视频，服务端拒绝 | api | P0 |
| TC-US11-12 | SC-LIVE-07 | 只拖入视频，不上传并提示 | e2e | P0 |
| TC-US11-13 | SC-LIVE-07 | 绕过前端只上传视频字段，服务端拒绝 | api | P1 |
| TC-US11-14 | SC-LIVE-08 | 上传请求失败，图片和视频都不保留 | e2e | P0 |
| TC-US11-15 | SC-LIVE-08 | 服务端写视频失败时回滚已写入的图片 | api | P1 |
| TC-US11-16 | SC-LIVE-09 | 不支持 H.264 编码，保留 HEVC 并提示 | e2e | P1 |
| TC-US11-17 | SC-LIVE-12 | "插入图片"多选同名文件后配对 | e2e | P1 |
| TC-US11-18 | SC-LIVE-13 | 损坏的 HEIC：提示并且不上传 | e2e | P1 |
| TC-US11-19 | SC-LIVE-01, SC-LIVE-08 | 安全：伪造视频魔数、未登录、跨站 Origin | security | P0 |
| TC-US11-20 | SC-LIVE-01 | 安全：客户端伪造宽高或主色参数，服务端校验 | security | P1 |
| TC-US11-21 | SC-LIVE-01 | 性能：实况照片从拖入到插入引用 < 15s（首次加载组件） | performance | P2 |
| TC-US11-22 | SC-LIVE-05 | 占位依次显示"处理中…"→"上传中…"，预览占位块 | ui-interaction | P0 |
| TC-US11-23 | SC-LIVE-10 | 预览中桌面悬停播放、移出复原 | ui-interaction | P0 |
| TC-US11-24 | SC-LIVE-10 | 手机长按播放、松手复原，不弹系统菜单 | ui-interaction | P1 |
| TC-US11-25 | SC-LIVE-11 | 视频无法解码：只显示静态图，隐藏 LIVE | ui-interaction | P1 |

---

## TC-US11-01: 拖入同名 HEIC + MOV，插入一条 `#live` 引用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-01 |
| covers | SC-LIVE-01 |
| Scenario | iPhone 实况照片成对拖入 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`DataTransfer` 中放入两个 `File`） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文三行：`行1` / `行2` / `行3`
- 【环境前置】chromium；已登录

**测试数据：** `IMG_1234.HEIC`、`IMG_1234.MOV`

**步骤：**
1. 打开写文章页，光标放在 `行3` 行尾，然后回车
2. 在源码区派发 drop 事件，载荷为两个文件
3. 等待上传响应

**预期结果：**
- 上传请求发起 1 次（一个 multipart 请求同时含图片和视频）
- 源码第 4 行匹配 `^!\[IMG_1234\]\(/img/\d{4}/\d{2}/[a-z2-7]{10}_4032x3024_[0-9a-f]{6}\.jpg#live\)$`
- 源码中只新增这一行，`行1`–`行3` 不变
- 预览中该图片有 `LIVE` 标记（`[data-live-badge]` 可见）

**清理：** 删除本次 R2 对象和草稿

---

## TC-US11-02: R2 中有 jpg 和 `.live.mp4`，key 格式与宽高、主色正确

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-02 |
| covers | SC-LIVE-01 |
| Scenario | 校验服务端落盘结果 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】已登录的 API client

**测试数据：** 预先转好的 `IMG_1234.jpg`（4032×3024）+ `IMG_1234.mp4`（H.264），表单字段 `width=4032`、`height=3024`、`rgb=8a7b6c`

**步骤：**
1. `POST /api/admin/images`，带上 `file`、`video`、`width`、`height`、`rgb`
2. 列出 R2 的 `img/` 前缀
3. `GET` 返回的图片 URL，以及把扩展名换成 `.live.mp4` 后的 URL

**预期结果：**
- 响应 201，返回 `{ url, live: true, width: 4032, height: 3024 }`（字段以 API 契约为准）
- key 为 `img/{当前年}/{当前月}/{10 位 base32}_4032x3024_8a7b6c.jpg`；视频 key 与图片同名，扩展名为 `.live.mp4`
- 两次 GET 都返回 200；图片 `Content-Type: image/jpeg`，视频 `Content-Type: video/mp4`；都带 `Cache-Control: public, max-age=31536000, immutable`
- `images` 表新增一行，配对视频 key 不为空

**清理：** 删除 R2 对象

---

## TC-US11-03: Chromium 拖入单张 HEIC，上传的是 JPEG

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-03 |
| covers | SC-LIVE-02 |
| Scenario | 不支持 HEIC 的浏览器在浏览器端转换 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】chromium；已登录；空正文草稿

**测试数据：** `IMG_5678.HEIC`

**步骤：**
1. 拖入文件
2. 拦截上传请求，检查 multipart 中的 `file` 部分

**预期结果：**
- `file` 的前 3 个字节是 `FF D8 FF`（JPEG），文件名以 `.jpg` 结尾
- 请求不含 `video` 字段
- 源码为 `![IMG_5678](/img/…_4032x3024_{rgb}.jpg)`，不带 `#`
- 预览中 `img` 的 `naturalWidth > 0`

**清理：** 删除 R2 对象和草稿

---

## TC-US11-04: WebKit 原生解码 HEIC，结果与 Chromium 一致

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-04 |
| covers | SC-LIVE-02 |
| Scenario | 原生解码分支不加载 `heic-to` |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（webkit 项目） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】webkit；已登录

**测试数据：** `IMG_5678.HEIC`

**步骤：** 同 TC-US11-03，另外记录网络请求

**预期结果：**
- 结果与 TC-US11-03 相同（JPEG，宽高 4032×3024）
- 没有请求 `heic-to` 的 chunk

**清理：** 同上

---

## TC-US11-05: Pixel MotionPhoto 识别为实况照片

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-05 |
| covers | SC-LIVE-03 |
| Scenario | 从 JPEG 内嵌视频中切出 mp4 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】chromium；已登录；空正文草稿

**测试数据：** `PXL_0001.MP.jpg`

**步骤：**
1. 拖入文件
2. 拦截上传请求

**预期结果：**
- 请求中有 `video` 字段，第 4–8 个字节是 `ftyp`
- `file` 部分只包含静态图：其长度等于原文件长度减去内嵌视频长度
- 源码中的引用带 `#live`；alt 为 `PXL_0001.MP`

**清理：** 删除 R2 对象和草稿

---

## TC-US11-06: 等价类——旧版 MicroVideoOffset 格式

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-06 |
| covers | SC-LIVE-03 |
| Scenario | 旧格式动态照片 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** `MVIMG_0002.jpg`

**步骤：** 同 TC-US11-05

**预期结果：** 引用带 `#live`；视频字段以 `ftyp` 开头

**清理：** 同上

---

## TC-US11-07: 混合批次按顺序插入，只有配对项带 `#live`

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-07 |
| covers | SC-LIVE-04 |
| Scenario | 普通图片与实况照片混在一批 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】chromium；上传接口通过 `route` 让 `a.png` 最慢返回（延迟 2s）

**测试数据：** `a.png`、`IMG_1234.HEIC`、`IMG_1234.MOV`、`b.jpg`（按这个顺序放进 `DataTransfer`）

**步骤：** 拖入，等待全部完成

**预期结果：**
- 源码按 `a` → `IMG_1234` → `b` 的顺序共 3 行
- 只有 `IMG_1234` 那一行带 `#live`
- 上传请求共 3 次

**清理：** 同上

---

## TC-US11-08: 错误猜测——文件名大小写不同仍然配对

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-08 |
| covers | SC-LIVE-04 |
| Scenario | basename 比较不区分大小写 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** `IMG_6000.heic` + `img_6000.mov`

**预期结果：** 只插入 1 条引用，带 `#live`

**清理：** 同上

---

## TC-US11-09: 视频处理后 12MB，退回普通图片并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-09 |
| covers | SC-LIVE-06 |
| Scenario | 视频超限时降级 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】chromium；空正文草稿

**测试数据：** `IMG_2000.HEIC` + `IMG_2000.MOV`

**步骤：** 拖入，等待完成

**预期结果：**
- 上传请求不含 `video` 字段
- 源码引用不带 `#live`
- 出现提示"实况视频超过 10MB，已作为普通图片插入"

**清理：** 同上

---

## TC-US11-10: 边界——视频恰好 10MB 接受 / 10MB+1 退回

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-10 |
| covers | SC-LIVE-06 |
| Scenario | 大小上界（mp4 无需处理，大小即原文件大小） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** `IMG_2100.JPG` + `IMG_2100.MP4`（10,485,760 B）；`IMG_2101.JPG` + `IMG_2101.MP4`（10,485,761 B）

**步骤：** 分两次拖入

**预期结果：**
- `IMG_2100`：引用带 `#live`，R2 中视频大小为 10,485,760 B
- `IMG_2101`：引用不带 `#live`，出现超限提示

**清理：** 同上

---

## TC-US11-11: 绕过前端直接上传 > 10MB 视频，服务端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-11 |
| covers | SC-LIVE-06 |
| Scenario | 服务端大小校验 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** 合法 jpg + 10,485,761 B 的 mp4

**步骤：** 直接 `POST /api/admin/images`

**预期结果：**
- 响应 413（或 400），`error.code = "VIDEO_TOO_LARGE"`（以 API 契约为准）
- R2 中没有新对象（包括图片）

**清理：** 无

---

## TC-US11-12: 只拖入视频，不上传并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-12 |
| covers | SC-LIVE-07 |
| Scenario | 没有配对的视频 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【数据前置】正文为 `正文`

**测试数据：** `clip.mov`

**步骤：** 拖入

**预期结果：**
- 上传请求 0 次
- 源码仍然是 `正文`
- 常驻错误提示"视频需要与同名照片一起拖入"（`role="alert"`）

**清理：** 删除草稿

---

## TC-US11-13: 绕过前端只上传视频字段，服务端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-13 |
| covers | SC-LIVE-07 |
| Scenario | 服务端要求视频必须有图片配对 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：**
1. 只带 `video` 字段，不带 `file`，调用上传接口
2. 把 mp4 放在 `file` 字段里调用上传接口

**预期结果：** 两次都返回 400；第 2 次的 `error.code = "UNSUPPORTED_TYPE"`；R2 中没有新对象

**清理：** 无

---

## TC-US11-14: 上传请求失败，图片和视频都不保留

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-14 |
| covers | SC-LIVE-08 |
| Scenario | 网络失败 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【数据前置】正文为 `前文`；【环境前置】`page.route('**/api/admin/images', r => r.abort())`

**测试数据：** `IMG_3000` 对（沿用 `IMG_1234` 的内容，只改了名字）

**步骤：** 拖入

**预期结果：**
- 源码恢复为 `前文`，没有残留占位
- 常驻错误提示"上传失败，请重试"，提示中包含 `IMG_3000`
- R2 的 `list` 差集为空

**清理：** 删除草稿

---

## TC-US11-15: 服务端写视频失败时回滚已写入的图片

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-15 |
| covers | SC-LIVE-08 |
| Scenario | 不留下"半对"文件 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（Workers 集成测试中把 R2 绑定的 `put` 换成桩，让视频写入时抛错） |
| type | api |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：** 在 vitest-pool-workers 中调用上传处理函数

**预期结果：** 返回 5xx；R2 中没有图片和视频；`images` 表没有新行

**清理：** 无

---

## TC-US11-16: 不支持 H.264 编码，保留 HEVC 并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-16 |
| covers | SC-LIVE-09 |
| Scenario | 转码不可用时降级为只转封装 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`addInitScript` 改写 `VideoEncoder.isConfigSupported`） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** `IMG_4000` 对（HEVC）

**步骤：** 拖入，拦截上传请求，解析 `video` 中 `stsd` box 的编码标识

**预期结果：**
- 视频是 mp4 容器，编码为 `hvc1` / `hev1`
- 引用带 `#live`
- 提示"该实况视频在部分浏览器中只显示静态图"

**清理：** 同上

---

## TC-US11-17: "插入图片"多选同名文件后配对

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-17 |
| covers | SC-LIVE-12 |
| Scenario | 通过文件选择器多选 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`setInputFiles` 传两个文件） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】文件选择框 `accept` 中包含 `.heic,.heif,.mov,.mp4`

**测试数据：** `IMG_1234.HEIC` + `IMG_1234.MOV`

**步骤：** 点击"插入图片"，然后 `setInputFiles`

**预期结果：** 只插入一条带 `#live` 的引用

**清理：** 同上

---

## TC-US11-18: 损坏的 HEIC——提示并且不上传

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-18 |
| covers | SC-LIVE-13 |
| Scenario | 原生解码和 `heic-to` 都失败 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** `broken.heic`

**预期结果：** 上传请求 0 次；占位被移除；常驻提示"无法读取 broken.heic，请换一张图片"

**清理：** 删除草稿

---

## TC-US11-19: 安全——伪造视频魔数、未登录、跨站 Origin

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-19 |
| covers | SC-LIVE-01, SC-LIVE-08 |
| Scenario | 上传接口的安全边界 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤与预期：**

| # | 请求 | 预期 |
|---|------|------|
| 1 | 合法 jpg + `fake.mp4`（声明 `video/mp4`） | 400 `UNSUPPORTED_TYPE`；R2 无新对象 |
| 2 | 未带会话 Cookie 的合法图片 + 视频 | 401 |
| 3 | 带会话，但 `Origin: https://evil.example` | 403 |
| 4 | 在 `video` 字段里放 HEIC 原始文件（未转换） | 400 `UNSUPPORTED_TYPE` |

**清理：** 无

---

## TC-US11-20: 安全——客户端伪造宽高或主色参数，服务端校验

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-20 |
| covers | SC-LIVE-01 |
| Scenario | 自描述 key 中的元数据由服务端校验 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤与预期：**

| # | 参数 | 预期 |
|---|------|------|
| 1 | `width=0` 或 `width=-1` | 400 |
| 2 | `width=100000` | 400（上限以 API 契约为准，暂定 20000） |
| 3 | `rgb=zzzzzz` / `rgb=../../x` | 400 |
| 4 | `width=4032,height=3024`，但图片实际是 1×1 png | 201。key 用服务端从文件头读出的宽高（png/jpg/webp/gif 的头部都能解析），不用客户端传的值 |

**清理：** 删除 R2 对象

---

## TC-US11-21: 性能——实况照片从拖入到插入引用 < 15s（首次加载组件）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-21 |
| covers | SC-LIVE-01 |
| Scenario | 端到端耗时（feature-scope "5MB 以内图片 < 5s" 的实况照片版本） |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（只做记录性断言，CI 中阈值放宽到 2 倍） |
| type | performance |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：** 用全新 context 拖入 `IMG_1234` 对，测量从 drop 到源码出现 `#live` 引用的时间

**预期结果：** 首次 < 15s；同一页面第二次 < 8s

**清理：** 同上

---

## UI 交互测试

### TC-US11-22: 占位依次显示"处理中…"→"上传中…"，预览占位块

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-22 |
| covers | SC-LIVE-05 |
| Scenario | 处理阶段可见 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】全新 context；处理组件 chunk 延迟 1.5s；上传请求延迟 2s

**步骤：** 拖入 `IMG_1234` 对，依次观察源码和预览

**预期结果：**
- 源码先出现 `处理中…` 占位，之后变为 `上传中…`，最后替换为引用
- 上传中时预览对应位置显示"图片上传中… IMG_1234"

**playwright_hint：**
```ts
await page.route(/heic-to|mediabunny/, async r => { await new Promise(f => setTimeout(f, 1500)); await r.continue(); });
await page.route('**/api/admin/images', async r => { await new Promise(f => setTimeout(f, 2000)); await r.continue(); });
await expect(editor).toHaveValue(/处理中…/);
await expect(editor).toHaveValue(/上传中…/);
await expect(preview.getByText('图片上传中… IMG_1234')).toBeVisible();
await expect(editor).toHaveValue(/#live\)/, { timeout: 20000 });
```

**清理：** 同上

### TC-US11-23: 预览中桌面悬停播放、移出复原

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-23 |
| covers | SC-LIVE-10 |
| Scenario | 实况照片桌面交互 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【数据前置】草稿正文包含一条已上传的 `#live` 引用（由 fixture 预先上传 H.264 视频）

**步骤：** 鼠标移到预览图片上，等待 1s；然后移出

**预期结果：**
- 移入后 `video` 的 `paused === false`、`muted === true`；`LIVE` 标记切换为播放中样式（`[data-playing]`）
- 移出后视频暂停并回到第 0 秒，显示静态图
- 播放结束不循环（`loop === false`）

**playwright_hint：**
```ts
const fig = preview.locator('[data-article-image][data-live]');
await fig.hover();
await expect.poll(() => fig.locator('video').evaluate((v: HTMLVideoElement) => !v.paused && v.muted)).toBe(true);
await expect(fig.locator('[data-live-badge]')).toHaveAttribute('data-playing', '');
await page.mouse.move(0, 0);
await expect.poll(() => fig.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
```

**清理：** 删除草稿和 R2 对象

### TC-US11-24: 手机长按播放、松手复原，不弹系统菜单

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-24 |
| covers | SC-LIVE-10 |
| Scenario | 触屏交互 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`devices['iPhone 13']` + CDP 触摸事件；系统菜单抑制通过 CSS 断言验证） |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 同 TC-US11-23；移动视口，切到"预览"Tab

**步骤：** `touchstart` 后保持 600ms，再 `touchend`

**预期结果：**
- 保持期间视频在播放；`touchend` 后暂停
- 图片的计算样式 `-webkit-touch-callout: none`，`contextmenu` 被阻止
- 长按不会打开 US-12 的图片菜单（菜单只在短按时出现）

**playwright_hint：**
```ts
await fig.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 50, clientY: 50 }] });
await page.waitForTimeout(600);
await expect.poll(() => fig.locator('video').evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
await fig.dispatchEvent('touchend');
await expect(page.getByRole('menu', { name: '图片' })).toHaveCount(0);
```

**清理：** 同上

### TC-US11-25: 视频无法解码——只显示静态图，隐藏 LIVE

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-25 |
| covers | SC-LIVE-11 |
| Scenario | 播放失败时降级 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（让 `.live.mp4` 返回损坏字节，触发 `error` 事件） |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** 【环境前置】`page.route('**/*.live.mp4', r => r.fulfill({ body: 'xx', contentType: 'video/mp4' }))`

**步骤：** 打开带 `#live` 引用的草稿，悬停图片

**预期结果：** `[data-live-badge]` 不可见；悬停后不显示 `video`；静态图正常显示

**playwright_hint：**
```ts
await expect(fig.locator('[data-live-badge]')).toBeHidden();
await fig.hover();
await expect(fig.locator('video')).toBeHidden();
await expect(fig.locator('img')).toBeVisible();
```

**清理：** 删除草稿

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-LIVE-01 | BH-01 同名 HEIC + MOV | TC-US11-01, 02, 19, 20, 21 |
| SC-LIVE-02 | BH-02 单张 HEIC | TC-US11-03, 04 |
| SC-LIVE-03 | BH-03 安卓动态照片 | TC-US11-05, 06 |
| SC-LIVE-04 | BH-04 混合批次 | TC-US11-07, 08 |
| SC-LIVE-05 | BH-05 处理中 / 上传中占位 | TC-US11-22 |
| SC-LIVE-06 | BH-06 视频超过 10MB | TC-US11-09, 10, 11 |
| SC-LIVE-07 | BH-07 只有视频 | TC-US11-12, 13 |
| SC-LIVE-08 | BH-08 任一失败都不保留 | TC-US11-14, 15, 19 |
| SC-LIVE-09 | BH-09 不支持 H.264 | TC-US11-16 |
| SC-LIVE-10 | BH-10 悬停 / 长按播放 | TC-US11-23, 24 |
| SC-LIVE-11 | BH-11 播放失败降级 | TC-US11-25 |
| SC-LIVE-12 | BH-12 插入图片多选配对 | TC-US11-17 |
| SC-LIVE-13 | BH-13 HEIC 无法解码 | TC-US11-18 |

| 验收标准（story.md §2） | TC-IDs |
|------------------------|--------|
| AC1 同名配对 | TC-US11-01, 02, 23 |
| AC2 单张 HEIC | TC-US11-03, 04 |
| AC3 安卓动态照片 | TC-US11-05, 06 |
| AC4 处理中占位 | TC-US11-22 |
| AC5 视频 > 10MB | TC-US11-09, 10, 11 |
| AC6 只有视频 | TC-US11-12, 13 |
| AC7 任一失败 | TC-US11-14, 15 |
| AC8 不支持 H.264 | TC-US11-16, 25 |
| NFR §2.2 魔数、登录、CSRF | TC-US11-19, 20 |

**Gap 检查**：behaviors.md 共有 SC-LIVE-01 ~ SC-LIVE-13 13 个 SC-ID，每个都至少有 1 个 TC 覆盖。

**Gap: 无**

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-12 | v1.0 | 初始创建 | miraclehifi |
