# 文章插入 Afilmory 照片（外链存储）

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Feature（F-001 增量） |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-16 |
| 创建者 | miraclehifi |

## 描述

作者的摄影作品在 Afilmory（[miraclehalcyon.afilmory.art](https://miraclehalcyon.afilmory.art)）上，原图存放在 GitHub 仓库 `miraclehifi/photo-assets`。写文章时希望把 Afilmory 的分享代码（或照片页链接）贴进编辑器就能插入照片。**图片不转存，直接使用外链存储**，读者页用本站自己的图片组件显示，灯箱、组图、宽图、实况都能用。

示例输入：

```html
<script async src="https://miraclehalcyon.afilmory.art/share/embed.js" data-afilmory-photo="18369" data-aspect="3072:4096" data-width="100%"></script>
```

## Triage 评估

| 字段 | 值 |
|------|-----|
| 提议类型 | Feature（F-001 增量） |
| 提议优先级 | P2 |
| 确认类型 | Feature（F-001 增量） |
| 确认优先级 | P2 |
| Triage 执行人 | miraclehifi（对话确认） |
| Triage 日期 | 2026-10-16 |

**影响面评估**:
- 影响文件数: 约 10–15（markdown 渲染插件、编辑器粘贴、后台接口、`ArticleImage` / `Lightbox` / 实况播放、`site.ts`）
- 需要改接口/契约: 是（新增后台接口；不改已有接口）
- 有业务逻辑变更: 是（图片地址约定扩展到登记过的外链存储，需新 ADR 补充 ADR-005）
- 需要新测试: 是
- 不能走 SDD-Lite：改动了渲染约定（架构变更）

## 目标与验收

**目标**: 作者在编辑器里粘贴 Afilmory 分享代码或照片页链接后，正文插入对应照片；读者看到的效果与本站上传的图片一致，图片和视频都从外链读取。

**业务价值**: 摄影作品只维护一份（Afilmory + GitHub），写文章时直接引用，不占 R2 空间。

**验收条件**:
- [x] 粘贴 `data-afilmory-photo` 分享代码或照片页链接 `https://miraclehalcyon.afilmory.art/photos/{id}` → 先显示"处理中…"占位，成功后换成图片 Markdown；粘贴 `data-afilmory-photos="a,b,c"` → 每行一张插入，自动成为组图
- [x] 粘贴 `data-afilmory-tag` 分享代码 → 不插入，提示改用单张或多张；其他域名的分享代码按普通文本粘贴
- [x] Afilmory 打不开、照片不存在 → 显示"上传失败"卡片并说明原因
- [x] 正文按原图宽高预留比例，先显示缩略图，进入视口后换成原图的主图部分；组图有主色；灯箱显示主图
- [x] 动态照片带 `#live` 时：浏览器能播放 HEVC → 和本站实况一样播放；不支持或播放出错 → 退回静态图，不显示实况标识
- [x] 只有 `site.ts` 里登记过的外链前缀才解析宽高、主色、视频；其他外链仍按普通外链图片显示
- [x] 放到其他 Markdown 阅读器里，退化为普通图片（原图地址）

## 完成与知识吸收（2026-10-21）

已发布：版本 cddbd7ac（提交 c098a7f）。知识去向：写法与加载策略 → [ADR-010](../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)；接口 → media api-contract / domain-model §10；渲染规则 → markdown module-spec §3；读者端加载 → reader module-spec §4.2；粘贴与任务 → editor / media-upload module-spec；行为与验收 → US-13 behaviors、US-13-tests；测试环境限制（Playwright WebKit 不能播 blob 视频、Chrome 的 HEVC 判断需带 profile）→ sprint-8-task-results、code-review"增量审查"。上线后待办：在 Safari（iPhone / Mac）看一次外链实况；"后续：Worker 缓存代理"仍为备注，未立条目。

## SDD 产出（2026-10-19）

| 阶段 | 产出 |
|------|------|
| Story / Behavior | [US-13](../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) |
| 验收 | [US-13-tests](../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)、[frontend-unit-tests §17](../test/features/F-001-文章写作/unit/frontend-unit-tests.md) |
| UI | admin-post-editor"粘贴 Afilmory 照片"、components.md（`UploadCard` `fetching`、`ArticleImage` `external`）、reader-post-detail；无新组件 |
| 架构 | [ADR-010](../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)、feature-architecture §3.2 / §4.2 / §5.3 / §8.1 |
| 领域 | media api-contract / domain-model §10；markdown、reader、editor、media-upload module-spec |
| 任务 | [Sprint 8](../tasks/sprint-8/_index.md) |

2026-10-19 复核修正：照片可在子目录（`手办/wf2026/23473.jpg`），缩略图统一在仓库根目录 `.afilmory/thumbnails/{id}.jpg`（不是"同目录"）；GitHub raw 的 OPTIONS 预检返回 403，但单段 `Range` 属于安全请求头，Chromium / WebKit 跨域读取不发预检、实测 206。

## 方案（2026-10-16 对话确定）

### Markdown 写法

```markdown
![](https://raw.githubusercontent.com/miraclehifi/photo-assets/main/18369.jpg#ext=3072x4096x8a7b6c,mp=3337665+14749941,live "图注")
```

| 片段 | 含义 | 来源 |
|------|------|------|
| `ext=宽x高x主色` | 预留比例、组图主色 | 清单的 `width` / `height`；主色从 `thumbHash` 解出平均色 |
| `mp=偏移+长度` | 动态照片的内嵌视频在原图里的字节范围 | 清单的 `video.offset` / `video.size` |
| `live` / `wide` / `accordion` | 现有标记，照常可用 | 作者手写或用预览图片菜单（US-12） |

- 现有标记解析会忽略不认识的片段，与 ADR-005 兼容
- 缩略图地址按规则推导：`{存储前缀}.afilmory/thumbnails/{文件名去扩展名}.jpg`（2026-10-19 修正），粘贴时用清单核对
- 地址前缀白名单放在 `src/config/site.ts`，防止构造 `mp=` 让读者页去读任意地址

### 数据来源

Afilmory 照片页 HTML 内嵌整个相册的清单 `window.__MANIFEST__`（version v10），每张照片有 `originalUrl`、`thumbnailUrl`、`width`、`height`、`thumbHash`、`isHDR`、`video`（`type: motion-photo`、`offset`、`size`）、EXIF。新增后台接口 `GET /api/admin/afilmory/photos/{id}`（需要登录），由服务端抓照片页、解析清单，返回 `{ url, width, height, rgb, video? }`。放在服务端是因为浏览器跨域读不了 afilmory.art 的页面；只允许配置里登记的那一个 Afilmory 站点地址，避免成为任意网址的代理。

### 读者页加载

| 位置 | 加载内容 | 大小（18369） |
|------|---------|--------------|
| 正文首屏 | 600×800 缩略图 | 约 300KB |
| 正文进入视口后 | 按字节范围取原图主图部分（`0` 到 `mp` 偏移），转成本地地址替换缩略图 | 约 3.3MB |
| 灯箱 | 同上，已加载过就复用 | — |
| 实况播放 | 点开时按字节范围取 `mp` 那一段，转成本地地址交给 `<video>` | 约 14.7MB |
| 非动态照片 | 主图就是原图 | 例如 18382 约 1.9MB |

播放前用 `canPlayType('video/mp4; codecs="hvc1"')` 判断，不支持就退回静态图。退回规则与 US-11 一致。

### 已验证的事实（2026-10-16）

| 项 | 结果 |
|----|------|
| GitHub raw 响应头 | `Cache-Control: max-age=300`、`ETag`（条件请求回 304）、`Accept-Ranges: bytes`、`Access-Control-Allow-Origin: *`、`Content-Type: application/octet-stream` |
| 按字节范围取视频 | 206；标准 MP4（`ftyp mp42`，`moov` 在文件开头），**HEVC（hvc1）+ AAC** |
| 按字节范围取主图 | `0–3337664` 是完整 JPEG（`FFD8…FFD9`），含 Ultra HDR 增益图 |
| 缩略图 | 600×800 JPEG |
| embed.js | 只做一件事：插入 `/share/iframe?id=…`，`sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`，通过 `postMessage`（`afilmory:resize`）调整高度；iframe 页面允许被其他站点嵌入 |

## 影响分析

- **影响范围**: markdown 模块（解析 `ext` / `mp`，按白名单输出 `data-w` / `data-h` / `data-rgb` / `data-thumb` / `data-mp`）；编辑器粘贴识别与上传占位；media 领域新增后台接口（不建表、不写 R2）；`ArticleImage` / `Lightbox` / 实况播放支持按字节范围读外链；`site.ts` 新增外链存储配置；新 ADR 补充 ADR-005
- **依赖项**: [media-upload-experience](media-upload-experience.md)（Sprint 6：上传占位、US-05 / 11 / 12 读者组件会被同时改到，等它完成后再开始）
- **被依赖**: 无
- **不影响**: R2 / D1；F-006 存储清理（外链不记录、不清理）；封面仍只允许本站图片；读者页预渲染（ADR-007）

## 估算

- **规模**: M
- **预估工时**: 2–3 人天

## 备注

### 作者决定（2026-10-16）

| 事项 | 决定 |
|------|------|
| 存储 | 直接用外链存储（Afilmory / GitHub），图片不转存 R2 |
| 显示方式 | 本站组件引用外链（不用 Afilmory iframe） |
| 实况 | 方案 A：直接播放外链 HEVC，不支持就退回静态图 |
| 正文清晰度 | 进入视口后换成主图 |
| 排期 | Sprint 6 完成后开始 |
| 过渡用法 | 功能上线前，正文手写 GitHub 缩略图地址 `…/.afilmory/thumbnails/{id}.jpg`，按普通外链图片显示；上线后可重新粘贴分享代码换成完整写法 |

### 曾比较过的方案

- **导入转存 R2**：体验最好、不依赖 GitHub，但图片存两份。作者选择外链存储，没有采用
- **Afilmory iframe**：改动最少，原生支持多张 / 按标签、自带实况和 EXIF；但样式不统一，本站灯箱和组图用不了，每个 iframe 都要加载整个 Afilmory 前端。没有采用
- **原样执行 embed.js**：要对正文放开 `<script>`，后台预览和作者登录态在同一页面，风险不可接受；读者页预渲染、预览在 Web Worker 渲染，也执行不了
- **实况转 H.264 存 R2（方案 B）**：兼容性最好（约 2.7MB），但视频要转存。以后如果很多读者播不了，再按 B 补，Markdown 加一个视频地址即可，不影响已有文章

### 风险

- GitHub raw 在国内经常打不开，有访问频率限制。浏览器缓存 5 分钟后每张图要做一次 304 校验，依赖 GitHub CDN 能连上；按字节范围取的结果不容易被浏览器缓存
- 照片在 Afilmory / GitHub 被删或改名，文章里的图会坏，本站感知不到
- HEVC 依赖硬件解码，老设备、部分 Linux、部分 Firefox 播不了（退回静态图）
- 每张图进入视口多 2–3MB 流量；实况 14.7MB，只在点开时下载

### 后续：Worker 缓存代理（另立条目，暂不做）

在 Worker 上加 `/ext/afilmory/{文件}` 代理：服务端从 GitHub 取图，用 Cloudflare 缓存，返回长缓存头，并在服务端按偏移切出主图和视频。读者只连本站，主图和视频都能正常长期缓存。Markdown 写法不变，由渲染插件改写地址，旧文章自动受益。

前提和影响：
- **必须先绑自定义域名**：`*.workers.dev` 上 Cache API 和子请求缓存不生效，而且国内经常被 DNS 污染
- 每次图片请求都会触发一次 Worker（免费版每天 10 万次）；只转发数据，CPU 很少
- Cloudflare 条款限制用 CDN 大量分发视频，转发外部视频属于灰色地带
- 长缓存后，替换同名文件不会很快生效：可在 `ext=` 里加清单 `digest` 前几位作版本号
- 新路由要公开（middleware 不要求登录），加 `nosniff` + `CSP default-src 'none'`，只代理白名单前缀
