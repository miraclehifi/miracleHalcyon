# ADR-010: Afilmory 外链照片——登记前缀下的扩展片段

## 状态
Accepted（2026-10-19）。补充 [ADR-005](ADR-005-self-describing-image-markdown.md)：本站图片的写法不变，新增"登记过的外链存储"一类图片。

## 背景
作者的摄影作品放在 Afilmory（`miraclehalcyon.afilmory.art`），原图在 GitHub 仓库 `miraclehifi/photo-assets`。希望粘贴 Afilmory 分享代码就能插入照片，图片不转存 R2，读者端效果与本站图片一致（宽高比、主色、灯箱、组图、实况）。ADR-005 的宽高、主色来自本站文件名，外链图片没有这些信息；实况视频地址也是按本站命名推导的。方案比较与作者决定见 [Backlog](../../../../../backlog/afilmory-photo-embed.md)"备注"。

2026-10-19 核实：Afilmory 照片页内嵌整本相册的清单 `window.__MANIFEST__`（v10）；照片可在子目录（`手办/wf2026/23473.jpg`），缩略图统一在仓库根目录 `.afilmory/thumbnails/{id}.jpg`；GitHub raw 支持 `Range`（206）、`Access-Control-Allow-Origin: *`，OPTIONS 预检返回 403，但 Chromium、WebKit 对单段 `Range` 跨域 `fetch` 不发预检（Range 属于安全请求头），实测均可读取。

## 决策

1. **写法**：仍是合法 GFM 图片，扩展信息放在 URL 片段，与现有标记用 `,` 并列：

   ```markdown
   ![](https://raw.githubusercontent.com/miraclehifi/photo-assets/main/18369.jpg#ext=3072x4096x8a7b6c,mp=3337665+14749941,live "图注")
   ```

   | 片段 | 格式 | 含义 |
   |------|------|------|
   | `ext=` | `{w}x{h}x{rrggbb}`，宽高 1–20000 | 预留比例、组图主色 |
   | `mp=` | `{offset}+{size}`，正整数 | 动态照片内嵌视频在原图中的字节范围；主图 = `0…offset-1` |
   | `live` / `wide` / `accordion` | 不变 | `live` 只在有合法 `mp=` 时生效 |

   `parseMarks` 原本就忽略不认识的片段，旧解析对新写法兼容。

2. **登记前缀**：`src/config/site.ts` 的 `afilmory: { site, storage }` 登记 Afilmory 站点与照片存储前缀（以 `/` 结尾）。只有 `src` 以 `storage` 开头的图片才解析 `ext=` / `mp=`，否则按普通外链（不输出尺寸、主色、视频）。防止构造 `mp=` 让读者页对任意地址发 Range 请求、或把任意地址当作"本站认证过的照片"展示。

3. **缩略图**：按规则推导 `{storage}.afilmory/thumbnails/{文件名去扩展名}.jpg`，不写进 Markdown。粘贴时与清单 `thumbnailUrl` 核对，不符（或原图不在前缀下）则插入不带扩展片段的普通外链并提示。

4. **照片信息接口**：`GET /api/admin/afilmory/photos/{id}`（需登录，middleware 已覆盖 `/api/admin`）。服务端只请求 `{site}/photos/{id}`（`redirect: "manual"`，不跟随），解析清单取该 id 的 `originalUrl`、`width`、`height`、`thumbHash`（十六进制，解出平均色）、`thumbnailUrl`、`video`（仅 `type: motion-photo`）。不建表、不写 R2。放在服务端是因为浏览器跨域读不了 Afilmory 页面；只允许登记的一个站点，不能成为任意网址的代理。

5. **渲染输出**（markdown 模块）：登记前缀下的图片 `figure` 额外输出 `data-thumb`（推导的缩略图地址）、`data-mp`（`{offset}+{size}`）；`img` 的 `src` 为缩略图（无 JS、RSS 等也只下载约 300KB），`data-src` 仍是原图地址。

6. **客户端加载**（`ArticleImage`、组图单元格、灯箱共用一个按 URL 缓存的读取模块）：
   - 首屏显示缩略图；进入视口（`IntersectionObserver`，`rootMargin` 200px）后读取主图：有 `mp` 时 `fetch` 加 `Range: bytes=0-{offset-1}`，否则直接用原图地址预加载；成功后换成主图（`blob:` 地址或原图），加载状态保持 complete；失败保留缩略图
   - 灯箱用同一缓存，已读过的不再请求
   - 实况：`codec: "hevc"`，按 `canPlayType('video/mp4; codecs="hvc1"')` 判断；首次播放时读取 `Range: bytes={offset}-{offset+size-1}` 作为 `video/mp4` Blob；不支持、读取或播放失败 → 退回静态图（与 US-11 一致）
   - blob URL 在页面会话内保留（同一张图可能在正文与灯箱同时使用）

## 后果

- 正面：一份照片两处用；不占 R2；写法自描述，渲染仍是纯函数、可同构（ADR-001），读者页仍预渲染（ADR-007）；以后加 Worker 缓存代理时只需在渲染插件里改写地址，Markdown 不变。
- 负面：依赖 GitHub raw 可用性（国内常打不开）与 5 分钟缓存；按字节范围读到的主图、视频不进 HTTP 缓存，每次打开页面重新下载（主图约 2–3MB，视频只在播放时下载）；照片在 Afilmory 被删或改名时本站感知不到；HEVC 依赖硬件解码，部分浏览器只有静态图。
- 安全：扩展片段只在登记前缀下生效；`data-*` 由插件在 sanitize 之后生成（白名单值：数字、十六进制、推导出的同前缀地址）；照片信息接口限定站点、id 白名单字符、不跟随重定向。
