# 追溯报告：F-001 文章写作

**生成日期**: 2026-10-16（Sprint 5 后重新追溯）

> 来源：各 US 的验收用例索引表（TC → SC）。追溯方式：① 测试名或注释中带 TC 编号且与该 US 的 SC 前缀一致（含 tests/ 与 specs/test/features/*/e2e/ 下 verify 阶段运行的 playwright-skill 脚本）；② Sprint 任务文件中列出的 TC 与测试文件；③ 以上都没有的，逐条阅读测试断言判断（Sprint 1 的测试按领域单元规格与接口契约组织，不带 TC 编号）。"部分覆盖"指测了主要结果、缺少用例里列出的部分边界或变体。

## 覆盖率

| 指标 | 数值 |
|------|------|
| 验收用例（不含已删除） | 256 |
| 已覆盖 | 189（73%） |
| 部分覆盖 | 49（19%） |
| 无测试 | 10（3%） |
| 线上 / 人工 | 8（3%） |
| 已删除 | 5 |

## 按 User Story

| US | 已覆盖 | 部分覆盖 | 无测试 | 线上 / 人工 | 已删除 |
|----|----|----|----|----|----|
| US-01 | 20 | 15 | 1 | 3 | — |
| US-02 | 17 | — | — | — | — |
| US-03 | 18 | 7 | — | 1 | — |
| US-04 | 10 | 3 | 2 | — | — |
| US-05 | 24 | — | — | 1 | — |
| US-06 | 15 | 9 | 4 | 1 | — |
| US-07 | 12 | 7 | — | 1 | — |
| US-08 | 9 | 8 | 3 | 1 | — |
| US-09 | 16 | — | — | — | — |
| US-10 | 10 | — | — | — | — |
| US-11 | 20 | — | — | — | 5 |
| US-12 | 18 | — | — | — | — |

## 缺口明细

| TC | US | 优先级 | 类型 | 场景 | 状态 | 已有测试 | 说明 |
|----|----|------|------|------|------|---------|------|
| TC-US01-09 | US-01 | P1 | security | 超长密码 / 超长账号不导致 5xx 或超时 | 无测试 | — | 实现有 USERNAME_MAX 64 / PASSWORD_MAX 256 超长直接 401 不做哈希，但无测试断言超长输入（1000 / 100000 / 1MB 密码、10000 账号） |
| TC-US04-08 | US-04 | P1 | performance | 长文连续输入不卡顿 | 无测试 | — | 无 longtask / 连续输入不丢字的长文性能测试 |
| TC-US04-11 | US-04 | P1 | ui-interaction | 空正文显示占位 | 无测试 | — | 无测试断言空正文占位“在左侧开始写作，这里会显示预览”及输入后删空/仅空白的切换 |
| TC-US06-03 | US-06 | P1 | e2e | 持续输入去抖，仅停止后保存 1 次 | 无测试 | — | 无测试验证持续输入重置防抖计时（间隔 <2s 多次编辑期间 0 请求、停止后仅 1 次） |
| TC-US06-06 | US-06 | P2 | e2e | 双标签页编辑同一篇，后写覆盖且不报错 | 无测试 | — | 无双标签页后写覆盖测试 |
| TC-US06-10 | US-06 | P1 | e2e | 空白新建页离开不产生草稿 | 无测试 | — | 无测试验证空白新建页离开不发 POST、不弹确认 |
| TC-US06-29 | US-06 | P1 | ui-interaction | 去抖等待中按 Ctrl+S 只保存 1 次 | 无测试 | — | 无测试验证防抖中连按 Ctrl+S 只发 1 次请求 |
| TC-US08-11 | US-08 | P1 | e2e | 发布失败状态不变并提示 | 无测试 | — | 无测试拦截发布 500/中断验证“发布失败，请重试”、状态不变、重试成功 |
| TC-US08-12 | US-08 | P2 | api | 更新/撤回失败状态不变（错误猜测） | 无测试 | — | 无更新/撤回失败的故障注入测试，也未验证原子性 |
| TC-US08-18 | US-08 | P1 | ui-interaction | 请求进行中按钮加载并禁用，防重复提交 | 无测试 | — | 无测试验证发布/发布更新进行中按钮 loading 禁用及只发 1 次请求（仅删除确认框有同类测试） |
| TC-US01-04 | US-01 | P1 | e2e | 未登录访问各类 /admin/** 页面均跳转登录（等价类） | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115` | 已测 /admin/posts?tab=draft（next 保留 query）、/admin 跳登录，/admin/login 无会话 200；未测 /admin/、/admin/posts/new、不存在页面先鉴权，未断言响应体无后台数据 |
| TC-US01-07 | US-01 | P0 | security | 错误账号 + 正确密码，响应与"密码错"不可区分 | 部分覆盖 | `tests/unit/auth/login-service.test.ts:30` | 服务层错账号与错密码返回同一结果且错账号也执行 1 次哈希比对；缺 HTTP 层响应头 / 体一致性比较、TEST-ADMIN 大小写变体、响应时间中位数比较 |
| TC-US01-08 | US-01 | P1 | security | 账号字段 SQL 注入 / 特殊字符 | 部分覆盖 | `tests/integration/auth/login-endpoint.test.ts:79` | 只有“类型不是 string”→400 一条（且在 password 字段）；账号字段 SQL 注入、XSS、\u0000、{$ne:null} 对象均未测 |
| TC-US01-10 | US-01 | P1 | api | 绕过前端直接提交空账号或空密码 | 部分覆盖 | `tests/integration/auth/login-endpoint.test.ts:79` | 已测缺 password 字段、非字符串类型、JSON 无法解析→400；空字符串账号 / 密码、两者皆空、password=null 未测 |
| TC-US01-11 | US-01 | P0 | api | 边界：连续失败 4 次后，第 5 次正确密码仍可登录 | 部分覆盖 | `tests/unit/auth/throttle.test.ts:16`<br>`tests/integration/auth/throttle-repo.test.ts:27`<br>`tests/integration/auth/throttle-repo.test.ts:51` | 4 次失败未锁定、第 5 次请求仍会比对密码（并发用例 verify=5）已证；但“失败 4 次后第 5 次正确密码登录成功”无直接断言 |
| TC-US01-17 | US-01 | P0 | api | 边界：锁定后 14:59 仍为 429 | 部分覆盖 | `tests/unit/auth/throttle.test.ts:16` | 只断言锁定时刻与 +5 分钟仍锁定、+15:00 解锁；未测 14:59 边界，接口层也无时钟推进用例 |
| TC-US01-20 | US-01 | P0 | security | 伪造 / 篡改 Cookie 调用全部写接口返回 401 | 部分覆盖 | `tests/integration/auth/logout-endpoint.test.ts:115`<br>`tests/unit/auth/session-check.test.ts:13` | 只覆盖“已失效 / 未知 token”变体（5 类写接口 401）；篡改末位、截断、空值、错误 Cookie 名、注入值未测 |
| TC-US01-22 | US-01 | P0 | security | 写接口 Origin 校验（CSRF）：缺失 / 外域 Origin 被拒 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/media/upload-endpoint.test.ts:163`<br>`tests/integration/post/delete-endpoint.test.ts:79` | 带会话缺失 / 外域 Origin 403 已测（posts 创建、上传、删除）；Origin: null、http 协议降级、子域后缀变体未测，保存 / 发布未单独测 |
| TC-US01-23 | US-01 | P1 | security | 登录接口 Origin 校验（Login CSRF） | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68` | 登录接口缺失 / 外域 Origin 403 已测；Origin: null 未测；“被拒不计入失败计数、随后正确登录成功”未断言 |
| TC-US01-26 | US-01 | P1 | e2e | 会话状态转换：无 → 有效 → 过期 → 重新登录 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/e2e/login.spec.ts:7`<br>`tests/unit/auth/session-check.test.ts:13` | 各状态分支分散有测；缺完整状态转换 E2E，且未断言重新登录得到 S2≠S1、旧 S1 写接口 401 |
| TC-US01-27 | US-01 | P0 | security | next 参数开放重定向变体全部回落到 /admin | 部分覆盖 | `tests/unit/auth/next.test.ts:17` | sanitizeNext 覆盖 https://evil、//evil、/\evil、/posts、/adminx、null；\\evil、双重编码、javascript:（含大小写）、data:、https:evil、制表符、子域变体未测；无登录后最终 URL / 无 dialog 的 E2E |
| TC-US01-28 | US-01 | P2 | security | 已登录访问带恶意 next 的登录页仍到 /admin | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/unit/auth/next.test.ts:17` | middleware 已登录分支只用合法 next；恶意 next 仅在 sanitizeNext 单元层覆盖第 1/3/4 组，javascript:（第 7 组）未测 |
| TC-US01-35 | US-01 | P0 | security | NFR：密码与会话 Token 不出现在日志 / 响应 | 部分覆盖 | `tests/integration/auth/logout-endpoint.test.ts:43`<br>`tests/integration/auth/login-endpoint.test.ts:79` | 只断言登出时 token 不进 console；登录成功 / 失败 / 超长密码时密码与 token 不进日志未测；登录错误体只核对 code / message，未检查无其他字段。完整日志采集需 wrangler tail |
| TC-US01-36 | US-01 | P0 | security | NFR：会话 Cookie 属性与 Token 强度 | 部分覆盖 | `tests/integration/auth/login-endpoint.test.ts:79`<br>`tests/unit/auth/login-service.test.ts:30`<br>`tests/e2e/login.spec.ts:7` | Cookie 属性精确断言（无 Domain）、token 43 字符 base64url（256 bit）、浏览器端 httpOnly=true 已测；20 个 token 互不相同未测，HTTP→HTTPS 跳转属部署配置 |
| TC-US01-38 | US-01 | P1 | security | NFR：防会话固定（登录后签发新 Token） | 部分覆盖 | `tests/unit/auth/login-service.test.ts:30`<br>`tests/unit/auth/session-check.test.ts:13` | 登录总是生成随机新 token、未知 token 判为无会话，结构上成立；无预置 attacker-fixed Cookie 后登录再用它调写接口 401 的用例 |
| TC-US03-03 | US-03 | P1 | api | 标题等价类与边界（空存为"无标题"/1/200/201/emoji） | 部分覆盖 | `tests/unit/post/content.test.ts:18`<br>`tests/integration/post/create-endpoint.test.ts:21` | 仅验证空/空白标题→“无标题”（设计改为不报 400）；上限（设计为 200 字）边界 200/201、emoji/ZWJ 原样读回、400 后原值不变均无测试 |
| TC-US03-04 | US-03 | P0 | unit | slug 生成规则决策表（英文/中文/混合） | 部分覆盖 | `tests/unit/post/slug.test.ts:8`<br>`tests/unit/admin/post-settings-drawer.test.tsx:46` | 覆盖英文、纯中文→空、中英混合、重音（NFKD）、超长截断（上限 80）、Hello Astro 5!；多空白、C++/C#、下划线、emoji、纯符号、“2026 年度总结”行未测 |
| TC-US03-06 | US-03 | P0 | api | slug 格式等价类与错误猜测 | 部分覆盖 | `tests/unit/post/slug.test.ts:8`<br>`tests/unit/post/content.test.ts:18`<br>`tests/integration/post/create-endpoint.test.ts:21` | 只测 Hello_World、-a、a--b 被拒及 API 400 fields=slug；大写、尾随连字符、Unicode、中文、../、斜杠、%20、首尾空白（实现会 trim）及有效值 2026/a 未测；400 后读回原值未断言 |
| TC-US03-07 | US-03 | P1 | api | slug 长度边界 1/80/81 | 部分覆盖 | `tests/unit/post/slug.test.ts:8` | 仅断言 81 字符被拒（上限改为 80）；1 字符、恰好 80 字符通过的边界及 API 层 400/读回均未测 |
| TC-US03-10 | US-03 | P0 | api | 摘要边界 199/200/201 | 部分覆盖 | `tests/unit/post/content.test.ts:18`<br>`tests/integration/post/create-endpoint.test.ts:21` | 200 通过、201 报 summary 字段 400 及文案已测；emoji 计数口径、400 后读回原摘要（不截断入库）未测 |
| TC-US03-13 | US-03 | P0 | security | 未登录访问写接口与编辑页被拒 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115`<br>`tests/unit/auth/session-check.test.ts:13` | 无会话/已登出旧会话的 POST/PUT 401、页面跳登录已测；GET /api/admin/posts/:id 与 GET /api/admin/tags 未登录 401、/admin/posts/new 与 /admin/posts/nope 跳转、文章未被修改未测 |
| TC-US03-15 | US-03 | P1 | security | 标题/标签/摘要中的 HTML 作为纯文本存储与回显 | 部分覆盖 | `tests/e2e/editor-delete.spec.ts:57`<br>`tests/unit/admin/delete-dialog.test.tsx` | 仅标题含 <img onerror> 在编辑页不触发 dialog；标签、摘要 HTML 载荷的存储与回显、标题输入框 value 原样未测 |
| TC-US04-01 | US-04 | P0 | unit | GFM 渲染矩阵 | 部分覆盖 | `tests/unit/markdown/gfm.test.ts:33`<br>`tests/e2e/editor-preview.spec.ts:23`<br>`tests/unit/markdown/isomorphic.test.ts:7` | 快照含 h1/h2、列表、表格对齐、任务列表、删除线、https 自动链接、脚注，E2E 补引用与链接；h3–h6、www 自动链接、嵌套列表、行内代码转义、hr、MDX 组件、空输入未测 |
| TC-US04-07 | US-04 | P0 | performance | 万字 + 20 代码块预览更新 < 300ms | 部分覆盖 | `tests/spike/markdown-browser.spec.ts:13` | spike 只测 Worker 内渲染万字（10 个代码块）P95<200ms，不含按键到预览 DOM 更新的端到端耗时，且属 test:spike 非常规回归 |
| TC-US04-10 | US-04 | P1 | ui-interaction | 高亮主题随亮/暗模式切换 | 部分覆盖 | `tests/unit/markdown/code.test.ts:21` | 单元验证 token 带亮/暗两套颜色变量及主题选择器；未在浏览器中断言预览区切换亮/暗后计算颜色变化、与读者端一致 |
| TC-US06-04 | US-06 | P1 | e2e | 等价类：标题、文章信息修改同样触发 | 部分覆盖 | `tests/e2e/editor-autosave.spec.ts:6` | 标题与正文一同修改后保存、刷新标题保留；未单独验证仅改标题/摘要触发保存，未验证仅聚焦失焦不保存 |
| TC-US06-05 | US-06 | P0 | e2e | 并发保存乱序返回，后者不被前者覆盖 | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22` | 单元验证前端串行化（保存中编辑不并发发请求，完成后立即再存）；未验证 DB 最终值、编辑区不回退、刷新后内容 |
| TC-US06-08 | US-06 | P0 | e2e | 新建无标题文章保存为"无标题"，地址栏切换 | 部分覆盖 | `tests/integration/post/create-endpoint.test.ts:21`<br>`tests/unit/post/content.test.ts:18`<br>`tests/e2e/editor-autosave.spec.ts:6` | 接口层空标题→无标题/草稿 201、空白标题→无标题、E2E 地址切换已验证；未在界面层测空标题新建，未断言页面不刷新/光标保留、总数 N+1 |
| TC-US06-09 | US-06 | P0 | e2e | 新建后连续保存不重复创建文章 | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22`<br>`tests/unit/admin/local-draft.test.ts:94` | 单元验证首次 POST 后改 PUT；创建挂起期间再编辑/Ctrl+S 只断言暂存迁移，未断言仅 1 次 POST、后续为 PUT、最终 body |
| TC-US06-22 | US-06 | P0 | ui-interaction | 状态转换：未保存 → 保存中… → 已保存 · 14:32 | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22`<br>`tests/unit/ui/save-indicator.test.tsx:22`<br>`tests/e2e/editor-autosave.spec.ts:6` | 状态机顺序 dirty→saving→saved（单元）与文案（组件）已测，E2E 见“未保存”→“已保存 · HH:mm”；页面层未断言“保存中…”，未用固定时钟验证 14:32 |
| TC-US06-23 | US-06 | P0 | ui-interaction | 状态转换：保存失败 → 重试 → 已保存 | 部分覆盖 | `tests/e2e/editor-local-draft.spec.ts:47`<br>`tests/unit/admin/autosave.test.ts:22` | 断网→保存失败→恢复后已保存已验证；未验证失败期间继续输入不丢字及其状态 |
| TC-US06-24 | US-06 | P1 | ui-interaction | 保存中继续输入，完成后立即再保存、不误显示"已保存" | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22` | 单元验证保存中编辑后完成即再保存（实现为立即再存而非 TC 写的再等 2s）；未断言首个响应后显示“未保存”及最终 DB=AB |
| TC-US06-27 | US-06 | P1 | ui-interaction | "已保存"时离开不弹确认 | 部分覆盖 | `tests/e2e/logout.spec.ts:50` | 已保存状态下经登出跳转离开无 dialog；未测 page.close(runBeforeUnload) 与站内链接离开 |
| TC-US06-28 | US-06 | P0 | ui-interaction | Ctrl/Cmd+S 立即保存且不弹"保存网页" | 部分覆盖 | `tests/e2e/editor-autosave.spec.ts:25` | 暂停时钟下 Ctrl/Cmd+S 立即发出保存已测；未断言 keydown defaultPrevented，未验证之后 2s 不再额外保存 |
| TC-US07-02 | US-07 | P0 | api | 列表接口返回全部状态文章与排序（等价类） | 部分覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` | 三类状态都返回、按更新时间倒序、条目字段不含正文已测；同 updatedAt 顺序稳定未测（契约条目不含 slug） |
| TC-US07-04 | US-07 | P1 | api | 标题关键字搜索不区分大小写 | 部分覆盖 | `tests/integration/post/list-endpoint.test.ts:21`<br>`tests/e2e/post-list-search.spec.ts:6` | 小写 q 命中大写标题已测；不匹配正文、首尾空格忽略、空 q 返回全部、中文子串未测 |
| TC-US07-05 | US-07 | P1 | security | 搜索特殊字符与注入（错误猜测） | 部分覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` | % 与 _ 按字面匹配、过长 q 400 已测；单/双引号、SQL 注入载荷、<script> 回显未测 |
| TC-US07-07 | US-07 | P1 | api | 分页边界值：20 / 21 / 40 / 41 篇 | 部分覆盖 | `tests/e2e/post-list-pagination.spec.ts:7`<br>`tests/integration/post/post-list.test.ts:30` | 仅 23/25 篇两页、1 页不显示分页；0/1/20/21/40/41 边界未逐一测 |
| TC-US07-08 | US-07 | P1 | api | 非法页码：超过末页 / 0 / -1 / abc | 部分覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` | 超末页返回空+total、0/abc/1.5 → 400 已测；-1、999999、页面 /admin?page=4 显示未测 |
| TC-US07-09 | US-07 | P2 | api | 筛选 + 搜索 + 分页组合（决策表） | 部分覆盖 | `tests/integration/post/list-endpoint.test.ts:21`<br>`tests/integration/post/post-list.test.ts:30` | 仅 status+q 组合单条命中；筛选+搜索+分页决策表 R1–R5（条数与页数）未测 |
| TC-US07-10 | US-07 | P0 | security | 未登录访问列表页 / 列表接口被拒 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115` | 未登录/旧会话访问 /admin 跳登录已测；GET /api/admin/posts 未登录 401 且不含标题未测（中间件测试只用 POST） |
| TC-US08-03 | US-08 | P1 | api | 发布日期等价类：空 → 今天；已填 → 保留 | 部分覆盖 | `tests/unit/post/publish-service.test.ts:15`<br>`tests/integration/post/public-list-endpoint.test.ts:21` | 空→发布当天、过去日期保留已验证；未来日期未测，23:59:59 上海时区边界未测 |
| TC-US08-04 | US-08 | P0 | api | 必填项缺失决策表 | 部分覆盖 | `tests/unit/post/publish-validation.test.ts:9`<br>`tests/unit/post/content.test.ts:18`<br>`tests/integration/post/publish-endpoint.test.ts:22` | 8 组合决策表、空白标题归一为无标题、422 MISSING_FIELDS 带 fields 已测；拒绝后仍为草稿、读者 404 未断言，R9 非法 slug 在保存时已拒（发布接口未测） |
| TC-US08-08 | US-08 | P1 | security | 读者端绕过尝试（错误猜测） | 部分覆盖 | `tests/integration/post/public-list-endpoint.test.ts:21`<br>`tests/integration/post/public-detail-endpoint.test.ts:21`<br>`tests/integration/post/published-query.test.ts:34` | ?status=draft 被忽略、大小写不符 404、工作稿 slug 查不到已测；?preview/?draft、?version=latest、id 代 slug、尾空格/斜杠、无会话 GET 管理端 401 未测 |
| TC-US08-09 | US-08 | P0 | performance | 发布/更新/撤回后触发重建，5 分钟内可见 | 部分覆盖 | `tests/integration/post/rebuild-hook.test.ts:40`<br>`tests/integration/post/rebuild-hook.test.ts:48`<br>`tests/unit/rebuild/deploy-hook.test.ts:22` | 本地验证发布/更新/撤回各触发一次 Deploy Hook、失败操作不触发；5 分钟内读者可见需预发布环境真实重建（本地不可测） |
| TC-US08-10 | US-08 | P0 | e2e | 发布前先保存未保存内容 | 部分覆盖 | `tests/e2e/editor-publish.spec.ts:7`<br>`tests/unit/admin/session-expired.test.tsx:70` | 防抖未到即点发布，读者读到含最新输入的内容、徽标“已发布”；未测前置保存失败时不发布 |
| TC-US08-13 | US-08 | P0 | api | 状态转换表（合法与非法转换） | 部分覆盖 | `tests/integration/post/publish-endpoint.test.ts:22`<br>`tests/integration/post/unpublish-endpoint.test.ts:21`<br>`tests/integration/post/save-endpoint.test.ts:25` | S1/S2/S4/S5/S7-S12/S15 均有断言；S6 仅派生状态单测；S14 只测不存在 id；S16 撤回后重新发布只断言 200，未验证 published_at 保持 |
| TC-US08-20 | US-08 | P1 | ui-interaction | 撤回确认框取消 / Esc 不改变状态 | 部分覆盖 | `tests/unit/ui/confirm-dialog.test.tsx:37` | 通用 ConfirmDialog 的取消/Esc 关闭与焦点回到触发按钮已测（删除场景）；撤回确认框取消后状态不变、不发请求未测 |
| TC-US08-21 | US-08 | P1 | ui-interaction | 成功提示与状态标记切换 | 部分覆盖 | `tests/e2e/editor-publish.spec.ts:7`<br>`tests/e2e/editor-publish-update.spec.ts:7` | 发布提示 role=status、徽标切换、保存后有修改标记、发布更新后回到已发布已测；返回 /admin 列表状态一致未测 |
| TC-US01-16 | US-01 | P1 | security | 伪造 X-Forwarded-For 等请求头无法绕过限流 | 线上 / 人工 | — | 需经真实 Cloudflare 边缘（CF-Connecting-IP 由边缘覆写），规格标注不可自动化；代码只读 CF-Connecting-IP |
| TC-US01-37 | US-01 | P0 | security | NFR：密码以不可逆哈希存储 | 线上 / 人工 | `tests/unit/auth/password.test.ts:14` | 规格标注需人工检查 Secrets / 仓库 / git 历史；自动化部分仅 AUTH-UT-01 验证 PBKDF2-SHA256×100000 加盐格式与篡改校验 |
| TC-US01-39 | US-01 | P2 | performance | NFR：登录接口响应时间 | 线上 / 人工 | — | P95 < 500ms 需预发环境经 Cloudflare 边缘串行压测，本地 workerd 不代表生产 |
| TC-US03-16 | US-03 | P2 | performance | 保存接口响应 P95 < 500ms | 线上 / 人工 | — | 需预发 Cloudflare 环境测 P95，本地不可判定 |
| TC-US05-21 | US-05 | P2 | performance | 200KB 上传接口响应时间 | 线上 / 人工 | — | 需部署后 Cloudflare 测试环境测服务端 P95 |
| TC-US06-21 | US-06 | P2 | performance | 保存接口响应时间 | 线上 / 人工 | — | 性能 P95 需 Cloudflare 测试环境串行 100 次，本地不可自动化 |
| TC-US07-11 | US-07 | P2 | performance | 列表接口性能（1000 篇） | 线上 / 人工 | — | 需预发环境真实 D1 + 1000 篇测 P95 |
| TC-US08-16 | US-08 | P2 | performance | 发布/更新接口性能 P95 < 500ms | 线上 / 人工 | — | 性能 P95 需预发布环境 100 篇压测 |

## 全部用例

<details><summary>展开（261 条）</summary>

| TC | SC | 场景 | 状态 | 测试 |
|----|----|------|------|------|
| TC-US01-01 | SC-LOGIN-01 | 正确凭据调用登录接口，返回会话 Cookie | 已覆盖 | `tests/integration/auth/login-endpoint.test.ts:79` |
| TC-US01-02 | SC-LOGIN-01 | 浏览器中正确凭据登录进入 /admin | 已覆盖 | `tests/e2e/login.spec.ts` |
| TC-US01-03 | SC-LOGIN-02 | 未登录访问编辑页 → 登录 → 回到原页面 | 已覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/e2e/editor-session-expired.spec.ts:27` |
| TC-US01-04 | SC-LOGIN-02 | 未登录访问各类 /admin/** 页面均跳转登录（等价类） | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115` |
| TC-US01-05 | SC-LOGIN-03 | 已登录访问登录页直接进入 /admin | 已覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/unit/auth/next.test.ts:17` |
| TC-US01-06 | SC-LOGIN-04 | 正确账号 + 错误密码登录失败 | 已覆盖 | `tests/integration/auth/login-endpoint.test.ts:79`<br>`tests/unit/auth/login-service.test.ts:30` |
| TC-US01-07 | SC-LOGIN-04 | 错误账号 + 正确密码，响应与"密码错"不可区分 | 部分覆盖 | `tests/unit/auth/login-service.test.ts:30` |
| TC-US01-08 | SC-LOGIN-04 | 账号字段 SQL 注入 / 特殊字符 | 部分覆盖 | `tests/integration/auth/login-endpoint.test.ts:79` |
| TC-US01-09 | SC-LOGIN-04 | 超长密码 / 超长账号不导致 5xx 或超时 | 无测试 | — |
| TC-US01-10 | SC-LOGIN-05 | 绕过前端直接提交空账号或空密码 | 部分覆盖 | `tests/integration/auth/login-endpoint.test.ts:79` |
| TC-US01-11 | SC-LOGIN-06 | 边界：连续失败 4 次后，第 5 次正确密码仍可登录 | 部分覆盖 | `tests/unit/auth/throttle.test.ts:16`<br>`tests/integration/auth/throttle-repo.test.ts:27`<br>`tests/integration/auth/throttle-repo.test.ts:51` |
| TC-US01-12 | SC-LOGIN-06 | 边界：连续失败 5 次后，第 6 次正确密码返回 429 | 已覆盖 | `tests/integration/auth/throttle-repo.test.ts:51`<br>`tests/unit/auth/login-service.test.ts:30`<br>`tests/integration/auth/login-endpoint.test.ts:79` |
| TC-US01-13 | SC-LOGIN-06 | 锁定期内错误密码同样返回 429（不泄露密码对错） | 已覆盖 | `tests/unit/auth/login-service.test.ts:30`<br>`tests/integration/auth/throttle-repo.test.ts:51` |
| TC-US01-14 | SC-LOGIN-06 | 限流按 IP 隔离：IP-A 锁定不影响 IP-B | 已覆盖 | `tests/integration/auth/login-endpoint.test.ts:79` |
| TC-US01-15 | SC-LOGIN-06, SC-LOGIN-07 | "连续"语义：中间一次成功会清零计数 | 已覆盖 | `tests/unit/auth/login-service.test.ts:30`<br>`tests/unit/auth/throttle.test.ts:16` |
| TC-US01-16 | SC-LOGIN-06 | 伪造 X-Forwarded-For 等请求头无法绕过限流 | 线上 / 人工 | — |
| TC-US01-17 | SC-LOGIN-07 | 边界：锁定后 14:59 仍为 429 | 部分覆盖 | `tests/unit/auth/throttle.test.ts:16` |
| TC-US01-18 | SC-LOGIN-07 | 边界：锁定后 15:01 登录成功且计数清零 | 已覆盖 | `tests/unit/auth/throttle.test.ts:16`<br>`tests/integration/auth/throttle-repo.test.ts:27` |
| TC-US01-19 | SC-LOGIN-08 | 无 Cookie 调用全部写接口返回 401，数据不变 | 已覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/media/upload-endpoint.test.ts:163`<br>`tests/integration/post/delete-endpoint.test.ts:79` |
| TC-US01-20 | SC-LOGIN-08 | 伪造 / 篡改 Cookie 调用全部写接口返回 401 | 部分覆盖 | `tests/integration/auth/logout-endpoint.test.ts:115`<br>`tests/unit/auth/session-check.test.ts:13` |
| TC-US01-21 | SC-LOGIN-08 | 对照组：有效会话调用写接口成功 | 已覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/e2e/support/admin.ts:94`<br>`tests/e2e/mainline-journey.spec.ts:14` |
| TC-US01-22 | SC-LOGIN-08 | 写接口 Origin 校验（CSRF）：缺失 / 外域 Origin 被拒 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/media/upload-endpoint.test.ts:163`<br>`tests/integration/post/delete-endpoint.test.ts:79` |
| TC-US01-23 | SC-LOGIN-01 | 登录接口 Origin 校验（Login CSRF） | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68` |
| TC-US01-24 | SC-LOGIN-09 | 边界：会话 6 天 23:59 时仍有效 | 已覆盖 | `tests/integration/auth/session-repo.test.ts:17`<br>`tests/integration/auth/middleware.test.ts:68` |
| TC-US01-25 | SC-LOGIN-09, SC-LOGIN-08 | 边界：会话 7 天 + 1 分钟后页面跳登录、接口 401 | 已覆盖 | `tests/unit/auth/session-check.test.ts:13`<br>`tests/integration/auth/session-repo.test.ts:17`<br>`tests/integration/auth/middleware.test.ts:68` |
| TC-US01-26 | SC-LOGIN-09, SC-LOGIN-01 | 会话状态转换：无 → 有效 → 过期 → 重新登录 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/e2e/login.spec.ts:7`<br>`tests/unit/auth/session-check.test.ts:13` |
| TC-US01-27 | SC-LOGIN-11 | next 参数开放重定向变体全部回落到 /admin | 部分覆盖 | `tests/unit/auth/next.test.ts:17` |
| TC-US01-28 | SC-LOGIN-11, SC-LOGIN-03 | 已登录访问带恶意 next 的登录页仍到 /admin | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/unit/auth/next.test.ts:17` |
| TC-US01-29 | SC-LOGIN-05 | UI：账号或密码为空时"登录"按钮禁用 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js` |
| TC-US01-30 | SC-LOGIN-05 | UI：填写后启用、清空任一字段后再次禁用 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js` |
| TC-US01-31 | SC-LOGIN-10 | UI：提交中按钮禁用 + 加载指示，连击仅发一次请求 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js`<br>`tests/e2e/login.spec.ts` |
| TC-US01-32 | SC-LOGIN-10 | UI：请求失败后加载态结束、按钮恢复 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js` |
| TC-US01-33 | SC-LOGIN-04 | UI：错误提示文案，密码清空、账号保留 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js`<br>`tests/e2e/login.spec.ts` |
| TC-US01-34 | SC-LOGIN-06 | UI：锁定提示文案 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-login-ui.js` |
| TC-US01-35 | SC-LOGIN-01, SC-LOGIN-04 | NFR：密码与会话 Token 不出现在日志 / 响应 | 部分覆盖 | `tests/integration/auth/logout-endpoint.test.ts:43`<br>`tests/integration/auth/login-endpoint.test.ts:79` |
| TC-US01-36 | SC-LOGIN-01 | NFR：会话 Cookie 属性与 Token 强度 | 部分覆盖 | `tests/integration/auth/login-endpoint.test.ts:79`<br>`tests/unit/auth/login-service.test.ts:30`<br>`tests/e2e/login.spec.ts:7` |
| TC-US01-37 | SC-LOGIN-01 | NFR：密码以不可逆哈希存储 | 线上 / 人工 | `tests/unit/auth/password.test.ts:14` |
| TC-US01-38 | SC-LOGIN-01 | NFR：防会话固定（登录后签发新 Token） | 部分覆盖 | `tests/unit/auth/login-service.test.ts:30`<br>`tests/unit/auth/session-check.test.ts:13` |
| TC-US01-39 | SC-LOGIN-01 | NFR：登录接口响应时间 | 线上 / 人工 | — |
| TC-US02-01 | SC-LOGOUT-01 | 有效会话调用登出接口，Cookie 被清除 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-02 | SC-LOGOUT-01 | 从后台不同页面点击"登出"回到登录页（等价类） | 已覆盖 | `tests/e2e/logout.spec.ts` |
| TC-US02-03 | SC-LOGOUT-02 | 登出后携带旧 Cookie 调用保存文章接口返回 401 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-04 | SC-LOGOUT-02 | 旧 Cookie 对全部写接口与后台页面均被拒绝（权限矩阵） | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-05 | SC-LOGOUT-02 | 会话状态转换：有效 → 登出 → 重新登录 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-06 | SC-LOGOUT-02 | 多会话：登出 A 后 A 失效，B 的行为符合设计 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-07 | SC-LOGOUT-04 | 无 Cookie 调用登出返回成功并指向登录页 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-08 | SC-LOGOUT-04 | 伪造 / 过期 / 已登出 Cookie 调用登出不报错（等价类） | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-09 | SC-LOGOUT-04 | 同一会话重复登出两次均成功（幂等） | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-10 | SC-LOGOUT-01 | 登出接口 CSRF：外域 / 缺失 Origin 不能登出 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-11 | SC-LOGOUT-01 | 登出不能通过 GET 触发（防 `<img>` 式 CSRF） | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US02-12 | SC-LOGOUT-01 | 登出后浏览器"后退"不显示后台内容 | 已覆盖 | `tests/e2e/logout.spec.ts` |
| TC-US02-13 | SC-LOGOUT-03 | UI：有未保存修改点"登出"弹出确认，取消后留在原页 | 已覆盖 | `tests/e2e/logout.spec.ts`<br>`tests/unit/admin/editor-logout.test.tsx` |
| TC-US02-14 | SC-LOGOUT-03 | UI：确认弹窗中选择确定后完成登出 | 已覆盖 | `tests/e2e/logout.spec.ts`<br>`tests/unit/admin/editor-logout.test.tsx` |
| TC-US02-15 | SC-LOGOUT-03, SC-LOGOUT-01 | UI：无未保存修改时不弹窗，直接登出 | 已覆盖 | `tests/e2e/logout.spec.ts`<br>`tests/unit/admin/editor-logout.test.tsx` |
| TC-US02-16 | SC-LOGOUT-03 | UI：保存完成后修改状态复位，不再弹窗 | 已覆盖 | `tests/e2e/logout.spec.ts` |
| TC-US02-17 | SC-LOGOUT-01 | NFR：登出过程不泄露 Token，清除 Cookie 属性正确 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts` |
| TC-US03-01 | SC-POSTINFO-02 | API 创建草稿成功 | 已覆盖 | `tests/integration/post/create-endpoint.test.ts:21`<br>`tests/integration/post/get-endpoint.test.ts:19` |
| TC-US03-02 | SC-POSTINFO-02, SC-POSTINFO-03 | API 更新后读取为最新内容 | 已覆盖 | `tests/integration/post/save-endpoint.test.ts:25`<br>`tests/unit/post/save-service.test.ts:15`<br>`tests/integration/post/get-endpoint.test.ts:19` |
| TC-US03-03 | SC-POSTINFO-02 | 标题等价类与边界（空存为"无标题"/1/200/201/emoji） | 部分覆盖 | `tests/unit/post/content.test.ts:18`<br>`tests/integration/post/create-endpoint.test.ts:21` |
| TC-US03-04 | SC-POSTINFO-04, SC-POSTINFO-06 | slug 生成规则决策表（英文/中文/混合） | 部分覆盖 | `tests/unit/post/slug.test.ts:8`<br>`tests/unit/admin/post-settings-drawer.test.tsx:46` |
| TC-US03-05 | SC-POSTINFO-06 | 中文标题空 slug 草稿可保存、发布被拒 | 已覆盖 | `tests/integration/post/create-endpoint.test.ts:21`<br>`tests/integration/post/publish-endpoint.test.ts:22`<br>`tests/unit/post/publish-validation.test.ts:9` |
| TC-US03-06 | SC-POSTINFO-07 | slug 格式等价类与错误猜测 | 部分覆盖 | `tests/unit/post/slug.test.ts:8`<br>`tests/unit/post/content.test.ts:18`<br>`tests/integration/post/create-endpoint.test.ts:21` |
| TC-US03-07 | SC-POSTINFO-07 | slug 长度边界 1/80/81 | 部分覆盖 | `tests/unit/post/slug.test.ts:8` |
| TC-US03-08 | SC-POSTINFO-08 | slug 与其他文章重复返回 409 | 已覆盖 | `tests/integration/post/save-endpoint.test.ts:25`<br>`tests/integration/post/create-endpoint.test.ts:21`<br>`tests/unit/post/slug-uniqueness.test.ts:21` |
| TC-US03-09 | SC-POSTINFO-08 | 并发写入相同 slug 竞态 | 已覆盖 | `tests/integration/post/slug-race.test.ts:26`<br>`tests/integration/post/slug-race.test.ts:33` |
| TC-US03-10 | SC-POSTINFO-09 | 摘要边界 199/200/201 | 部分覆盖 | `tests/unit/post/content.test.ts:18`<br>`tests/integration/post/create-endpoint.test.ts:21` |
| TC-US03-11 | SC-POSTINFO-10 | 标签保存、去重与补全查询 | 已覆盖 | `tests/unit/post/content.test.ts:18`<br>`tests/integration/post/tags-endpoint.test.ts:19`<br>`tests/integration/post/tags-query.test.ts:25` |
| TC-US03-12 | SC-POSTINFO-11 | API 读取不存在的文章返回 404 | 已覆盖 | `tests/integration/post/get-endpoint.test.ts:19`<br>`tests/integration/post/save-endpoint.test.ts:25`<br>`tests/unit/post/delete-service.test.ts:46` |
| TC-US03-13 | SC-POSTINFO-02, SC-POSTINFO-03, SC-POSTINFO-11 | 未登录访问写接口与编辑页被拒 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115`<br>`tests/unit/auth/session-check.test.ts:13` |
| TC-US03-14 | SC-POSTINFO-02 | 写接口 Origin 校验（CSRF） | 已覆盖 | `tests/integration/auth/middleware.test.ts:68` |
| TC-US03-15 | SC-POSTINFO-02, SC-POSTINFO-10 | 标题/标签/摘要中的 HTML 作为纯文本存储与回显 | 部分覆盖 | `tests/e2e/editor-delete.spec.ts:57`<br>`tests/unit/admin/delete-dialog.test.tsx` |
| TC-US03-16 | SC-POSTINFO-02 | 保存接口响应 P95 < 500ms | 线上 / 人工 | — |
| TC-US03-17 | SC-POSTINFO-01 | 新建文章显示空白表单 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js` |
| TC-US03-18 | SC-POSTINFO-02 | Ctrl/Cmd+S 保存后地址栏变为编辑地址 | 已覆盖 | `tests/e2e/editor-autosave.spec.ts` |
| TC-US03-19 | SC-POSTINFO-03 | 打开已有文章显示最新保存内容 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js`<br>`tests/e2e/editor-load.spec.ts` |
| TC-US03-20 | SC-POSTINFO-04, SC-POSTINFO-05 | slug 自动跟随 vs 手动修改决策表 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js` |
| TC-US03-21 | SC-POSTINFO-06 | 中文标题提示"请填写英文 slug" | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js` |
| TC-US03-22 | SC-POSTINFO-07 | 非法 slug 行内提示且不被保存 | 已覆盖 | `tests/e2e/editor-slug-conflict.spec.ts` |
| TC-US03-23 | SC-POSTINFO-08 | 重复 slug 提示"slug 已存在"且保持原值 | 已覆盖 | `tests/e2e/editor-slug-conflict.spec.ts` |
| TC-US03-24 | SC-POSTINFO-09 | 摘要超 200 字计数变红并提示 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js` |
| TC-US03-25 | SC-POSTINFO-10 | 标签添加、自动补全、删除 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js`<br>`tests/unit/admin/tag-input.test.tsx` |
| TC-US03-26 | SC-POSTINFO-11 | 编辑页访问不存在文章显示 404 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-editor-ui.js`<br>`tests/e2e/editor-load.spec.ts` |
| TC-US04-01 | SC-PREVIEW-01 | GFM 渲染矩阵 | 部分覆盖 | `tests/unit/markdown/gfm.test.ts:33`<br>`tests/e2e/editor-preview.spec.ts:23`<br>`tests/unit/markdown/isomorphic.test.ts:7` |
| TC-US04-02 | SC-PREVIEW-02 | 代码块语法高亮等价类 | 已覆盖 | `tests/unit/markdown/code.test.ts` |
| TC-US04-03 | SC-PREVIEW-03 | 渲染器 XSS 载荷清单 | 已覆盖 | `tests/unit/markdown/xss.test.ts` |
| TC-US04-04 | SC-PREVIEW-03 | 安全内容不被误杀 | 已覆盖 | `tests/unit/markdown/xss.test.ts` |
| TC-US04-05 | SC-PREVIEW-03 | 预览区载荷不执行（浏览器端） | 已覆盖 | `tests/e2e/editor-preview.spec.ts`<br>`tests/unit/markdown/xss.test.ts` |
| TC-US04-06 | SC-PREVIEW-01, SC-PREVIEW-02, SC-PREVIEW-03 | 预览 HTML 与读者端渲染一致 | 已覆盖 | `tests/e2e/editor-scroll-sync.spec.ts`<br>`tests/e2e/support/post-list.ts`<br>`tests/unit/editor/scroll-sync.test.ts` |
| TC-US04-07 | SC-PREVIEW-04 | 万字 + 20 代码块预览更新 < 300ms | 部分覆盖 | `tests/spike/markdown-browser.spec.ts:13` |
| TC-US04-08 | SC-PREVIEW-04 | 长文连续输入不卡顿 | 无测试 | — |
| TC-US04-09 | SC-PREVIEW-01 | 输入 GFM 后预览实时更新 | 已覆盖 | `tests/e2e/editor-preview.spec.ts` |
| TC-US04-10 | SC-PREVIEW-02 | 高亮主题随亮/暗模式切换 | 部分覆盖 | `tests/unit/markdown/code.test.ts:21` |
| TC-US04-11 | SC-PREVIEW-05 | 空正文显示占位 | 无测试 | — |
| TC-US04-15 | SC-PREVIEW-09 | 渲染失败保留上次预览并提示，下次成功后恢复 | 已覆盖 | `tests/unit/admin/markdown-preview.test.tsx` |
| TC-US04-12 | SC-PREVIEW-06 | 宽屏并排与视图切换（含 768 边界） | 已覆盖 | `tests/e2e/editor-view-mode.spec.ts` |
| TC-US04-13 | SC-PREVIEW-07 | 窄屏 Tab 切换（含 767 边界） | 已覆盖 | `tests/e2e/editor-view-mode.spec.ts` |
| TC-US04-14 | SC-PREVIEW-08 | 编辑区滚动时预览同步滚动 | 已覆盖 | `tests/e2e/editor-scroll-sync.spec.ts` |
| TC-US05-01 | SC-IMAGE-01 | 粘贴 200KB png 上传并插入引用 | 已覆盖 | `tests/e2e/editor-image-paste.spec.ts` |
| TC-US05-02 | SC-IMAGE-02 | 拖入 photo.jpg 上传并插入到放置位置 | 已覆盖 | `tests/e2e/editor-image-drop.spec.ts` |
| TC-US05-03 | SC-IMAGE-03 | 工具栏选择 diagram.webp 上传 | 已覆盖 | `tests/e2e/editor-image-drop.spec.ts` |
| TC-US05-04 | SC-IMAGE-01, SC-IMAGE-03 | 等价类：gif 与 1x1.png 最小有效文件 | 已覆盖 | `tests/e2e/image-api.spec.ts`<br>`tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-05 | SC-IMAGE-04 | 多张图片乱序完成仍按 a、b、c 顺序插入 | 已覆盖 | `tests/e2e/editor-image-drop.spec.ts` |
| TC-US05-06 | SC-IMAGE-05 | 边界：恰好 50MB 接受 | 已覆盖 | `tests/e2e/editor-image-drop.spec.ts`<br>`tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-07 | SC-IMAGE-05 | 边界：50MB+1 字节前端拒绝 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US05-08 | SC-IMAGE-05 | 60MB jpg 绕过前端直调接口被拒 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-09 | SC-IMAGE-06 | 拖入 svg 被前端拒绝 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US05-10 | SC-IMAGE-06 | 工具栏选择 pdf 被前端拒绝 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US05-11 | SC-IMAGE-04, SC-IMAGE-05, SC-IMAGE-06 | 混合拖入：仅合法图片被插入 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US05-12 | SC-IMAGE-07 | 离线粘贴：移除占位并提示 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US05-13 | SC-IMAGE-07 | 服务端 500 / 请求中断：移除占位并提示 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US05-14 | SC-IMAGE-08 | HTML 改名 .png 被服务端拒绝 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-15 | SC-IMAGE-08 | SVG 改名 .png 且伪造 Content-Type 被拒绝 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-16 | SC-IMAGE-08 | 0 字节文件被拒绝 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-17 | SC-IMAGE-08 | 未登录上传返回 401 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-18 | SC-IMAGE-08 | 跨站 Origin 上传被拒（CSRF） | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US05-19 | SC-IMAGE-01, SC-IMAGE-08 | 对象 key 随机不可猜测，同名同内容不覆盖 | 已覆盖 | `tests/integration/media/read-route.test.ts` |
| TC-US05-20 | SC-IMAGE-02, SC-IMAGE-08 | 路径穿越 / Unicode 文件名 | 已覆盖 | `tests/integration/media/read-route.test.ts` |
| TC-US05-21 | SC-IMAGE-01 | 200KB 上传接口响应时间 | 线上 / 人工 | — |
| TC-US05-22 | SC-IMAGE-02 | 拖放高亮提示"松开以上传" | 已覆盖 | `tests/e2e/editor-image-drop.spec.ts` |
| TC-US05-23 | SC-IMAGE-01 | 占位文本出现与替换、预览区渲染图片 | 已覆盖 | `tests/e2e/editor-image-paste.spec.ts` |
| TC-US05-24 | SC-IMAGE-09 | 上传期间在占位符前继续输入 | 已覆盖 | `tests/e2e/editor-image-paste.spec.ts` |
| TC-US05-25 | SC-IMAGE-07, SC-IMAGE-09 | 上传失败时上传期间输入的文字保留 | 已覆盖 | `tests/e2e/editor-image-errors.spec.ts` |
| TC-US06-01 | SC-AUTOSAVE-01 | 停止输入 2 秒后保存，数据库与编辑区一致 | 已覆盖 | `tests/e2e/editor-autosave.spec.ts:6`<br>`tests/unit/admin/autosave.test.ts:22`<br>`tests/integration/post/save-endpoint.test.ts:25` |
| TC-US06-02 | SC-AUTOSAVE-01 | 边界：停止 1.9s 不保存，2.0s 保存 | 已覆盖 | `tests/unit/admin/autosave.test.ts:22` |
| TC-US06-03 | SC-AUTOSAVE-01 | 持续输入去抖，仅停止后保存 1 次 | 无测试 | — |
| TC-US06-04 | SC-AUTOSAVE-01 | 等价类：标题、文章信息修改同样触发 | 部分覆盖 | `tests/e2e/editor-autosave.spec.ts:6` |
| TC-US06-05 | SC-AUTOSAVE-01, SC-AUTOSAVE-02 | 并发保存乱序返回，后者不被前者覆盖 | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22` |
| TC-US06-06 | SC-AUTOSAVE-01 | 双标签页编辑同一篇，后写覆盖且不报错 | 无测试 | — |
| TC-US06-07 | SC-AUTOSAVE-03 | 关闭后重开恢复最后保存内容 | 已覆盖 | `tests/e2e/editor-autosave.spec.ts:6`<br>`tests/e2e/editor-load.spec.ts:5`<br>`tests/e2e/editor-local-draft.spec.ts:47` |
| TC-US06-08 | SC-AUTOSAVE-04 | 新建无标题文章保存为"无标题"，地址栏切换 | 部分覆盖 | `tests/integration/post/create-endpoint.test.ts:21`<br>`tests/unit/post/content.test.ts:18`<br>`tests/e2e/editor-autosave.spec.ts:6` |
| TC-US06-09 | SC-AUTOSAVE-04 | 新建后连续保存不重复创建文章 | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22`<br>`tests/unit/admin/local-draft.test.ts:94` |
| TC-US06-10 | SC-AUTOSAVE-05 | 空白新建页离开不产生草稿 | 无测试 | — |
| TC-US06-11 | SC-AUTOSAVE-06 | 断网本地暂存，恢复后自动重试 | 已覆盖 | `tests/e2e/editor-local-draft.spec.ts` |
| TC-US06-12 | SC-AUTOSAVE-06 | 服务端 500 / 请求中断后自动重试 | 已覆盖 | `tests/unit/admin/autosave.test.ts:22`<br>`tests/unit/admin/local-draft.test.ts:61`<br>`tests/unit/ui/save-indicator.test.tsx:22` |
| TC-US06-13 | SC-AUTOSAVE-07 | 本地暂存更新：提示并恢复 | 已覆盖 | `tests/e2e/editor-local-draft.spec.ts` |
| TC-US06-14 | SC-AUTOSAVE-07 | 本地暂存更新：点击"丢弃" | 已覆盖 | `tests/e2e/editor-local-draft.spec.ts` |
| TC-US06-15 | SC-AUTOSAVE-07 | 边界：本地暂存更旧 / 时间相等不提示 | 已覆盖 | `tests/e2e/editor-local-draft.spec.ts` |
| TC-US06-16 | SC-AUTOSAVE-08 | 已发布文章自动保存，读者仍见 V1 | 已覆盖 | `tests/e2e/editor-publish-update.spec.ts:7`<br>`tests/integration/post/public-detail-endpoint.test.ts:21`<br>`tests/integration/post/get-endpoint.test.ts:19` |
| TC-US06-17 | SC-AUTOSAVE-08 | 自动保存接口不改变发布状态字段 | 已覆盖 | `tests/integration/post/save-endpoint.test.ts:25`<br>`tests/unit/post/save-service.test.ts:15`<br>`tests/integration/post/public-detail-endpoint.test.ts:21` |
| TC-US06-18 | SC-AUTOSAVE-10 | 会话过期：提示重新登录、本地暂存、登录后保存成功 | 已覆盖 | `tests/e2e/editor-session-expired.spec.ts`<br>`tests/unit/admin/session-expired.test.tsx` |
| TC-US06-19 | SC-AUTOSAVE-10 | 未登录直调保存/新建接口返回 401 | 已覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115`<br>`tests/unit/auth/session-check.test.ts:13` |
| TC-US06-20 | SC-AUTOSAVE-01 | 跨站 Origin 保存被拒（CSRF） | 已覆盖 | `tests/integration/auth/middleware.test.ts:68` |
| TC-US06-21 | SC-AUTOSAVE-01 | 保存接口响应时间 | 线上 / 人工 | — |
| TC-US06-22 | SC-AUTOSAVE-02 | 状态转换：未保存 → 保存中… → 已保存 · 14:32 | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22`<br>`tests/unit/ui/save-indicator.test.tsx:22`<br>`tests/e2e/editor-autosave.spec.ts:6` |
| TC-US06-23 | SC-AUTOSAVE-02, SC-AUTOSAVE-06 | 状态转换：保存失败 → 重试 → 已保存 | 部分覆盖 | `tests/e2e/editor-local-draft.spec.ts:47`<br>`tests/unit/admin/autosave.test.ts:22` |
| TC-US06-24 | SC-AUTOSAVE-02 | 保存中继续输入，完成后立即再保存、不误显示"已保存" | 部分覆盖 | `tests/unit/admin/autosave.test.ts:22` |
| TC-US06-25 | SC-AUTOSAVE-10 | 发布时会话过期跳登录页 | 已覆盖 | `tests/e2e/editor-session-expired.spec.ts`<br>`tests/unit/admin/session-expired.test.tsx` |
| TC-US06-26 | SC-AUTOSAVE-09 | "未保存"/"保存中…"时离开弹确认 | 已覆盖 | `tests/e2e/editor-autosave.spec.ts` |
| TC-US06-27 | SC-AUTOSAVE-09 | "已保存"时离开不弹确认 | 部分覆盖 | `tests/e2e/logout.spec.ts:50` |
| TC-US06-28 | SC-AUTOSAVE-11 | Ctrl/Cmd+S 立即保存且不弹"保存网页" | 部分覆盖 | `tests/e2e/editor-autosave.spec.ts:25` |
| TC-US06-29 | SC-AUTOSAVE-11 | 去抖等待中按 Ctrl+S 只保存 1 次 | 无测试 | — |
| TC-US10-01 | SC-TOOLBAR-01, SC-TOOLBAR-02 | 行内格式变换矩阵 | 已覆盖 | `tests/unit/editor/format-commands.test.ts` |
| TC-US10-02 | SC-TOOLBAR-03 | 行级前缀切换矩阵 | 已覆盖 | `tests/unit/editor/format-commands.test.ts` |
| TC-US10-03 | SC-TOOLBAR-01, SC-TOOLBAR-06 | 点击加粗后撤销还原 | 已覆盖 | `tests/e2e/editor-toolbar.spec.ts` |
| TC-US10-04 | SC-TOOLBAR-04 | 快捷键执行命令并拦截默认行为 | 已覆盖 | `tests/e2e/editor-toolbar.spec.ts` |
| TC-US10-05 | SC-TOOLBAR-05 | 组字期间快捷键不触发 | 已覆盖 | `tests/e2e/editor-toolbar.spec.ts` |
| TC-US10-06 | SC-TOOLBAR-07 | 悬停 400ms 显示提示与键帽 | 已覆盖 | `tests/e2e/editor-tooltip.spec.ts` |
| TC-US10-07 | SC-TOOLBAR-08 | 相邻按钮共用一个提示 | 已覆盖 | `tests/e2e/editor-tooltip.spec.ts` |
| TC-US10-08 | SC-TOOLBAR-09 | 键盘聚焦显示、Esc 关闭 | 已覆盖 | `tests/e2e/editor-tooltip.spec.ts` |
| TC-US10-09 | SC-TOOLBAR-10 | 手机长按显示提示且不触发操作 | 已覆盖 | `tests/e2e/editor-tooltip.spec.ts` |
| TC-US10-10 | SC-TOOLBAR-11 | 顶栏与抽屉图标按钮的提示 | 已覆盖 | `tests/e2e/editor-tooltip.spec.ts` |
| TC-US11-01 | SC-LIVE-01 | 拖入 OPPO 动态照片，插入一条 `#live` 引用 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-02 | SC-LIVE-01 | 上传结果：R2 中有 jpg 和 `.live.mp4`，key 格式与宽高、主色正确 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US11-03 | — | ~~Chromium 拖入单张 HEIC，上传的是 JPEG~~（已删除，2026-10-15） | 已删除 | — |
| TC-US11-04 | — | ~~WebKit 原生解码 HEIC，结果与 Chromium 一致~~（已删除，2026-10-15） | 已删除 | — |
| TC-US11-05 | SC-LIVE-03 | Motion Photo（`Item:Length`）切出视频，静态图不含视频字节 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-06 | SC-LIVE-03 | 等价类：旧版 MicroVideoOffset 格式；普通 JPEG 不误识别 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-07 | SC-LIVE-04 | 混合批次按顺序插入，只有动态照片带 `#live` | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-08 | — | ~~错误猜测：文件名大小写不同仍然配对~~（已删除，2026-10-15） | 已删除 | — |
| TC-US11-09 | SC-LIVE-06 | 视频只转封装后 16.4MB，退回普通图片并提示 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-10 | SC-LIVE-06 | 边界：视频恰好 10MB 接受 / 10MB+1 退回 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-11 | SC-LIVE-06 | 绕过前端直接上传 > 10MB 视频，服务端拒绝 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US11-12 | — | ~~只拖入视频，不上传并提示~~（已删除，2026-10-15） | 已删除 | — |
| TC-US11-13 | SC-LIVE-01 | 绕过前端只上传视频字段，服务端拒绝 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US11-14 | SC-LIVE-08 | 上传请求失败，图片和视频都不保留 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-15 | SC-LIVE-08 | 服务端写视频失败时回滚已写入的图片 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US11-16 | SC-LIVE-09 | 不支持 H.264 编码，保留 HEVC 并提示 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-17 | SC-LIVE-12 | "插入图片"选择动态照片，同样识别 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-18 | — | ~~损坏的 HEIC：提示并且不上传~~（已删除，2026-10-15） | 已删除 | — |
| TC-US11-19 | SC-LIVE-01, SC-LIVE-08 | 安全：伪造视频魔数、未登录、跨站 Origin | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US11-20 | SC-LIVE-01 | 安全：客户端伪造宽高或主色参数，服务端校验 | 已覆盖 | `tests/integration/media/upload-endpoint.test.ts` |
| TC-US11-21 | SC-LIVE-01 | 性能：实况照片从拖入到插入引用 < 15s（首次加载组件） | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts`<br>`tests/fixtures/live/motion-photos.ts`<br>`tests/unit/upload/extract-motion-photo.test.ts` |
| TC-US11-22 | SC-LIVE-05 | 占位依次显示"处理中…"→"上传中…"，预览占位块，请求带主色与宽高 | 已覆盖 | `tests/e2e/live-photo-upload.spec.ts` |
| TC-US11-23 | SC-LIVE-10 | 预览中桌面悬停播放、移出复原 | 已覆盖 | `tests/e2e/live-photo-playback.spec.ts` |
| TC-US11-24 | SC-LIVE-10 | 手机长按播放、松手复原，不弹系统菜单 | 已覆盖 | `tests/e2e/live-photo-playback.spec.ts` |
| TC-US11-25 | SC-LIVE-11 | 视频无法解码：只显示静态图，隐藏 LIVE | 已覆盖 | `tests/e2e/live-photo-playback.spec.ts` |
| TC-US12-01 | SC-LAYOUT-01 | `#wide` 渲染为宽图并预留宽高比 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-02 | SC-LAYOUT-02 | 2 / 3 / 9 张图片的段落渲染为网格 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-03 | SC-LAYOUT-03 | 首张 `#accordion` 且 3 / 7 张渲染为手风琴 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-04 | SC-LAYOUT-04 | 边界：手风琴 2 张 / 8 张退回网格；网格 10 张折行 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-05 | SC-LAYOUT-05 | 图片与文字同段、图片之间空行，不成组 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-06 | SC-LAYOUT-06 | title 渲染为图注；无 title 不显示；alt 保留 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-07 | SC-LAYOUT-10 | 未知标记、外链、不符合命名的文件名按普通图显示 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-08 | SC-LAYOUT-10 | 安全：标记和 title 中的注入内容被过滤 | 已覆盖 | `tests/unit/markdown/image-plugins.test.ts` |
| TC-US12-09 | SC-LAYOUT-07 | 单图菜单切换宽图，改写源码，⌘Z 撤销 | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-10 | SC-LAYOUT-07 | 已有 `#live` 时开 / 关宽图，标记合并正确 | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-11 | SC-LAYOUT-08 | 组图菜单：网格 ↔ 手风琴 ↔ 拆成单图 | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-12 | SC-LAYOUT-08 | 张数不在 3–7 时"手风琴"不可用并提示 | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-13 | SC-LAYOUT-09 | 手机点按出现菜单，点外部关闭，可点区域 ≥ 44px | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-14 | SC-LAYOUT-11 | 菜单打开期间源码中删除该图：菜单关闭，源码不被改写 | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-15 | SC-LAYOUT-11 | 同一 URL 出现两次，菜单只改被操作的那一张 | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US12-16 | SC-LAYOUT-12 | 底栏"图片写法"说明的打开、内容、Esc 关闭、焦点回归 | 已覆盖 | `tests/e2e/image-syntax-help.spec.ts` |
| TC-US12-17 | SC-LAYOUT-13 | 继续输入时，已加载的图片不重新加载、不重新播放动画 | 已覆盖 | `tests/e2e/image-layout.spec.ts` |
| TC-US12-18 | SC-LAYOUT-07, SC-LAYOUT-08 | 菜单可用键盘操作（Tab 到图片、Enter 打开、方向键、Esc） | 已覆盖 | `tests/e2e/image-menu.spec.ts` |
| TC-US07-01 | SC-POSTLIST-01 | 列表按更新时间倒序，显示三种状态与行字段 | 已覆盖 | `tests/e2e/post-list.spec.ts` |
| TC-US07-02 | SC-POSTLIST-01 | 列表接口返回全部状态文章与排序（等价类） | 部分覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` |
| TC-US07-03 | SC-POSTLIST-04 | 状态筛选等价类（全部 / 草稿 / 已发布 / 非法值） | 已覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` |
| TC-US07-04 | SC-POSTLIST-05 | 标题关键字搜索不区分大小写 | 部分覆盖 | `tests/integration/post/list-endpoint.test.ts:21`<br>`tests/e2e/post-list-search.spec.ts:6` |
| TC-US07-05 | SC-POSTLIST-05, SC-POSTLIST-07 | 搜索特殊字符与注入（错误猜测） | 部分覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` |
| TC-US07-06 | SC-POSTLIST-08 | 分页：45 篇 → 3 页，第 3 页 5 篇 | 已覆盖 | `tests/integration/post/post-list.test.ts:30` |
| TC-US07-07 | SC-POSTLIST-08 | 分页边界值：20 / 21 / 40 / 41 篇 | 部分覆盖 | `tests/e2e/post-list-pagination.spec.ts:7`<br>`tests/integration/post/post-list.test.ts:30` |
| TC-US07-08 | SC-POSTLIST-08 | 非法页码：超过末页 / 0 / -1 / abc | 部分覆盖 | `tests/integration/post/post-list.test.ts:30`<br>`tests/integration/post/list-endpoint.test.ts:21` |
| TC-US07-09 | SC-POSTLIST-04, SC-POSTLIST-05, SC-POSTLIST-08 | 筛选 + 搜索 + 分页组合（决策表） | 部分覆盖 | `tests/integration/post/list-endpoint.test.ts:21`<br>`tests/integration/post/post-list.test.ts:30` |
| TC-US07-10 | SC-POSTLIST-01 | 未登录访问列表页 / 列表接口被拒 | 部分覆盖 | `tests/integration/auth/middleware.test.ts:68`<br>`tests/integration/auth/logout-endpoint.test.ts:115` |
| TC-US07-11 | SC-POSTLIST-01 | 列表接口性能（1000 篇） | 线上 / 人工 | — |
| TC-US07-12 | SC-POSTLIST-01 | 状态标记渲染（含 dirty 判定） | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js` |
| TC-US07-13 | SC-POSTLIST-02 | 点击标题进入写文章页 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js` |
| TC-US07-14 | SC-POSTLIST-03 | 点击"新建文章"进入空白写文章页 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js` |
| TC-US07-15 | SC-POSTLIST-04 | 选择"草稿"筛选，URL 同步并刷新保持 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js`<br>`tests/e2e/post-list-filter.spec.ts` |
| TC-US07-16 | SC-POSTLIST-05 | 搜索框输入后列表过滤 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js`<br>`tests/e2e/post-list-search.spec.ts` |
| TC-US07-17 | SC-POSTLIST-06 | 空状态 | 已覆盖 | `tests/unit/admin/post-list-empty.test.tsx` |
| TC-US07-18 | SC-POSTLIST-07 | 筛选无结果提示与"清除筛选" | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js`<br>`tests/unit/admin/post-list-empty.test.tsx` |
| TC-US07-19 | SC-POSTLIST-08 | 分页控件交互 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js`<br>`tests/e2e/post-list-pagination.spec.ts` |
| TC-US07-20 | SC-POSTLIST-09 | 加载失败显示错误并重试恢复 | 已覆盖 | `specs/test/features/F-001-文章写作/e2e/playwright-test-post-list-ui.js` |
| TC-US08-01 | SC-PUBLISH-01 | 发布草稿，读者可按 slug 读取 | 已覆盖 | `tests/e2e/editor-publish.spec.ts` |
| TC-US08-02 | SC-PUBLISH-01 | 发布接口与读者端读取（接口层） | 已覆盖 | `tests/integration/post/publish-endpoint.test.ts:22`<br>`tests/integration/post/public-detail-endpoint.test.ts:21`<br>`tests/integration/post/public-list-endpoint.test.ts:21` |
| TC-US08-03 | SC-PUBLISH-02 | 发布日期等价类：空 → 今天；已填 → 保留 | 部分覆盖 | `tests/unit/post/publish-service.test.ts:15`<br>`tests/integration/post/public-list-endpoint.test.ts:21` |
| TC-US08-04 | SC-PUBLISH-03 | 必填项缺失决策表 | 部分覆盖 | `tests/unit/post/publish-validation.test.ts:9`<br>`tests/unit/post/content.test.ts:18`<br>`tests/integration/post/publish-endpoint.test.ts:22` |
| TC-US08-05 | SC-PUBLISH-04 | 更新 dirty 文章，读者看到 V2 | 已覆盖 | `tests/e2e/editor-publish-update.spec.ts` |
| TC-US08-06 | SC-PUBLISH-05 | 撤回为草稿，读者不可见，内容保留 | 已覆盖 | `tests/e2e/editor-unpublish.spec.ts` |
| TC-US08-07 | SC-PUBLISH-06 | 读者端列表与详情永不暴露草稿/未发布修改 | 已覆盖 | `tests/integration/post/public-list-endpoint.test.ts` |
| TC-US08-08 | SC-PUBLISH-06 | 读者端绕过尝试（错误猜测） | 部分覆盖 | `tests/integration/post/public-list-endpoint.test.ts:21`<br>`tests/integration/post/public-detail-endpoint.test.ts:21`<br>`tests/integration/post/published-query.test.ts:34` |
| TC-US08-09 | SC-PUBLISH-07 | 发布/更新/撤回后触发重建，5 分钟内可见 | 部分覆盖 | `tests/integration/post/rebuild-hook.test.ts:40`<br>`tests/integration/post/rebuild-hook.test.ts:48`<br>`tests/unit/rebuild/deploy-hook.test.ts:22` |
| TC-US08-10 | SC-PUBLISH-09 | 发布前先保存未保存内容 | 部分覆盖 | `tests/e2e/editor-publish.spec.ts:7`<br>`tests/unit/admin/session-expired.test.tsx:70` |
| TC-US08-11 | SC-PUBLISH-10 | 发布失败状态不变并提示 | 无测试 | — |
| TC-US08-12 | SC-PUBLISH-10 | 更新/撤回失败状态不变（错误猜测） | 无测试 | — |
| TC-US08-13 | SC-PUBLISH-01, SC-PUBLISH-04, SC-PUBLISH-05 | 状态转换表（合法与非法转换） | 部分覆盖 | `tests/integration/post/publish-endpoint.test.ts:22`<br>`tests/integration/post/unpublish-endpoint.test.ts:21`<br>`tests/integration/post/save-endpoint.test.ts:25` |
| TC-US08-14 | SC-PUBLISH-01, SC-PUBLISH-04, SC-PUBLISH-05 | 未登录发布/更新/撤回 → 401 | 已覆盖 | `tests/integration/auth/logout-endpoint.test.ts:115`<br>`tests/integration/auth/middleware.test.ts:68`<br>`tests/unit/auth/session-check.test.ts:13` |
| TC-US08-15 | SC-PUBLISH-01 | 跨站 Origin 调用发布 → 拒绝（CSRF） | 已覆盖 | `tests/integration/auth/middleware.test.ts:68` |
| TC-US08-16 | SC-PUBLISH-01, SC-PUBLISH-04 | 发布/更新接口性能 P95 < 500ms | 线上 / 人工 | — |
| TC-US08-17 | SC-PUBLISH-08 | 按钮显隐/禁用矩阵 | 已覆盖 | `tests/e2e/editor-publish-update.spec.ts` |
| TC-US08-18 | SC-PUBLISH-08 | 请求进行中按钮加载并禁用，防重复提交 | 无测试 | — |
| TC-US08-19 | SC-PUBLISH-03 | 必填缺失时提示并高亮输入框 | 已覆盖 | `tests/e2e/editor-publish.spec.ts` |
| TC-US08-20 | SC-PUBLISH-05 | 撤回确认框取消 / Esc 不改变状态 | 部分覆盖 | `tests/unit/ui/confirm-dialog.test.tsx:37` |
| TC-US08-21 | SC-PUBLISH-01, SC-PUBLISH-04 | 成功提示与状态标记切换 | 部分覆盖 | `tests/e2e/editor-publish.spec.ts:7`<br>`tests/e2e/editor-publish-update.spec.ts:7` |
| TC-US09-01 | SC-DELETE-01 | 从列表左滑删除（全滑 / 抽屉"删除"） | 已覆盖 | `tests/e2e/post-list-swipe.spec.ts` |
| TC-US09-02 | SC-DELETE-02 | 从写文章页（含未保存修改）删除后回到列表 | 已覆盖 | `tests/e2e/editor-delete.spec.ts`<br>`tests/unit/admin/autosave.test.ts`<br>`tests/unit/admin/delete-dialog.test.tsx` |
| TC-US09-03 | SC-DELETE-04 | 删除已发布（clean / dirty）文章后读者 404 且触发重建 | 已覆盖 | `tests/integration/post/delete-endpoint.test.ts` |
| TC-US09-04 | SC-DELETE-05 | 重复删除 / 不存在 id → 404，其他数据不受影响 | 已覆盖 | `tests/integration/post/delete-endpoint.test.ts` |
| TC-US09-05 | SC-DELETE-06 | 删除接口 500 时提示且文章保留 | 已覆盖 | `tests/e2e/editor-delete.spec.ts`<br>`tests/e2e/post-list-delete-undo.spec.ts`<br>`tests/unit/admin/delete-dialog.test.tsx` |
| TC-US09-06 | SC-DELETE-01, SC-DELETE-04 | 状态转换：任意状态 → deleted；deleted 上的操作被拒 | 已覆盖 | `tests/unit/post/delete-service.test.ts` |
| TC-US09-07 | SC-DELETE-01 | 未登录删除 → 401 | 已覆盖 | `tests/integration/post/delete-endpoint.test.ts`<br>`tests/integration/post/get-endpoint.test.ts`<br>`tests/unit/post/delete-service.test.ts` |
| TC-US09-08 | SC-DELETE-01 | 跨站 Origin 删除被拒（CSRF） | 已覆盖 | `tests/integration/post/delete-endpoint.test.ts`<br>`tests/integration/post/get-endpoint.test.ts`<br>`tests/unit/post/delete-service.test.ts` |
| TC-US09-09 | SC-DELETE-01 | 删除不删除 R2 图片 | 已覆盖 | `tests/integration/post/delete-endpoint.test.ts`<br>`tests/integration/post/get-endpoint.test.ts`<br>`tests/unit/post/delete-service.test.ts` |
| TC-US09-10 | SC-DELETE-01, SC-DELETE-02 | 写文章页确认框文案、标题特殊字符转义（含列表撤销提示） | 已覆盖 | `tests/e2e/editor-delete.spec.ts`<br>`tests/unit/admin/delete-dialog.test.tsx` |
| TC-US09-11 | SC-DELETE-03 | 写文章页取消 / Esc 关闭确认框，文章仍在 | 已覆盖 | `tests/e2e/editor-delete.spec.ts` |
| TC-US09-12 | SC-DELETE-02 | 写文章页确认删除进行中防重复提交 | 已覆盖 | `tests/e2e/editor-delete.spec.ts`<br>`tests/unit/ui/confirm-dialog.test.tsx` |
| TC-US09-13 | SC-DELETE-01 | 删除后分页与空状态联动（边界：21 → 20 篇、1 → 0 篇） | 已覆盖 | `tests/e2e/post-list-delete-undo.spec.ts`<br>`tests/unit/admin/post-list-delete.test.tsx` |
| TC-US09-14 | SC-DELETE-07 | 列表删除后撤销：原位恢复、不发请求 | 已覆盖 | `tests/e2e/post-list-delete-undo.spec.ts` |
| TC-US09-15 | SC-DELETE-08 | 撤销期内离开页面 / 连续删除时立即提交 | 已覆盖 | `tests/e2e/post-list-delete-undo.spec.ts` |
| TC-US09-16 | SC-DELETE-09 | 滑动交互：拖动不误跳转、同一时间一行、`⋯` 与键盘、减弱动效 | 已覆盖 | `tests/e2e/post-list-swipe.spec.ts` |

</details>
