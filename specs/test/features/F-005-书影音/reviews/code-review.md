# 代码审查报告：F-005 书影音

## 摘要

- 审查日期：2026-10-23
- 审查范围：Sprint 9 任务 1–11（提交 0618576 中的任务 1–6、9、11，以及未提交的任务 7、8、10），约 100 个源码与测试文件。审查期间作者插入了任务 12–14（游戏海报墙，ADR-013），不在本次范围，实现后补审
- 方式：单人模式。后台接口 / 豆瓣识别 / 封面、后台前端两块由子代理只读审查，读者端（任务 7、8、10）由主会话审查；所有 MUST-FIX 均由主会话复核代码后确认
- MUST-FIX：4 项（已全部修复）
- CONCERN：21 项（1 项已顺手修复，其余记入 [shelf-review-followups](../../../../backlog/shelf-review-followups.md)）
- POSITIVE：9 项

## 审查维度

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

## MUST-FIX 修复记录

| # | 维度 | 问题 | 修复方式 | 回归结果 |
|---|------|------|---------|---------|
| 1 | 错误处理 | 录入表单：服务端出错字段无对应控件时无反馈 | 先加单测（400 `fields: ["doubanUrl"]` → 应提示），再在映射为空时 toast"保存失败：{服务端说明}" | `media-entry-form.test.tsx` 5 / 5 |
| 2 | API 契约 | 点当前分类整页刷新 | 单测改为断言 `defaultPrevented`；GooeyNav 有 `onNavigate` 时当前项也 `preventDefault`（vendor 改动 5） | `media-type-tabs.test.tsx` 全过 |
| 3 | 边界条件 | 连点两个分类排两个跳转 | 先加单测（300ms 内点电影再点游戏 → 只跳游戏）；`MediaTypeTabs` 用 ref 保存定时器，新点击先清除，卸载时清除 | 同上 |
| 4 | 边界条件 | 超限请求未读请求体 | 先加集成测试（带 Content-Length 的超限请求 → `bodyUsed` 为 true）；新增 `exceedsBodyLimit`，拒绝前读完请求体，条目表单与识别接口共用 | `tests/integration/shelf` 全过 |

修复后回归：`npm run lint` 0 problems；`npm run check` 0 errors；`npx vitest run tests/unit` 547 / 547；`tests/integration/shelf` 全过；`npm run test:build` 18 / 18；`npx playwright test reader-media admin-media reader-shell --project chromium` 37 / 37。

## 结论

任务 1–11 通过。4 项 MUST-FIX 已修复并回归通过；20 项未修的 CONCERN 均不阻塞 verify，已记入 Backlog [shelf-review-followups](../../../../backlog/shelf-review-followups.md)，其中"编辑页重新识别豆瓣链接"需要作者决定方向。任务 12–14 实现后对其增量审查，再进入 verify。
