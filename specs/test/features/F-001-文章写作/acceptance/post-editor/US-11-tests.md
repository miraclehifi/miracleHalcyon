# US-11 实况照片上传（安卓动态照片） 验收测试

**US ID**: US-11
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.1

> 验收用例来自 behaviors.md 的 Given-When-Then，另外补充了等价类、边界值、错误猜测和 NFR 用例（nfr.md §2.2：存储格式只允许 png/jpg/webp/gif；实况视频为 mp4，≤ 10MB；服务端按文件头判断类型）。
> 写法和 R2 key 以 [ADR-005](../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) 为准，浏览器端处理以 [ADR-006](../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) 为准。
> 接口路径暂写为 `POST /api/admin/images`（multipart：`file`，可选 `video`、`width`、`height`、`rgb`），**最终以 design-domain 的 API 契约为准**。
> 普通图片的占位、大小、类型、失败处理由 US-05 覆盖，这里不重复；HEIC / HEIF、单独的 mov / mp4 按 US-05 的类型错误处理。
> 编号不重排：2026-10-15 去掉苹果相关后，TC-US11-03、04、08、12、18 标为已删除（[drop-apple-live-photo](../../../../../backlog/drop-apple-live-photo.md)）。

---

## 测试数据策略

| 类别 | 策略 |
|------|------|
| 媒体夹具 | 放在 `tests/fixtures/live/`，提交 git（真实设备导出的样本，保留原始 EXIF——2026-10-14 作者决定不去 GPS）；旧格式、HEVC、大小边界样本由夹具脚本基于 OPPO 样本生成 |
| 测试文章 | 每个 TC 通过 API 新建独立草稿，标题前缀 `[E2E-US11]` |
| 登录态 | 沿用 US-05 的 `storageState` |
| R2 对象 | 每个 TC 记录响应中的 key，`afterEach` 删除图片和同名 `.live.mp4`；断言"无残留"时比较测试前后的 `list` 差集 |
| 浏览器能力 | 主跑 `chromium`（能编码 H.264；需 `channel: "chromium"`，默认 headless shell 不能解码 HEVC，见 ADR-006"验证结果"），`webkit` 补跑一次。"不支持 H.264 编码"通过 `addInitScript` 改写 `VideoEncoder.isConfigSupported`，让它返回 `{ supported: false }` 来模拟 |
| 处理组件加载 | "首次加载"用全新 context（无缓存），并通过 `page.route` 给 `mediabunny` 的 chunk 加 1.5s 延迟；普通图片的"处理中"通过 `addInitScript` 给 `createImageBitmap` 加延迟来观察 |

**夹具清单**：

| 夹具 | 内容 | 用途 |
|------|------|------|
| `IMG20260516172228.jpg` | OPPO（ColorOS）动态照片，代替原计划的 Pixel 样本：XMP `Container:Directory` + `Item:Semantic=MotionPhoto` + `OpCamera:*` 扩展；主视频 HEVC 3840×2880 + AAC ≈ 16.4MB，其后还有副视频（HEVC 1920×1440 ≈ 1.9MB）与 OPPO 私有尾部 | 主路径（`Item:Length` 格式）；同时是"只转封装后 > 10MB"的真实样本 |
| `IMG_3000.jpg` | `IMG20260516172228.jpg` 改名 | 上传失败 |
| `MVIMG_0002.jpg` | 旧版 `MicroVideoOffset` 格式；夹具脚本用 OPPO 样本的静态图 + 副视频拼成 | 安卓旧格式（等价类） |
| `IMG_4000.jpg` | 夹具脚本拼成：OPPO 样本的静态图 + 副视频（HEVC，只转封装后 ≤ 10MB），`Item:Length` 格式 | 不支持 H.264 时保留 HEVC |
| `IMG_2100.jpg` | 夹具脚本拼成：静态图 + 无音轨的 H.264 mp4，用 `free` box 填充到恰好 10,485,760 B（已是 H.264，原样使用） | 上边界（接受） |
| `IMG_2101.jpg` | 同上，视频 10,485,761 B | 上边界 +1 |
| `a.png`、`b.jpg` | 普通图片（`b.jpg` 不含 Motion Photo XMP） | 混合批次；处理中占位；普通 JPEG 不误识别 |
| `fake.mp4` | 改名的 HTML（`<script>`） | 魔数伪造 |

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | 优先级 |
|-------|--------|------|------|--------|
| TC-US11-01 | SC-LIVE-01 | 拖入 OPPO 动态照片，插入一条 `#live` 引用 | e2e | P0 |
| TC-US11-02 | SC-LIVE-01 | 上传结果：R2 中有 jpg 和 `.live.mp4`，key 格式与宽高、主色正确 | api | P0 |
| TC-US11-03 | — | ~~Chromium 拖入单张 HEIC，上传的是 JPEG~~（已删除，2026-10-15） | — | — |
| TC-US11-04 | — | ~~WebKit 原生解码 HEIC，结果与 Chromium 一致~~（已删除，2026-10-15） | — | — |
| TC-US11-05 | SC-LIVE-03 | Motion Photo（`Item:Length`）切出视频，静态图不含视频字节 | e2e | P0 |
| TC-US11-06 | SC-LIVE-03 | 等价类：旧版 MicroVideoOffset 格式；普通 JPEG 不误识别 | e2e | P2 |
| TC-US11-07 | SC-LIVE-04 | 混合批次按顺序插入，只有动态照片带 `#live` | e2e | P1 |
| TC-US11-08 | — | ~~错误猜测：文件名大小写不同仍然配对~~（已删除，2026-10-15） | — | — |
| TC-US11-09 | SC-LIVE-06 | 视频只转封装后 16.4MB，退回普通图片并提示 | e2e | P0 |
| TC-US11-10 | SC-LIVE-06 | 边界：视频恰好 10MB 接受 / 10MB+1 退回 | e2e | P1 |
| TC-US11-11 | SC-LIVE-06 | 绕过前端直接上传 > 10MB 视频，服务端拒绝 | api | P0 |
| TC-US11-12 | — | ~~只拖入视频，不上传并提示~~（已删除，2026-10-15） | — | — |
| TC-US11-13 | SC-LIVE-01 | 绕过前端只上传视频字段，服务端拒绝 | api | P1 |
| TC-US11-14 | SC-LIVE-08 | 上传请求失败，图片和视频都不保留 | e2e | P0 |
| TC-US11-15 | SC-LIVE-08 | 服务端写视频失败时回滚已写入的图片 | api | P1 |
| TC-US11-16 | SC-LIVE-09 | 不支持 H.264 编码，保留 HEVC 并提示 | e2e | P1 |
| TC-US11-17 | SC-LIVE-12 | "插入图片"选择动态照片，同样识别 | e2e | P1 |
| TC-US11-18 | — | ~~损坏的 HEIC：提示并且不上传~~（已删除，2026-10-15） | — | — |
| TC-US11-19 | SC-LIVE-01, SC-LIVE-08 | 安全：伪造视频魔数、未登录、跨站 Origin | security | P0 |
| TC-US11-20 | SC-LIVE-01 | 安全：客户端伪造宽高或主色参数，服务端校验 | security | P1 |
| TC-US11-21 | SC-LIVE-01 | 性能：实况照片从拖入到插入引用 < 15s（首次加载组件） | performance | P2 |
| TC-US11-22 | SC-LIVE-05 | 占位依次显示"处理中…"→"上传中…"，预览占位块，请求带主色与宽高 | ui-interaction | P0 |
| TC-US11-23 | SC-LIVE-10 | 预览中桌面悬停播放、移出复原 | ui-interaction | P0 |
| TC-US11-24 | SC-LIVE-10 | 手机长按播放、松手复原，不弹系统菜单 | ui-interaction | P1 |
| TC-US11-25 | SC-LIVE-11 | 视频无法解码：只显示静态图，隐藏 LIVE | ui-interaction | P1 |

---

## TC-US11-01: 拖入 OPPO 动态照片，插入一条 `#live` 引用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-01 |
| covers | SC-LIVE-01 |
| Scenario | 安卓动态照片拖入 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（`DataTransfer` 中放入一个 `File`） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**前置条件：**
- 【数据前置】草稿正文三行：`行1` / `行2` / `行3`
- 【环境前置】chromium（`channel: "chromium"`）；已登录

**测试数据：** `IMG20260516172228.jpg`

**步骤：**
1. 打开写文章页，光标放在 `行3` 行尾，然后回车
2. 在源码区派发 drop 事件，载荷为该文件
3. 等待上传响应

**预期结果：**
- 上传请求发起 1 次（一个 multipart 请求同时含图片和视频）
- 源码第 4 行匹配 `^!\[IMG20260516172228\]\(/img/\d{4}/\d{2}/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.jpg#live\)$`，宽高与静态图一致
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



## TC-US11-05: Motion Photo（`Item:Length`）切出视频，静态图不含视频字节

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-05 |
| covers | SC-LIVE-03 |
| Scenario | 从 JPEG 内嵌视频中切出 mp4（OPPO：主视频后还有副视频与私有尾部，按 box 截到主视频 `mdat` 结束） |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 样本由 Pixel 改为 OPPO（drop-apple-live-photo） |

**前置条件：** 【环境前置】chromium（`channel: "chromium"`）；已登录；空正文草稿

**测试数据：** `IMG20260516172228.jpg`（Pixel 的 `PXL_*.MP.jpg` 同属这一格式）

**步骤：**
1. 拖入文件
2. 拦截上传请求

**预期结果：**
- 请求中有 `video` 字段，第 4–8 个字节是 `ftyp`
- `file` 部分只包含静态图：其长度等于主视频在原文件中的起点偏移（不含主视频、副视频与私有尾部）
- 源码中的引用带 `#live`；alt 为 `IMG20260516172228`

**清理：** 删除 R2 对象和草稿

---

## TC-US11-06: 等价类——旧版 MicroVideoOffset 格式；普通 JPEG 不误识别

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-06 |
| covers | SC-LIVE-03 |
| Scenario | 旧格式动态照片；没有 Motion Photo XMP 的 JPEG |
| Priority | P2 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 补充普通 JPEG 不误识别（drop-apple-live-photo） |

**测试数据：** `MVIMG_0002.jpg`、`b.jpg`

**步骤：** 同 TC-US11-05，分两次拖入

**预期结果：**
- `MVIMG_0002`：引用带 `#live`；视频字段第 4–8 个字节是 `ftyp`
- `b`：请求不含 `video` 字段，引用不带 `#live`

**清理：** 同上

---

## TC-US11-07: 混合批次按顺序插入，只有动态照片带 `#live`

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-07 |
| covers | SC-LIVE-04 |
| Scenario | 普通图片与动态照片混在一批 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**前置条件：** 【环境前置】chromium；上传接口通过 `route` 让 `a.png` 最慢返回（延迟 2s）

**测试数据：** `a.png`、`IMG20260516172228.jpg`、`b.jpg`（按这个顺序放进 `DataTransfer`）

**步骤：** 拖入，等待全部完成

**预期结果：**
- 源码按 `a` → `IMG20260516172228` → `b` 的顺序共 3 行
- 只有 `IMG20260516172228` 那一行带 `#live`
- 上传请求共 3 次

**清理：** 同上

---


## TC-US11-09: 视频只转封装后 16.4MB，退回普通图片并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-09 |
| covers | SC-LIVE-06 |
| Scenario | 视频超限时降级（真实样本：不支持 H.264 时只转封装，结果 16,389,677 B，见 ADR-006"验证结果"） |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**前置条件：** 【环境前置】chromium；`addInitScript` 让 `VideoEncoder.isConfigSupported` 返回 `{ supported: false }`；空正文草稿

**测试数据：** `IMG20260516172228.jpg`

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
| Scenario | 大小上界（内嵌视频已是无音轨的 H.264 mp4，原样使用，大小即内嵌视频大小） |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**测试数据：** `IMG_2100.jpg`（内嵌视频 10,485,760 B）；`IMG_2101.jpg`（内嵌视频 10,485,761 B）

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


## TC-US11-13: 绕过前端只上传视频字段，服务端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-13 |
| covers | SC-LIVE-01 |
| Scenario | 服务端要求视频必须与图片在同一请求中 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 原 covers 的 SC-LIVE-07 已删除，改挂 SC-LIVE-01（drop-apple-live-photo） |

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
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**前置条件：** 【数据前置】正文为 `前文`；【环境前置】`page.route('**/api/admin/images', r => r.abort())`

**测试数据：** `IMG_3000.jpg`（`IMG20260516172228.jpg` 改名）

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

**步骤：** 在 Workers 测试环境（`@cloudflare/vitest-plugin`）中调用上传处理函数

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
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（`addInitScript` 改写 `VideoEncoder.isConfigSupported`） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**测试数据：** `IMG_4000.jpg`（内嵌 HEVC 副视频，只转封装后 ≤ 10MB）

**步骤：** 拖入，拦截上传请求，解析 `video` 中 `stsd` box 的编码标识

**预期结果：**
- 视频是 mp4 容器，编码为 `hvc1` / `hev1`
- 引用带 `#live`
- 提示"该实况视频在部分浏览器中只显示静态图"

**清理：** 同上

---

## TC-US11-17: "插入图片"选择动态照片，同样识别

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-17 |
| covers | SC-LIVE-12 |
| Scenario | 通过文件选择器选择 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（`setInputFiles`） |
| type | e2e |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**前置条件：** 【环境前置】文件选择框 `accept` 与 US-05 相同（png、jpg、webp、gif），不含 heic / mov / mp4

**测试数据：** `IMG20260516172228.jpg`

**步骤：** 点击"插入图片"，然后 `setInputFiles`

**预期结果：** 只插入一条带 `#live` 的引用

**清理：** 同上

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
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（只做记录性断言，CI 中阈值放宽到 2 倍） |
| type | performance |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用安卓动态照片（drop-apple-live-photo） |

**步骤：** 用全新 context 拖入 `IMG20260516172228.jpg`，测量从 drop 到源码出现 `#live` 引用的时间（含加载 `mediabunny`、切视频、4K → 1920 转码；spike 中首次处理 ≈ 6.3s）

**预期结果：** 首次 < 15s；同一页面第二次 < 8s

**清理：** 同上

---

## UI 交互测试

### TC-US11-22: 占位依次显示"处理中…"→"上传中…"，预览占位块，请求带主色与宽高

| 字段 | 值 |
|------|------|
| TC-ID | TC-US11-22 |
| covers | SC-LIVE-05 |
| Scenario | 处理阶段可见（普通图片计算主色；动态照片的切视频 / 转码走同一占位阶段） |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建；2026-10-15 v1.1 改用普通 JPEG 观察处理阶段，补充主色与宽高断言（drop-apple-live-photo） |

**前置条件：** 【环境前置】`addInitScript` 让 `createImageBitmap` 延迟 1.5s 返回；上传请求延迟 2s

**步骤：** 拖入 `b.jpg`，依次观察源码、预览和上传请求

**预期结果：**
- 源码先出现 `处理中…` 占位，之后变为 `上传中…`，最后替换为引用
- 上传中时预览对应位置显示"图片上传中… b"
- 上传请求带 `width`、`height`（与图片一致）和 `rgb`（6 位小写 hex，不是缺省的 `808080`）；返回的 key 中主色与 `rgb` 一致

**playwright_hint：**
```ts
await page.addInitScript(() => { const o = window.createImageBitmap; window.createImageBitmap = (...a) => new Promise(f => setTimeout(() => f(o(...a)), 1500)); });
await page.route('**/api/admin/images', async r => { await new Promise(f => setTimeout(f, 2000)); await r.continue(); });
await expect(editor).toHaveValue(/处理中…/);
await expect(editor).toHaveValue(/上传中…/);
await expect(preview.getByText('图片上传中… b')).toBeVisible();
await expect(editor).toHaveValue(/!\[b\]\(\/img\/.+_[0-9a-f]{6}\.jpg\)/, { timeout: 20000 });
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

**前置条件：** 【数据前置】R2 夹具 `kkkkkkkkkk_960x1280_6b7f8e.jpg`，同名 `.live.mp4` 为损坏字节（WebKit 的媒体请求不经过 `page.route`，不能用路由模拟；2026-10-15 改）

**步骤：** 打开带 `#live` 引用的草稿，悬停图片

**预期结果：** 加载完成后先显示 `[data-live-badge]`（视频 `preload="none"`，首次播放时才知道失败）；悬停后 LIVE 消失、不显示 `video`；静态图正常显示

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
| SC-LIVE-01 | BH-01 安卓动态照片插入 `#live` 引用 | TC-US11-01, 02, 13, 19, 20, 21 |
| SC-LIVE-02 | ~~BH-02 单张 HEIC~~（已删除） | — |
| SC-LIVE-03 | BH-03 两种 XMP 格式识别 | TC-US11-05, 06 |
| SC-LIVE-04 | BH-04 混合批次 | TC-US11-07 |
| SC-LIVE-05 | BH-05 处理中 / 上传中占位 | TC-US11-22 |
| SC-LIVE-06 | BH-06 视频超过 10MB | TC-US11-09, 10, 11 |
| SC-LIVE-07 | ~~BH-07 只有视频~~（已删除） | — |
| SC-LIVE-08 | BH-08 任一失败都不保留 | TC-US11-14, 15, 19 |
| SC-LIVE-09 | BH-09 不支持 H.264 | TC-US11-16 |
| SC-LIVE-10 | BH-10 悬停 / 长按播放 | TC-US11-23, 24 |
| SC-LIVE-11 | BH-11 播放失败降级 | TC-US11-25 |
| SC-LIVE-12 | BH-12 插入图片选择动态照片 | TC-US11-17 |
| SC-LIVE-13 | ~~BH-13 HEIC 无法解码~~（已删除） | — |

| 验收标准（story.md §2） | TC-IDs |
|------------------------|--------|
| AC1 安卓动态照片 | TC-US11-01, 02, 23 |
| AC2 ~~单张 HEIC~~（已删除） | — |
| AC3 两种 XMP 格式 / 普通 JPEG 不误识别 | TC-US11-05, 06 |
| AC4 处理中占位 | TC-US11-22 |
| AC5 视频 > 10MB | TC-US11-09, 10, 11 |
| AC6 ~~只有视频~~（已删除） | — |
| AC7 任一失败 | TC-US11-14, 15 |
| AC8 不支持 H.264 | TC-US11-16, 25 |
| NFR §2.2 魔数、登录、CSRF | TC-US11-13, 19, 20 |

**Gap 检查**：behaviors.md 现有 SC-LIVE-01 ~ SC-LIVE-13 中 10 个有效 SC-ID（02、07、13 已删除），每个都至少有 1 个 TC 覆盖。

**Gap: 无**

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-12 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-15 | v1.1 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../../backlog/drop-apple-live-photo.md)）：TC-US11-03、04、08、12、18 删除；01、05、06、07、09、10、14、16、17、21、22 改用动态照片样本，13 改挂 SC-LIVE-01；夹具改为 OPPO 样本及其派生 | miraclehifi |
