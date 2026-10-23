# ADR-013: 游戏封面用 IGDB 外链与平台字段

## 状态
Accepted（2026-10-23，F-005 增量 [game-case-shelf](../../../../../backlog/game-case-shelf.md)；作者指示"所有图片都用 images.igdb.com"，其余为 AI 设计，按作者偏好文档阶段不逐项确认）

## 背景
- 游戏分类改为与电影相同的海报墙，但作者要求封面**保持原图比例、不裁切**，悬停显示平台（PS5 / PS4 / Switch / Switch 2 / Steam）
- 豆瓣的游戏封面多为带平台条的实体盒照片、分辨率低，不适合；作者实测 IGDB 封面为纯画面、有 1080p 大图，决定**所有游戏封面直接引用 `images.igdb.com` 的大图链接**，不下载到本站、不接 IGDB API
- ADR-011 §3 规定"保存接口不接受外部 URL"（防 SSRF、封面只认上传文件）；ADR-012 §1 规定读者页封面为站内路径。本 ADR 为游戏开一个受限例外
- Masonry 按砖块高度排布，原比例砖块需要在渲染前知道封面宽高；读者页构建时预渲染，不能等图片加载

## 决策

### 1. 条目新增字段（迁移 0005）
| 字段 | 规则 |
|------|------|
| `platform` | `ps5` / `ps4` / `switch` / `switch2` / `steam`；**游戏必填，其他分类为 `null`** |
| `coverUrl` | 仅游戏；IGDB 规范大图地址或 `null` |
| `coverWidth` / `coverHeight` | 与 `coverUrl` 同时有或同时无；保存时读取 |

游戏不再有 R2 封面（`coverKey` 恒为 `null`）；其他分类不变（只有 R2 封面）。

### 2. 链接规范化（纯函数 `normalizeIgdbCoverUrl`，前后端共用）
- 接受 `http(s)://images.igdb.com/igdb/image/upload/t_{尺寸}/{图片ID}.{jpg|jpeg|png|webp}`：主机**完全等于** `images.igdb.com`，无 userinfo、无端口、无查询与片段之外的路径变化；`尺寸` 为 `[a-z0-9_]{1,32}`，`图片ID` 为 `[a-z0-9]{1,32}`；总长 ≤ 2,000
- 一律改写为 `https://images.igdb.com/igdb/image/upload/t_1080p/{图片ID}.jpg`（实测 IGDB 对任意扩展名、尺寸都按请求转码；`t_1080p` 约 810×1080 / 100–200 KB，清晰度与体积平衡）
- 不符 → 400 `VALIDATION_FAILED`（`fields: ["coverUrl"]`）

### 3. 保存时读取宽高（`IgdbImageClient`，只访问 `images.igdb.com`）
- 仅在规范化后的 `coverUrl` 与库中原值**不同**时请求；相同则沿用已存宽高
- `GET` 规范地址：`redirect: 'manual'`（3xx 视为失败）、超时 8 秒、读取至多 65,536 字节即中止；按文件头识别 jpeg / png / webp 并解析宽高（`readImageSize`，纯函数）
- 失败（非 2xx、超时、不是三种格式、头部解析不出宽高）→ 422 `COVER_LINK_UNREACHABLE`"封面链接打不开，请检查后重试"，不写库
- 请求只发往一个固定主机、路径由规范化函数生成，不受用户输入的主机 / 端口 / 跳转影响，SSRF 面与 ADR-011 的豆瓣封面下载同级

### 4. 读者页直接引用外链
- `GET /api/shelf` 的 `cover` 对游戏返回 IGDB 地址，另返回 `platform`、`coverWidth`、`coverHeight`
- 读者页 `<img src>` 为 IGDB 地址、带 `width` / `height`，砖块 `aspect-ratio` 用存储的宽高（无封面 3:4），`object-fit: contain`
- 页面没有 `img-src` CSP，无需改配置；构建产物检查（TC-US03-10）放宽为"站外图片只允许 `images.igdb.com` 且只在游戏页"

### 5. 分类切换与识别
- 保存为游戏时：丢弃上传封面（multipart 带 `cover` 文件 → 400 `BAD_REQUEST`），原 R2 封面在更新成功后删除
- 保存为非游戏时：`platform`、`coverUrl`、宽高置空（请求里带了也忽略）
- 豆瓣识别出游戏时不下载封面（`missing` 含 `cover`）；平台不识别

## 后果
- 正面：游戏封面清晰、比例真实；录入只需粘贴一个链接；不占 R2，不增加 F-006 清理面
- 负面：读者页依赖第三方图片可用性（失败时显示占位、砖块尺寸不变）；读者浏览游戏页会向 IGDB 发请求（IP 可见），作者已接受
- IGDB 使用条款要求注明来源：游戏页来源说明加"封面来自 IGDB"
- 迁移 0005：给已有游戏行补 `platform = 'ps5'`；本地开发数据中游戏的 R2 封面 key 置空（线上 0004 尚未执行，无数据）

## 备选方案
| 方案 | 不选原因 |
|------|---------|
| 下载 IGDB 图片存 R2（同豆瓣封面） | 作者明确要求直接用 IGDB 链接 |
| 接 IGDB API 搜索 / 识别 | 需 Twitch 凭据与令牌维护；作者选择手动粘贴链接，另立条目 |
| 读者端加载后再测宽高 | 预渲染静态网格与 Masonry 首帧没有高度会跳动；无 JS 时无法排版 |
| 固定 3:4 砖块 | IGDB 大图并非都是 3:4（实测 811×1080），作者要求比例一致、不裁切 |
