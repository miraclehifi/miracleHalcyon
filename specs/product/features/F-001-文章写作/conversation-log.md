# 对话记录 — F-001

> 本文件由 sdd:log-conversation 自动维护，记录每个 SDD 阶段结束时的关键决策与对话摘要。

## [define-feature] 2026-10-10 · miraclehifi

**关键决策**
- 技术栈：Astro 5 + React 19 + TypeScript，部署 Cloudflare；UI 设计工具用 Pencil（设计稿进 git，`*.pen binary`）
- 写作方式选"线上编辑，存数据库"：文章存 D1、图片存 R2，站点由纯静态改为 SSR 混合模式（`@astrojs/cloudflare`）
- 登录方式选账号密码（未采纳推荐的 Cloudflare Access），需自行实现会话、哈希、限流
- 博客定位"博客 + 作品集"，作品集推迟到 F-003；核心价值：阅读体验好、随时随地写作
- F-001 文章写作先于 F-002 首页（先有真实数据）
- AI 补充范围：含管理端文章列表与删除、撤回为草稿；仅支持 GFM Markdown（不支持 MDX）；不做版本历史、定时发布、图片库

**对话摘要**
- 用户：「我要建立一个博客，推荐一下技术栈」「使用React」「直接用 Cloudflare Pages 或 Vercel，最省事」
- AI：推荐 Astro + React 群岛 + Cloudflare Pages，说明文章原本存 git 无数据库
- 用户：「写一个需求文档：要有一个首页和写文章的页面，等到你思考到页面设计时再叫我」
- AI：指出写文章页与"无数据库"冲突，给出本地 mdx / 提交 GitHub / 存数据库三选项
- 用户选择：线上编辑存数据库、账号密码登录、首页含文章列表+个人简介+标签入口、写作页需表单+实时预览+图片上传+自动保存

## [design-arch] 2026-10-12 · miraclehifi

**关键决策**
- 领域划分：`auth`（会话 + 限流）、`post`（核心，工作稿 + 已发布快照）、`media`（图片 + 实况视频）；`markdown` 为同构共享模块，不算 Domain
- Markdown 同构渲染：预览在浏览器 Web Worker 跑，F-002 在 Worker SSR 用同一模块；Expressive Code 能否在 Workers 运行列为 Sprint 1 首个 spike（ADR-001）
- 源码区用原生 textarea，格式命令走 `execCommand('insertText')` 保留原生撤销（ADR-004）
- 会话存 D1 只存 Token 摘要；文章单行"工作稿 + 已发布快照"（ADR-002、ADR-003）
- 实况照片 / 宽图 / 组图 **F-001 全做**：自描述图片 URL（文件名含宽高与主色）+ GFM 兼容写法 `#wide` / `#live` / 连续图片成组 / `#accordion`（ADR-005）
- 实况照片参考 Afilmory 的配对思路，但 HEIC 转 JPEG、MOV 转 mp4（能转则转 H.264）都在浏览器上传前完成，Worker 只校验存储（ADR-006）
- 范围回补：新增 US-11 live-photo-upload、US-12 image-layout-marks；NFR 上传限制加 HEIC 转换与 mp4 ≤ 10MB；iOS 网页端只能拿到静态图，写入约束，快捷指令方案进 Backlog（idea）

**对话摘要**
- 用户：「设计阶段已完成，可以开始开发了」→ AI 指出架构 / 领域 / 任务拆分尚未完成，按流程先做 design-arch
- 用户三项选择：渲染「同构模块，预览在浏览器跑」、编辑器「原生 textarea」、图片扩展「F-001 全做」
- 用户：实况照片处理「参考这个项目的实现方式 https://github.com/Afilmory/afilmory.git」→ AI 调研后指出其构建期依赖 sharp/exiftool、"MOV→MP4"只是改 Blob 类型，改为浏览器端处理
- 用户：「用户上传的时候是直接穿live图片吗」「ios为什么这么绕」→ AI 解释实况照片是相册记录而非文件，网页只能拿到静态图；用户「可以」接受补约束 + Backlog

## [design-ui] 2026-10-13 · miraclehifi

**关键决策**
- 图片菜单：悬停出右上角"图片选项"按钮，点击展开下拉菜单（单图：宽图；组图：网格 / 手风琴 / 拆成单图），执行后菜单保持打开；手机点按直接展开，长按留给实况播放
- 新增组件 `Menu`、`Popover`、`ImageMenu`、`ImageSyntaxHelp`；`Toast` 新增 `warning`（常驻、warn-soft），用于实况视频被丢弃 / 保留 HEVC
- "图片写法"浮层在桌面底栏，手机放进设置底部面板；内容含 iPhone 实况照片导出方法
- 设计稿新增画板 `03b 图片菜单与写法说明`

**对话摘要**
- 用户选择：图片菜单「右上角按钮 + 下拉菜单」、提示「新增 warning」
- 用户：「上传接口 POST /api/admin/images 新增了可选的 video 字段……这一步是做什么的」→ AI 说明这只是安全送检提醒，个人项目可忽略

## [design-domain] 2026-10-13 · miraclehifi

**关键决策**
- 接口路径对齐验收用例：登录 / 登出为 `/api/admin/login`、`/api/admin/logout`；新增公开只读 `GET /api/posts[/:slug]`；发布与发布更新共用 `/publish`
- "有未发布修改"改为比较工作稿与快照的内容哈希（不按时间），避免保存相同内容被误判；ADR-002 已同步
- 空标题存为"无标题"，发布时视为缺少标题；slug 发布时必填，工作稿与快照的 slug 全站唯一
- 字段格式项目级 SSOT：时间戳 ISO 8601 UTC、枚举小写（偏离插件标准，理由记录在 shared-field-formats.md）
- D1 审计列用 SQLite 等价写法（TEXT 默认值 + AFTER UPDATE 触发器）
- 上传：宽高由服务端解析文件头，`rgb` 可选（缺省 808080）；图片与视频不留半对；`/img/*` 支持 Range
- 上传占位保持 `![上传中…]()` 原文，按出现顺序与上传任务对应（与验收用例一致）

**对话摘要**
- 用户：「继续」→ AI 自主完成 auth / post / media 三个 Domain 与 markdown / editor / media-upload 三个前端模块规格，并回写架构文档、US-05 用例与单元测试规格

## [verify] 2026-10-15 · miraclehifi

**关键决策**
- code-review 由本会话接手收尾：补记审查报告（F-001 6 项 MUST-FIX），修类型错误，内存仓储对齐 slug 条件；任务 20、21 与审查修复分三次提交
- verify 不做本地前端联调；E2E 用项目自带 Playwright 套件，接口测试由 workers 集成测试承担（项目没有 local-server-start / apitest-skill）
- 插件的 gap-tc-to-code.py 识别不了本项目的表格格式（解析出 0 条），改为自写脚本加逐条阅读测试断言做 TC 追溯
- F-001 验证**未通过**：现有测试全过，但 256 个验收用例中 18 个无测试（4 个 P0：TC-US01-31、TC-US01-33、TC-US03-22、TC-US06-26）、54 个部分覆盖；US-03 / US-06 / US-07 的部分验收期望值在 design-domain 后未同步。成因是 Sprint 1 的测试按领域单元规格与接口契约组织，不对应 TC
- 建议新开 Sprint 5 补齐验收测试后重新 verify；作者也可以选择记为已知风险后发布（status.yaml blocker：needs-decision）

**对话摘要**
- 用户：「继续」（接上 Sprint 4 完成后的状态）
- AI：发现工作区有另一会话留下、未提交且无记录的 code-review 修复，`npm run check` 有 2 个错误，询问如何接手
- 用户：选「接手并收尾」（补记审查、修 check、跑回归、分批提交，再进入 verify）
- AI：verify 前询问是否做本地联调（dev:local + Playwright 走完整旅程并截图）
- 用户：选「不做联调」

## [verify] 2026-10-16 · miraclehifi

**关键决策**
- 作者决定只补 4 个 P0 用例并同步验收文档，其余缺口记为已知风险后与 F-002 一起发布；开 Sprint 5（f001-p0-test-gaps，4 个任务）
- 4 个 P0 补 E2E（登录提交中与失败状态、非法 slug 行内提示、未保存 / 保存中离开确认），行为原本已实现，没有发现缺陷
- 首次 verify 漏跑了 Sprint 1 留下的 3 个 playwright-skill 脚本；补跑时修正过时的请求体（缺 `cover`）与列表选择器（行不再是 `<li>`）后 21 / 21 通过，追溯改为把这些脚本也算作测试来源
- 验收文档同步现行契约：登录失败文案以 admin-login.md / api-contract 为准（"账号或密码错误，请检查后重试"）等 5 份文件
- 重新验证：已覆盖 189、部分 49、无测试 10（无 P0）、线上 8 → validation done，待发布确认

**对话摘要**
- AI：F-001 有 18 个无测试用例（4 个 P0）、54 个部分覆盖，给出三个选项：Sprint 5 全面补测 / 只补 P0 后发布 / 记为已知风险直接发布
- 用户：选「只补 P0 后发布」
- 用户：「继续」（中途两次，推进 Sprint 5 与重新验证）
