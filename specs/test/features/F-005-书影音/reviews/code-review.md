# 代码审查报告：F-005 书影音

## 摘要

两轮审查：第一轮任务 1–11（2026-10-23，下方"审查维度（第一轮）"），第二轮任务 12–20（2026-10-27，见"第二轮"）。

| 轮次 | MUST-FIX | CONCERN | POSITIVE |
|------|---------|---------|---------|
| 第一轮（任务 1–11） | 4（已修复） | 21 | 9 |
| 第二轮（任务 12–20） | 3（已修复） | 31（3 项已顺手修复） | 17 |

**第一轮**

- 审查日期：2026-10-23
- 审查范围：Sprint 9 任务 1–11（提交 0618576 中的任务 1–6、9、11，以及未提交的任务 7、8、10），约 100 个源码与测试文件。审查期间作者插入了任务 12–14（游戏海报墙，ADR-013），不在本次范围，实现后补审
- 方式：单人模式。后台接口 / 豆瓣识别 / 封面、后台前端两块由子代理只读审查，读者端（任务 7、8、10）由主会话审查；所有 MUST-FIX 均由主会话复核代码后确认
- MUST-FIX：4 项（已全部修复）
- CONCERN：21 项（1 项已顺手修复，其余记入 [shelf-review-followups](../../../../backlog/shelf-review-followups.md)）
- POSITIVE：9 项

## 审查维度（第一轮）

### 1. 安全

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/shelf/douban/client.ts`、`service.ts` | 识别只请求固定的 Rexxar 地址 + 纯数字 id，用户粘贴的链接只用于解析；封面主机在下载前与 client 内各校验一次（`*.doubanio.com`），全部 `redirect: "manual"`，流式累计超过 5 MiB 即中止；集成测试断言所有外发请求主机都在白名单内 | POSITIVE | — |
| `src/middleware.ts` | `/api/admin` 前缀覆盖全部 shelf 写接口，写请求另做 Origin 校验；Astro 先解码路径再进 middleware，URL 编码绕过不成立 | POSITIVE | — |
| `src/pages/covers/[...key].ts` | 严格正则 `COVER_KEY` 卡路径，带 `nosniff` 与 `CSP default-src 'none'` | POSITIVE | — |
| 后台 / 读者端组件 | 无 `dangerouslySetInnerHTML`；豆瓣返回的标题、作者按文本渲染；识别封面 data URL 先过白名单正则；读者端构建时校验 `cover` 为 `/covers/` 路径、`doubanUrl` 为豆瓣 https 地址 | POSITIVE | — |
| `src/lib/api/shelf-http.ts:72`、`recognize.ts:11` | 只有 Content-Length 一道闸，分块传输可绕过，`formData()` / `text()` 会整体读入内存（仅管理员可调，风险低） | CONCERN | 待跟进 |
| `src/pages/api/shelf.ts` | 公开、`no-store`、无鉴权，每次全表读 D1；数据本就公开，放大面有限 | CONCERN | 待跟进 |

### 2. 边界条件

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/lib/api/shelf-http.ts`、`recognize.ts` | 按 Content-Length 超限时没读请求体就返回；本地 preview（miniflare）里同一连接的下一个请求会 500（与 middleware `reject` 处理的是同一个坑） | MUST-FIX | 已修复 |
| `src/components/reader/MediaTypeTabs.tsx` | 700ms 动画期间连点两个分类会排两个跳转定时器，可能先跳到第一个，与胶囊显示不符 | MUST-FIX | 已修复 |
| `src/components/admin/media/MediaEntryForm.tsx:252,259,319` | `maxLength` 按 UTF-16 码元计数，服务端按码点；含 emoji 的标题 / 短评会被提前截断 | CONCERN | 待跟进 |
| `src/lib/admin/shelf-form.ts:51` | 前端年份只校验 4 位数字，`0999` 放行后服务端 400，提示文案与输入矛盾 | CONCERN | 待跟进 |
| `src/components/admin/media/MediaEntryList.tsx:40` | `busy` 是单个 id，连续隐藏两条时前一条按钮提前解禁 | CONCERN | 待跟进 |
| `src/domains/shelf/service.ts:126-143` | 两个并发 PUT 同时换封面会留下孤儿对象（单管理员，概率很低） | CONCERN | 待跟进 |
| `src/domains/shelf/douban/map.ts` | 识别出的作者 / 标题可能超过 200 字，保存时才 400 | CONCERN | 待跟进 |
| `src/domains/shelf/service.ts:186` | 书的标签请求挂起时整次识别要等满 8 秒，封面也因时限用完而缺失（未超 NFR） | CONCERN | 待跟进 |
| `src/components/reader/MediaPosterWall.tsx` | 有 JS 时静态网格 `visibility: hidden`；若岛水合失败，电影 / 剧集列表不可见（分类导航同样依赖水合，接受） | CONCERN | 接受 |

### 3. API 契约对齐

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/lib/api/shelf-http.ts` `publicEntryView` | `GET /api/shelf` 从后台视图白名单式挑字段，不含 id、豆瓣 ID、隐藏标记与时间戳，与 `ShelfPublicEntry` 一致 | POSITIVE | — |
| `src/components/vendor/react-bits/GooeyNav.tsx:914` | 点当前分类只 return 未 `preventDefault`，浏览器整页刷新；与规格"当前项不跳转"及单测名不符（单测只断言 navigate 未调用，jsdom 测不出） | MUST-FIX | 已修复 |
| `MediaEntryForm.tsx` + api-contract PUT | 编辑页重新识别出另一个豆瓣链接时，界面显示新链接，但服务端按契约"豆瓣字段只能保持或清除"静默保留原值（原值为空时也不绑定新链接） | CONCERN | 待跟进（需作者决定改契约还是改编辑页） |
| `api-contract.md` | ShelfEntryView 的 `platform` / `coverUrl` 等游戏字段、422 `COVER_LINK_UNREACHABLE` 尚未实现但未标"待实现"（ADR-013 设计进行中）；§4 写 401 `UNAUTHORIZED`，实际为 `UNAUTHENTICATED` | CONCERN | 待跟进（文档正在由作者修改，本次未动） |

### 4. 错误处理

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `MediaEntryForm.tsx:138-146` | 服务端 400 的出错字段表单上没有对应控件（`type` / `status` / `rating` / `doubanUrl`）时，`showErrors({})` 后直接返回，界面毫无反馈 | MUST-FIX | 已修复 |
| `MediaEntryForm.tsx:153`、`RecognizeBox.tsx:77` | 会话过期 401 只提示"失败，请重试"，没有像文章编辑器那样暂存后跳登录页 | CONCERN | 待跟进 |
| `src/pages/admin/media/[id].astro:17` | 所有异常（含 D1 故障）都显示为"条目不存在" | CONCERN | 待跟进 |
| `src/lib/admin/shelf-client.ts:44` | 2xx 但响应体不是 JSON 时当失败处理，重试可能重复创建 | CONCERN | 待跟进 |
| `service.ts` 识别 | 整次识别共享一个 deadline + AbortController，超时统一归为 `FETCH_FAILED`，封面失败只降级进 `missing` | POSITIVE | — |

### 5. 依赖

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/components/vendor/react-bits/Masonry.tsx` | 上游的 `@hugeicons/*` 换成已有的 `lucide-react`；`npm ls @hugeicons/react` 为空，本 Sprint 无新增 npm 依赖 | POSITIVE | — |

### 6. 架构一致性

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/shelf/` | 领域层 `entry.ts`、`link.ts`、`map.ts` 为无 I/O 纯函数，I/O 经接口注入；`0004_shelf_entries.sql` 的 CHECK、STRICT、部分唯一索引与领域校验一一对应 | POSITIVE | — |
| `src/integrations/reader-data.ts` | 书影音数据沿用 ADR-007 的构建期虚拟模块，只在预渲染页引用；构建产物检查断言 Worker 包不含书影音数据（本次审查补的断言） | POSITIVE | — |
| `src/pages/api/admin/shelf/entries/index.ts:14` | 同一请求里 `listByType` 查了两次（`list` 与 `counts`） | CONCERN | 待跟进 |

### 7. 代码质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/components/reader/MediaList.astro` | 海报墙岛的 props 会序列化进 HTML，原样传入条目时导演字段进了产物（页面不显示，但数据冗余） | CONCERN | 已修复（传入前去掉 `creator`，构建用例补断言） |
| vendor 文件 | `FlipCard` / `Masonry` / `GooeyNav` 文件头逐条列出本项目改动与原因；Masonry 按 vendor 惯例关闭 react-hooks 规则并注明原因 | POSITIVE | — |

### 8. 测试质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `tests/integration/shelf/entries-security.test.ts:44` | 并发插入同一豆瓣 ID 靠 UNIQUE 索引 + 正则匹配错误消息转 409，这条路径无测试 | CONCERN | 待跟进 |
| `tests/integration/shelf/covers.test.ts:70` | `/covers/../img/x.jpg` 被 `new URL` 先规范化，未真正测到路由参数里带 `..`；鉴权矩阵少 `GET /api/admin/shelf/entries/1` | CONCERN | 待跟进 |
| 后台前端 | 缺：保存 409、401、编辑页"移除封面"、隐藏 / 删除失败 toast 的用例 | CONCERN | 待跟进 |
| 删除成功后焦点 | `MediaEntryList.tsx:83` 删除成功后焦点落回 body | CONCERN | 待跟进 |

## MUST-FIX 修复记录（第一轮）

| # | 维度 | 问题 | 修复方式 | 回归结果 |
|---|------|------|---------|---------|
| 1 | 错误处理 | 录入表单：服务端出错字段无对应控件时无反馈 | 先加单测（400 `fields: ["doubanUrl"]` → 应提示），再在映射为空时 toast"保存失败：{服务端说明}" | `media-entry-form.test.tsx` 5 / 5 |
| 2 | API 契约 | 点当前分类整页刷新 | 单测改为断言 `defaultPrevented`；GooeyNav 有 `onNavigate` 时当前项也 `preventDefault`（vendor 改动 5） | `media-type-tabs.test.tsx` 全过 |
| 3 | 边界条件 | 连点两个分类排两个跳转 | 先加单测（300ms 内点电影再点游戏 → 只跳游戏）；`MediaTypeTabs` 用 ref 保存定时器，新点击先清除，卸载时清除 | 同上 |
| 4 | 边界条件 | 超限请求未读请求体 | 先加集成测试（带 Content-Length 的超限请求 → `bodyUsed` 为 true）；新增 `exceedsBodyLimit`，拒绝前读完请求体，条目表单与识别接口共用 | `tests/integration/shelf` 全过 |

修复后回归：`npm run lint` 0 problems；`npm run check` 0 errors；`npx vitest run tests/unit` 547 / 547；`tests/integration/shelf` 全过；`npm run test:build` 18 / 18；`npx playwright test reader-media admin-media reader-shell --project chromium` 37 / 37。

## 第二轮：任务 12–20

- 审查日期：2026-10-27
- 审查范围：`edc4d44..43dda53` 共 7 个提交，约 100 个源码与测试文件：
  - 游戏平台与 IGDB 封面（任务 12、13、14）
  - "按时间"发行年份（15）
  - 统一海报墙（16）
  - 背面滤镜封面（17）
  - 去掉悬停片名（18）
  - 豆瓣批量导入接口与弹窗（19、20）
- 方式：单人模式。三个子代理并行只读审查：后端（12、19）、后台前端（13、20）、读者端（14–18）。主会话逐条复核 MUST-FIX 后修复
- 背景：作者已在 2026-10-27 跳过审查，先行发布了 43dda53（版本 6eef9a32）。下面 MUST-FIX 1 的问题已经在线上，修复后需要重新发布

### 1. 安全

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/shelf/igdb.ts`、`entry.ts` | IGDB 抓取只请求 `normalizeIgdbCoverUrl` 重新生成的固定主机地址；拒绝 `..`、`\`、userinfo、端口；`redirect: "manual"`；最多读 64 KB；宽高上限 20000；8 秒超时；迁移 0005 的 CHECK 兜底 | POSITIVE | — |
| `douban/client.ts`、`douban/import.ts` | 豆瓣 uid 先过白名单正则再 `encodeURIComponent`；404、403、need_login 分别映射 | POSITIVE | — |
| `src/middleware.ts` + 三个 import 路由 | 都在 `/api/admin` 下，会话和 Origin 校验都覆盖到；走 `readJsonBody`，超限和非 JSON 两条路径都会读完请求体（没有 miniflare 未读请求体的问题） | POSITIVE | — |
| `src/integrations/reader-data.ts:74` | 构建校验 `isCover` 只认 `/covers/…` 和规范的 IGDB 地址；`MediaList.astro` 序列化进岛 props 前去掉 `creator` | POSITIVE | — |
| `reader-data.ts:74,92` | 构建校验没有按分类约束：非游戏条目带 IGDB 封面或平台也能通过 | CONCERN | 待跟进 |
| 外链 IGDB `<img>` | 没有设置 `referrerPolicy="no-referrer"` | CONCERN | 待跟进 |

### 2. 边界条件

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/shelf/importer.ts:260` | 导入时书的 tags 请求失败（如限流）被 `.catch(() => [])` 当成"没有标签"。① 两类都勾选时，已有的漫画条目会被覆盖成"书"，重建后读者页分类出错；② 只勾"漫画"时，这本被静默跳过、不进失败列表，本步结束后水位前移，之后增量同步不会再导入它 | MUST-FIX | 已修复 |
| `DoubanImportDialog.tsx:239` | 中途出错时整个汇总区被隐藏。全量导入第 1 页已写入、第 2 页返回 502 时，只能看到 Alert，看不到已导入的数量和第 1 页的失败条目，与规格"若已导入部分条目，同时显示汇总"不符 | MUST-FIX | 已修复 |
| `DoubanImportDialog.tsx`（停止 / 关闭） | 停止在当前页返回后生效；最后一页时点停止仍算完成；进行中关不掉弹窗，不存在卸载后还在 setState 的路径；每次运行只调一次 `finish` | POSITIVE | — |
| `importer.ts:247-251` | 同页重复 ID 或并发 insert 撞唯一约束时，先删掉刚写的封面，再转为覆盖；限流器并发不超过 5 | POSITIVE | — |
| `shelf-time.ts`、`MediaTimeBasis.tsx` | 没有发行年份的条目归到最后的"未知年份"；兼容旧存储值 "1"；localStorage 读写包了 try/catch；挂载前先输出静态网格，有 JS 时隐藏，不会出现水合不一致 | POSITIVE | — |
| `importer.ts:239-240` | `create()` 在封面 `put` 之后、insert 之前超时，R2 里的封面没有回收 | CONCERN | 待跟进 |
| `importer.ts:158` | `touch` 在豆瓣列表请求之前执行，返回 404 / 403 的错误 ID 也会被记为"上次使用" | CONCERN | 待跟进 |
| `importer.ts:255` | 未勾选类别的坏数据也会进 `failed[]` | CONCERN | 待跟进 |
| `importer.ts:294` | 下一页起点固定为 `start + 20`，依赖豆瓣的 start 是位置偏移 | CONCERN | 待跟进 |
| `entry.ts` readJpegSize | 64 KB 内读不到 SOF 的 jpg 会被误报为"封面链接打不开"（截断、畸形输入都能正确返回 null） | CONCERN | 待跟进 |
| `DoubanImportDialog.tsx:159-164` | 等待 `finish` 返回期间，"停止"按钮仍可点击 | CONCERN | 待跟进 |
| `DoubanImportDialog.tsx:81` | 首次状态请求返回较慢时，会覆盖用户已输入的 ID | CONCERN | 待跟进 |
| `DoubanImportDialog.tsx:138` | 分页循环只靠 `nextStart = null` 结束，没有防御性终止条件 | CONCERN | 待跟进 |
| `shelf.ts:27` `posterAspect` | 宽高比没有上下限 | CONCERN | 待跟进 |
| `MediaPoster.tsx:62` | `year` 为 0 时会渲染出 "0" | CONCERN | 待跟进 |
| `MediaPoster.tsx:53-66` | 没有平台的游戏不显示年份徽标 | CONCERN | 待跟进 |

### 3. API 契约对齐

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `importer.ts:65-85`、`shelf-http.ts` | 以下各项都与 api-contract、ADR-013、ADR-014 一致：uid / kind / status / types / mode / start / head 校验；404 / 403 / 502；422 `COVER_LINK_UNREACHABLE`；400（游戏带上传封面）。公开视图不输出 `coverUrl` | POSITIVE | — |
| `shelf-client.ts` ↔ 三个 import 路由 | 前后端的请求和响应字段逐项一致；增量模式的进度显示依据与服务端的截断条件一致 | POSITIVE | — |
| `MediaPoster`、`MediaTimeBasis` 等 | 与 reader-media.md 一致：分类文案、存储值、翻面复位、游戏用 `object-contain`、徽标位置与淡入、触屏不显示、背面滤镜参数、"封面来自 IGDB" | POSITIVE | — |
| `import/state.ts:16` | `?uid=`（空串）返回 400，契约里没写 | CONCERN | 待跟进 |
| `DoubanImportDialog.tsx:273` | 出错后主按钮显示"再次同步"，规格是"按钮回到打开时的样子" | CONCERN | 已修复（与 MUST-FIX 2 是同一处判断） |

### 4. 错误处理

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `service.ts` readCoverSize | 超时和读取失败统一转为 `COVER_LINK_UNREACHABLE`，race 中的 rejection 都有处理 | POSITIVE | — |
| `MediaPoster.tsx` | 正面和背面封面各自用 `onError` 降级，砖块尺寸不变 | POSITIVE | — |
| `DoubanImportDialog.tsx:155-162` | 中途遇到 401 时 `finish` 也会 401，接着弹出有误导性的"触发重建失败" | CONCERN | 待跟进 |
| `DoubanImportDialog.tsx:83` | 状态接口返回 401 时被静默当作首次同步 | CONCERN | 待跟进 |
| `importer.ts:204,295` | `stateRepo.complete` 失败时本页数据已写入，但前端只看到 500 | CONCERN | 待跟进 |

### 5. 依赖

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| — | 没有新增 npm 依赖；Simple Icons 平台图标为内联 SVG（CC0）；Masonry 只是把 `CAPTION` / `TITLE` 改回模块内常量 | POSITIVE | — |

### 6. 架构一致性

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `douban/import.ts`、`entry.ts` | 映射、校验、图片头解析都是纯函数，I/O 通过 `DoubanClient` / `IgdbImageClient` / `ImportStateRepo` 注入；导入复用了识别用的 `normalizeEntryInput` 和映射规则 | POSITIVE | — |
| 组件命名 | `DoubanImportDialog`、`Checkbox`、`IgdbCoverField`、`PlatformBadge`、`YearBadge`、`MediaTimeBasis` 与 components.md 一致；`src`、`tests` 已不再引用 `MediaCard` / `MediaRow` / `MediaCover` | POSITIVE | — |
| `specs/ui/components.md:117,403,406` | 仍指向已删除的 `MediaRow` / `MediaCard`，以及已撤回的悬停片名 | CONCERN | 已修复 |
| `douban/client.ts` → `import.ts` | 防腐层内部出现双向依赖（client 引用了 `isValidDoubanUid`） | CONCERN | 待跟进 |
| `src/lib/dom/modal.ts` | ConfirmDialog 没有改用它，同一逻辑存在两份 | CONCERN | 待跟进 |
| `src/lib/dom/modal.ts` | `FOCUSABLE` 缺少 `select` / `textarea` / `[tabindex]` | CONCERN | 待跟进 |

### 7. 代码质量（含可访问性）

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `DoubanImportDialog.tsx:179-186,257-277` | Esc 只挂在对话框的 `onKeyDown` 上。点"全量导入"后该按钮被替换成"停止"，结束时"停止"又被卸载，焦点两次掉到 `body`。之后 Esc 关不掉弹窗，Tab 也会跑出对话框 | MUST-FIX | 已修复 |
| `MediaPoster.tsx`、`MediaTimeBasis.tsx` | 浮层设为 `aria-hidden`，平台和年份写进翻面控件的 aria-label；背面封面 `alt=""`；时间依据用 radiogroup + roving tabIndex；减弱动效时关闭位移 | POSITIVE | — |
| `Checkbox.tsx` | hint 放在 label 内，同步时间成了可访问名称的一部分 | CONCERN | 待跟进 |
| `PlatformBadge.tsx` | `role="img"` + aria-label 位于 `aria-hidden` 浮层内，永远不会被读到 | CONCERN | 待跟进 |
| `makeBackgroundInert` | 弹窗打开期间弹出的 Toast 不会被读屏播报 | CONCERN | 待跟进 |
| 弹窗布局 | 类别区与进度区的先后顺序需要对照设计稿 11i | CONCERN | 待跟进 |

### 8. 测试质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `import-service` / `import-incremental` / `igdb` 等 | 后端覆盖：截断与同一秒、末页才前移水位、类别过滤、41 个请求与并发上限、挂起超时、3xx / svg / 读取上限、各类图片头夹具。读者端覆盖：旧值 "1"、localStorage 抛错、原比例 ±1%、触屏不显示徽标 | POSITIVE | — |
| `douban-import-dialog.test.tsx` | 502 用例只断言了 Alert，没有断言部分汇总，所以没能发现 MUST-FIX 2；对话框的 Esc / 焦点没有测试 | CONCERN | 已修复（补了两个用例） |
| `tests/e2e/admin-media-import.spec.ts` | 缺导入弹窗的 Esc / 遮罩 / 焦点归还用例 | CONCERN | 待跟进 |
| `tests/e2e` | 缺：IGDB 预览 404 回到虚线框；键盘聚焦游戏海报时徽标淡入 | CONCERN | 待跟进 |
| `tests/unit/shelf/import-service.test.ts` | 缺：导入把已有游戏识别为桌游时，平台和封面链接是否清空 | CONCERN | 待跟进 |
| `tests/unit/markdown` | 代码高亮快照在全量并发负载下偶发失败一次，单独重跑通过 | CONCERN | 待跟进 |

### MUST-FIX 修复记录（第二轮）

| # | 维度 | 问题 | 修复方式 | 回归结果 |
|---|------|------|---------|---------|
| 1 | 边界条件 | 导入时书的 tags 请求失败，被按"书"写入或跳过 | 先改测试：`[comic]` → 新增 3 + 失败 1；`[book]` → 新增 16 + 失败 1；两类都勾 → 新增 19；另加一条"tags 失败时已有漫画不被改成书"。实现上，导入路径在 tags 失败时抛 `ImportItemError(FETCH_FAILED)`，条目进失败列表、不写入。识别路径仍按书降级，因为作者会看到结果再保存。同步了 domain-model §5.1、US-04 behaviors、US-04-tests TC-US04-02 / 24 和夹具 README | `import-service.test.ts` 57 / 57（新增 1）；`tests/integration/shelf` 全部通过 |
| 2 | 边界条件 | 出错时汇总被隐藏 | 先加单测：第 1 页新增 2、失败 1，第 2 页 502 → Alert、汇总"已停止：新增 2、更新 0、失败 1、封面失败 0"、失败条目、主按钮"同步新标记"同时出现。实现上，汇总的显示条件改为"无错误，或已有新增 / 更新 / 失败"；出错时汇总前缀用"已停止："，不显示完成图标；出错后主按钮回到"同步新标记" | `douban-import-dialog.test.tsx` 10 / 10 |
| 3 | 代码质量 | 阶段切换后焦点掉到 body，Esc 失效 | 先加单测：全量导入完成后焦点仍在对话框内，按 Esc 触发 `onClose`。实现上，对话框容器设 `tabIndex={-1}`；`phase` 变化时，若焦点不在对话框内就拉回对话框 | 同上 |

修复后回归：`npm run lint` 0 problems；`npm run check` 0 errors；`npm test` 179 个文件 907 / 907；`npm run test:build` 19 / 19（修复前跑，修复不涉及读者构建）；`npm run test:e2e`（chromium + webkit）结果见 verify。

## 结论

任务 1–11 通过。4 项 MUST-FIX 已修复并回归通过；20 项未修的 CONCERN 均不阻塞 verify，已记入 Backlog [shelf-review-followups](../../../../backlog/shelf-review-followups.md)，其中"编辑页重新识别豆瓣链接"需要作者决定方向。任务 12–14 实现后对其增量审查，再进入 verify。

任务 12–20 通过（2026-10-27）：3 项 MUST-FIX 已修复并回归。其中 MUST-FIX 1（导入时漫画可能被写成书）已随 43dda53 上线，需要重新发布。未修的 CONCERN 不阻塞 verify，已并入 Backlog [shelf-review-followups](../../../../backlog/shelf-review-followups.md)（标"12–20"）。F-005 可以进入 verify。
