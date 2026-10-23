# ADR-011: 书影音领域 `shelf` 与豆瓣链接识别

## 状态
Accepted（2026-10-21，F-005 design-arch；作者偏好文档阶段不逐项确认，待事后审阅）。识别数据源已由 spike 验证（[spike-douban-rexxar](../../../../../tasks/sprint-9/spike-douban-rexxar.md)），见文末"验证结果"。

## 背景
- F-005 需要一个新领域存放书影音条目。现有 `media` 领域指图片与实况视频（F-001 / F-006），不能重名（Backlog"技术风险·命名"）
- 识别要在服务端完成（浏览器跨域拿不到豆瓣数据）。2026-10-19 实测：桌面站 `movie.douban.com` 有人机验证挑战页；移动端 Rexxar 接口 `m.douban.com/rexxar/api/v2/...` 带 `Referer: https://m.douban.com/` 可稳定返回 JSON；豆瓣图片 CDN 对外站引用和 `no-referrer` 都返回 418
- 识别是 SSRF 入口（服务端按用户输入发请求），需要白名单
- 录入表单要显示封面预览，但浏览器直接加载豆瓣封面会 418

## 决策

### 1. 领域命名与边界
- 新领域 **`shelf`**（书架），聚合根 `ShelfEntry`；代码 `src/domains/shelf/`；D1 表 `shelf_entries`；接口前缀 `/api/admin/shelf/*`（写）与 `/api/shelf`（构建读）
- 界面与组件沿用"书影音 / Media*"命名（`/media`、`/admin/media`、`MediaRow`、`MediaEntryRow`），领域名只出现在代码与接口路径中；对应关系写进 domain-model
- `shelf` 不依赖 `media`、`post`；封面的 R2 存取在 `shelf` 内自带一个小的 `CoverStore`（共用 R2 绑定 `MEDIA`，key 前缀 `covers/`），不写 `images` 表

### 2. 豆瓣识别：`shelf` 内的防腐层 `douban/`
`src/domains/shelf/douban/` 把豆瓣数据翻译成 `RecognizedFields`，`shelf` 其余部分不认识豆瓣字段：

| 步骤 | 规则 |
|------|------|
| 提取 | 纯函数 `extractDoubanLink(text)`：正则取第一个 http(s) 链接，主机须在白名单；条目链接直接解析出 `{ kind, id }`（`book.douban.com/subject/{id}`、`movie.douban.com/subject/{id}`、`m.douban.com/{book|movie|game}/subject/{id}`、`www.douban.com/game/{id}`、App 分享的 `www.douban.com/doubanapp/dispatch/{book|movie|game}/{id}`） |
| 白名单 | 主机 = `douban.com` 或以 `.douban.com` 结尾；图片主机以 `.doubanio.com` 结尾。用 `URL` 解析后比较 `hostname`，拒绝带 userinfo、非 443/80 端口、IP 字面量 |
| 不跟随跳转 | App 分享链接即 dispatch 条目链接（2026-10-22 作者确认），不做短链解析；所有外发请求 `redirect: 'manual'`，收到 3xx 视为 `FETCH_FAILED`，因此请求永远停留在白名单主机 |
| 数据源 | Rexxar：`GET https://m.douban.com/rexxar/api/v2/{book|movie|game}/{id}`，请求头 `Referer: https://m.douban.com/`、移动端 UA。电影与剧集都请求 `movie/{id}`，按 `is_tv` 判断是否为剧集；书另并行请求 `book/{id}/tags`（条目接口的 `tags` 为空），标签失败按 book 处理 |
| 映射 | 标题、作者（书，去掉开头国籍括号）/ 导演（影视）/ 开发商（游戏）、年份、封面地址（`cover_url` 优先）、分类推断（漫画：标签含"漫画"；电视剧（含动画剧集）→ `series`，电影（含动画电影）→ `movie`；桌游：`genres` 某项含"桌游"）；缺失字段为 `null` 并列入 `missing`；无标题 → `PARSE_FAILED` |
| 封面 | **识别时**由服务端带 `Referer` 下载封面，按文件头校验 jpg / png / webp、≤ 5 MB，以 `data:` URL 随识别结果返回（`coverData`）；失败时 `coverData: null` 并把"封面"列入 `missing`。表单直接预览，保存时把它作为封面文件随表单提交 |
| 时限 | 整次识别（含标签与封面）共享一个 8 秒 `AbortSignal` |
| 去重 | 识别出 `doubanId` 后先查 `shelf_entries`；已存在（且不是 `excludeId`）→ 返回 `duplicate`，不请求条目数据 |

### 3. 封面在识别时下载，而不是保存时
- 只有识别接口会按用户输入向外发请求，保存接口不接受任何外部 URL（SSRF 面只有一处）
- 表单能预览豆瓣封面（浏览器拿到的是 `data:` URL，不碰豆瓣 CDN）
- 封面下载失败在识别时就以"未识别：封面，可手动上传"告诉作者，保存永远不会因封面失败而降级
- 代价：识别响应多出封面体积（豆瓣大图通常 < 300 KB，base64 后 < 400 KB）

> 这一条改变了 US-02 AC9 的表述（原为"保存时下载，失败提示'封面下载失败，可手动上传'"），已同步 story、behaviors、验收用例与页面规格（见 feature-architecture §8）。

## 后果
- 正面：命名不冲突；豆瓣耦合集中在一个目录，接口改版只改 `douban/`；SSRF 面单一且可测；保存逻辑简单（只收文件）
- 负面：依赖豆瓣非官方接口，随时可能失效——失效时识别报 `FETCH_FAILED` / `PARSE_FAILED`，表单照常手填（需求已接受）；识别响应较大
- 风险：豆瓣接口改版或封禁 Cloudflare 出口——识别降级为手填；`scripts/spike/douban-rexxar.py` 可重新录制夹具排查

## 验证结果（2026-10-21，spike-douban-rexxar）

| # | 假设 | 结果 |
|---|------|------|
| ① | Worker 出口可访问 Rexxar | ✅ 边缘（SIN）全部 200；冷 0.7–4.4 s，热 0.3–2.3 s |
| ② | 书 / 游戏 / 桌游路径与字段 | ✅ `book/{id}`、`game/{id}`；书的标签需 `book/{id}/tags` |
| ③ | 电影 / 剧集区分 | ✅ `movie/{id}` 的 `is_tv` |
| ④ | 漫画、桌游判定 | ✅ 标签"漫画"；`genres` 含"桌游" |
| ⑤ | App 分享链接 | ✅ 为 dispatch 条目链接（作者提供 `dispatch/movie/37501131`），直接解析，不做短链 |
| ⑥ | 封面 | ✅ `cover_url`（`img{n}.doubanio.com`）带 Referer 200，不带 418 |
| ⑦ | 样例识别率 | ✅ 10 / 10 |
