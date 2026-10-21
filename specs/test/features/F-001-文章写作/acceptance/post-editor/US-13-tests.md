# US-13 插入 Afilmory 照片 验收测试

**US ID**: US-13
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/behaviors.md)
**最后更新**: 2026-10-19
**Version Tag**: v1.0

> 写法规则以 [ADR-010](../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md) 为准。纯函数（分享代码识别、片段解析、Markdown 生成、清单解析）在单元层用矩阵覆盖（[frontend-unit-tests.md](../../unit/frontend-unit-tests.md) §17、media domain-model 单元测试），本文件只放需要浏览器 / Worker 参与的行为与代表性断言。

---

## 测试数据策略

| 类别 | 策略 |
|------|------|
| 外部网络 | E2E 与集成测试都**不访问**真实 Afilmory / GitHub：E2E 用 `page.route` 打桩照片信息接口与 `https://raw.githubusercontent.com/miraclehifi/photo-assets/main/**`（按 `Range` 头返回 206 切片）；集成测试替换 `fetch` |
| 照片夹具 | `tests/fixtures/afilmory/`：照片页 HTML（内嵌 v10 清单，含 18369 动态照片、18382 普通照片、子目录照片 `手办/wf2026/23473`）；原图用已有动态照片夹具（JPEG 内嵌 mp4）与普通 JPEG；缩略图为小尺寸 JPEG |
| 视频编码 | Playwright 自带 Chromium 不能解码 HEVC → 验证"退回静态图"；WebKit（Windows）`canPlayType('…hvc1')` 为 probably → 验证播放（夹具视频为 H.264 时以 `canPlayType` 打桩为准，只验证读取字节范围与播放流程） |
| 测试文章 | 通过 API 新建草稿，标题前缀 `[E2E-US13]`；读者页用 reader 构建夹具的 filler-23（正文改为 Afilmory 照片，不新增文章以免影响按篇数断言的用例；构建产物检查同用）。照片存储打桩：`live.jpg` 为 jjjjjjjjjj 静态图后接其 H.264 视频的合成动态照片（`mp=21119+81755`） |

以下 `RAW(x)` = `https://raw.githubusercontent.com/miraclehifi/photo-assets/main/x`，`EMBED(id)` = 单张分享代码，`EMBEDS(a,b,c)` = 多张分享代码。

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | 优先级 |
|-------|--------|------|------|--------|
| TC-US13-01 | SC-AFIL-01 | 粘贴单张分享代码：占位 → 卡片 → 照片引用；可撤销 | e2e | P0 |
| TC-US13-02 | SC-AFIL-01 | 粘贴照片页链接，结果同分享代码 | e2e | P1 |
| TC-US13-03 | SC-AFIL-02 | 粘贴多张分享代码：每张一行、顺序一致、成为网格 | e2e | P0 |
| TC-US13-04 | SC-AFIL-03 | 按标签分享代码：源码不变、提示 | e2e | P1 |
| TC-US13-05 | SC-AFIL-04 | 其他站点代码、非照片页网址、夹带文字：普通文本粘贴、不请求接口 | e2e | P1 |
| TC-US13-06 | SC-AFIL-05 | 接口 502 / 404：失败卡片原因；重试成功；移除删行 | e2e | P0 |
| TC-US13-07 | SC-AFIL-06 | 动态照片：实况开关开 → 带 live；关 → 不带，图片菜单可勾选 | e2e | P0 |
| TC-US13-08 | SC-AFIL-08, SC-AFIL-12 | 预览：预留比例、先缩略图、进入视口按字节范围换主图；主图失败保留缩略图 | e2e | P0 |
| TC-US13-09 | SC-AFIL-08, SC-AFIL-09 | 读者页：网格主色、灯箱显示主图且不重复请求 | e2e | P0 |
| TC-US13-10 | SC-AFIL-10 | 实况：不支持 HEVC（Chromium）退回静态图、无 LIVE 标记 | e2e | P0 |
| TC-US13-11 | SC-AFIL-10 | 实况：支持 HEVC（WebKit）悬停时读取视频字节范围并播放 | e2e | P1 |
| TC-US13-12 | SC-AFIL-11 | 构建产物：Afilmory 照片输出缩略图 img 与 data-thumb / data-mp；未登记前缀不解析 | build | P0 |
| TC-US13-13 | SC-AFIL-13 | 照片信息接口：401、400 非法 id、200 返回结构、404 / 502 映射、只请求登记站点 | integration | P0 |
| TC-US13-14 | SC-AFIL-07 | 缩略图不符合约定：按普通外链插入并提示 | unit | P1 |

---

## TC-US13-01: 粘贴单张分享代码

**前置**：新建草稿，源码 `第一行\n第二行`，光标在第一行行尾；实况开关关闭；接口打桩 18382 → `{ url: RAW(18382.jpg), width: 3068, height: 4096, rgb: "17a0b0", thumbnail: RAW(.afilmory/thumbnails/18382.jpg) }`，延迟 1s 返回

**步骤**：剪贴板写入 `EMBED(18382)` 并粘贴；等待替换；按 ⌘Z / Ctrl+Z

**预期**：
- 粘贴后立即出现 `![处理中…]()`，预览中有 1 张进度卡片
- 返回后源码为 `第一行![](RAW(18382.jpg)#ext=3068x4096x17a0b0)\n第二行`，卡片消失，预览出现图片
- 只请求了一次 `/api/admin/afilmory/photos/18382`
- 撤销后回到 `第一行![处理中…]()\n第二行` 之前的步骤可继续撤销到原文

## TC-US13-02: 粘贴照片页链接

**步骤**：粘贴 `  https://miraclehalcyon.afilmory.art/photos/18382\n`

**预期**：与 TC-US13-01 相同的引用

## TC-US13-03: 粘贴多张分享代码

**前置**：打桩 23473（子目录 `手办/wf2026/23473.jpg`）、23514、18382，返回延迟分别为 900 / 100 / 500ms

**步骤**：粘贴 `EMBEDS(23473, 23514 ,18382)`

**预期**：
- 立即插入 3 行占位（`\n` 分隔，无空行），预览 3 张卡片
- 全部完成后 3 行依次为 23473、23514、18382 的引用；23473 的地址为 `RAW(%E6%89%8B%E5%8A%9E/wf2026/23473.jpg)`
- 预览中为 `[data-image-gallery="grid"]`，3 个单元格

## TC-US13-04: 按标签分享代码

**步骤**：粘贴 `data-afilmory-tag="手办"` 的分享代码

**预期**：源码不变；Toast "按标签分享的代码不能插入，请改用单张或多张分享"；未请求照片信息接口

## TC-US13-05: 普通文本粘贴

**步骤**：依次粘贴：src 为 `https://other.afilmory.art/share/embed.js` 的单张代码；`https://miraclehalcyon.afilmory.art/`；`https://example.com/photos/18382`；`看这张：` + `EMBED(18382)`

**预期**：每次源码中插入的是原文本；无卡片；未请求照片信息接口

## TC-US13-06: 失败、重试、移除

**前置**：打桩第一次 18382 返回 502 `{ error: { code: "UPSTREAM_UNAVAILABLE", message: "Afilmory 暂时无法访问" } }`，第二次返回 200；另一张 99999 返回 404 `NOT_FOUND`"Afilmory 中没有这张照片"

**步骤**：粘贴 18382；看到失败卡片后点"重试"；再粘贴 99999，点"移除"

**预期**：
- 18382 占位变为 `![上传失败]()`，卡片红框显示"Afilmory 暂时无法访问"；重试后占位回到"处理中…"，再替换为照片引用
- 99999 卡片显示"Afilmory 中没有这张照片"；移除后该行占位被删掉

## TC-US13-07: 动态照片与实况开关

**前置**：打桩 18369 → `video: { offset: 3337665, size: 14749941 }`

**步骤**：开关开启时粘贴 18369；关闭开关后再粘贴一次；打开第二张的图片菜单，勾选"实况"

**预期**：
- 第一张片段 `#ext=3072x4096x{rgb},mp=3337665+14749941,live`
- 第二张片段不含 `live`；菜单有"实况"项且未勾选；勾选后片段变为 `…,mp=3337665+14749941,live`
- 18382（无 mp）的图片菜单没有"实况"项

## TC-US13-08: 预览显示与主图替换

**前置**：正文 `![](RAW(18369.jpg)#ext=3072x4096x8a7b6c,mp={夹具偏移}+{夹具视频长度} "图注")`，前面放足够多段落使图片初始在视口外；raw 打桩记录请求的 `Range` 头

**步骤**：打开预览（不滚动），检查后滚动到图片；再把主图请求改为 500，刷新重复

**预期**：
- 首屏 `img` 地址为 `RAW(.afilmory/thumbnails/18369.jpg)`，容器宽高比 `3072 / 4096`，图注"图注"
- 滚动前没有请求 `18369.jpg`；进入视口后请求一次，`Range: bytes=0-{偏移-1}`；之后 `img` 地址为 `blob:` 开头，`[data-status]` 为 complete（中途不回到加载中）
- 主图请求 500 时 `img` 仍为缩略图，不显示"加载失败"

## TC-US13-09: 读者页网格主色与灯箱

**前置**：reader 夹具 filler-23：一组 3 张 Afilmory 照片（主色各不相同）+ 一张合成动态照片单图 + 一张未登记前缀的伪造外链

**步骤**：打开 `/posts/filler-23`；滚动到单图等待主图替换；点开单图灯箱；在灯箱中切换到网格中未加载的照片

**预期**：
- 网格单元格背景为各自主色
- 灯箱中单图显示的是已读取的主图（`blob:` 地址），没有对 `18369.jpg` 的第二次请求
- 切换到的照片先显示缩略图，读取完成后换成主图

## TC-US13-10: 不支持 HEVC 时退回静态图（Chromium）

**前置**：正文为带 `live` 的 18369；Chromium（`canPlayType('video/mp4; codecs="hvc1"')` 为空）

**步骤**：等待图片加载完成后悬停 1s

**预期**：无 `[data-live-badge]`、无 `video` 元素；没有读取视频字节范围的请求

## TC-US13-11: 支持 HEVC 时播放（WebKit）

**前置**：同上，WebKit

**步骤**：悬停图片

**预期**：
- 加载完成后显示 LIVE 标记；悬停前没有读取视频的请求
- 悬停后请求一次 `Range: bytes={偏移}-{偏移+长度-1}`，`video` 的 `src` 为 `blob:` 开头，开始播放（若夹具无法解码，以 `video` 触发 error 后 LIVE 标记消失为准，见数据策略）
- 2026-10-21 实测：Windows 版 Playwright WebKit 不能播放 `blob:` 地址的视频（NotSupportedError），因此本用例在 WebKit 上断言"悬停读取一次、失败后 LIVE 标记消失、不再重试"；设置 `src` 并播放由 UT-174 覆盖

## TC-US13-12: 构建产物

**步骤**：`npm run test:build` 构建 reader 夹具，检查 `posts/filler-23.html`

**预期**：
- Afilmory 单图 `figure[data-article-image]` 带 `data-src="RAW(18369.jpg)"`、`data-w="3072"`、`data-h="4096"`、`data-rgb`、`data-thumb="RAW(.afilmory/thumbnails/18369.jpg)"`、`data-mp="{偏移}+{长度}"`；`img[src]` 为缩略图且带 `width` / `height`
- 夹具中未登记前缀的 `https://example.com/a.jpg#ext=800x600x112233,mp=10+20,live` 输出普通图片，无上述 `data-*`、无 `data-live`

## TC-US13-13: 照片信息接口（workers 集成测试）

| # | 条件 | 预期 |
|---|------|------|
| 1 | 无会话 | 401 |
| 2 | id 为 `..%2Fx`、`a b`、65 个字符 | 400 `VALIDATION_FAILED`，未发起外部请求 |
| 3 | 上游返回夹具页，id 18369 | 200 `{ url, width: 3072, height: 4096, rgb: /^[0-9a-f]{6}$/, thumbnail, video: { offset: 3337665, size: 14749941 } }`；外部请求地址恰为 `{登记站点}/photos/18369`，`redirect: "manual"` |
| 4 | id 18382 | 无 `video` 字段 |
| 5 | 清单中无此 id | 404 `NOT_FOUND` |
| 6 | 上游 500 / 网络错误 / 页面无清单 / 清单 JSON 损坏 / 版本不是 v10 结构（缺 data） | 502 `UPSTREAM_UNAVAILABLE` |
| 7 | 上游 3xx 重定向 | 502，不跟随 |

## TC-US13-14: 缩略图不符合约定

单元测试 `afilmoryMarkdown`：`thumbnail` 不等于推导地址、或 `url` 不在存储前缀下 → 返回 `![](url)` 且 `warning` 为"这张照片的存储位置不符合约定，已按普通外链插入"。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-19 | 1.0 | 初始版本 | miraclehifi |
