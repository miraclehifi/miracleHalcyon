# 新建与编辑文章 验收测试

**US ID**: US-03
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.2

> 本文件为验收**规格**，非可执行代码；implement 阶段转化为测试代码。
> 接口路径均为占位（`POST /api/admin/posts`、`PUT /api/admin/posts/:id`、`GET /api/admin/posts/:id`、`GET /api/admin/tags`、`POST /api/admin/posts/:id/publish`），**接口路径以 design-domain API 契约为准**。响应字段断言在 endpoint-details 产出后补齐 `schema_validation`。

---

## 约定与建议值

| 项 | 取值 | 来源 |
|----|------|------|
| slug 格式 | `^[a-z0-9]+(-[a-z0-9]+)*$`（小写字母/数字，单连字符分隔，不以连字符开头或结尾）；服务端先去首尾空白再校验，草稿允许为空 | post domain-model §2.2、§3 `Slug` |
| slug 最大长度 | 80 字符 | post domain-model §3 `Slug` |
| 标题最大长度 | 200 字符（按 Unicode 码点计）；去首尾空白后为空则存为"无标题"（不报错，发布时再拦截，见 TC-US08-04） | post domain-model §2.2 |
| 摘要最大长度 | 200 字（按 Unicode 码点计） | post domain-model §2.2 |
| slug 生成规则 | NFKD 规范化 → 去组合附加符号 → 小写 → 非 `[a-z0-9]` 字符序列替换为单个 `-` → 去首尾 `-` → 截断到 80 字符（不以 `-` 结尾）；结果为空则 slug 留空 | post domain-model §3 `slugify` |
| 保存请求体 | `PUT` 必须带齐 `DraftInput` 七个字段（title、slug、tags、summary、body、publishedAt、cover），缺字段 400"请求缺少字段：{字段名}"；`POST` 新建字段均可选（缺省按空值）。下文"`PUT` 提交 `{x}`"均指以当前工作稿为底、只替换 x 后提交整份 | post api-contract §3 `PUT /api/admin/posts/:id` |
| 错误码 | 校验失败 400 `VALIDATION_FAILED`（`error.fields` 列出字段）、slug 冲突 409 `SLUG_TAKEN`、发布缺必填 422 `MISSING_FIELDS`、不存在 404、未登录 401、Origin 不符 403 | post api-contract §5 |

---

## 测试数据策略

| 策略 | 内容 | 隔离方式 |
|------|------|----------|
| **Fixture（共享只读）** | `adminSession`：测试管理员账号 `admin@test.local` / `Test-Admin-Pass-2026!` 登录后的会话 Cookie；所有写调用携带该 Cookie 与 `Origin: <BASE_URL>` | 只读，不在用例内登出 |
| **Factory** | `postFactory({title?, slug?, tags?, summary?, body?, status='draft'})`：直接写 D1，slug 默认 `t-{runId}-{seq}`（runId = 8 位随机小写字母数字），保证跨用例唯一 | 每个用例创建自己的文章 |
| **Seed（只读）** | 标签种子文章 `seed-tags-astro-react`（slug 固定，tags = `["astro","react"]`，status=draft） | 只读，供标签自动补全用例使用，不在用例内修改 |
| **Cleanup** | 每个用例 afterEach 删除本用例 Factory 创建及 UI 新建产生的文章（按 runId 前缀 + 记录的 id 删除）；不删除 Seed | — |

> 用例中出现的固定 slug（如 `hello-astro`）在执行时一律追加 `-{runId}` 后缀以避免并行冲突，断言时同步使用带后缀的值；BH 原文中的可见文案保持不变。

---

## 测试用例列表

| TC ID | covers | 场景 | type | Priority |
|-------|--------|------|------|----------|
| TC-US03-01 | SC-POSTINFO-02 | API 创建草稿成功 | api | P0 |
| TC-US03-02 | SC-POSTINFO-02, SC-POSTINFO-03 | API 更新后读取为最新内容 | api | P0 |
| TC-US03-03 | SC-POSTINFO-02 | 标题等价类与边界（空存为"无标题"/1/200/201/emoji） | api | P1 |
| TC-US03-04 | SC-POSTINFO-04, SC-POSTINFO-06 | slug 生成规则决策表（英文/中文/混合） | unit | P0 |
| TC-US03-05 | SC-POSTINFO-06 | 中文标题空 slug 草稿可保存、发布被拒 | api | P0 |
| TC-US03-06 | SC-POSTINFO-07 | slug 格式等价类与错误猜测 | api | P0 |
| TC-US03-07 | SC-POSTINFO-07 | slug 长度边界 1/80/81 | api | P1 |
| TC-US03-08 | SC-POSTINFO-08 | slug 与其他文章重复返回 409 | api | P0 |
| TC-US03-09 | SC-POSTINFO-08 | 并发写入相同 slug 竞态 | api | P1 |
| TC-US03-10 | SC-POSTINFO-09 | 摘要边界 199/200/201 | api | P0 |
| TC-US03-11 | SC-POSTINFO-10 | 标签保存、去重与补全查询 | api | P1 |
| TC-US03-12 | SC-POSTINFO-11 | API 读取不存在的文章返回 404 | api | P1 |
| TC-US03-13 | SC-POSTINFO-02, SC-POSTINFO-03, SC-POSTINFO-11 | 未登录访问写接口与编辑页被拒 | security | P0 |
| TC-US03-14 | SC-POSTINFO-02 | 写接口 Origin 校验（CSRF） | security | P0 |
| TC-US03-15 | SC-POSTINFO-02, SC-POSTINFO-10 | 标题/标签/摘要中的 HTML 作为纯文本存储与回显 | security | P1 |
| TC-US03-16 | SC-POSTINFO-02 | 保存接口响应 P95 < 500ms | performance | P2 |
| TC-US03-17 | SC-POSTINFO-01 | 新建文章显示空白表单 | ui-interaction | P0 |
| TC-US03-18 | SC-POSTINFO-02 | Ctrl/Cmd+S 保存后地址栏变为编辑地址 | ui-interaction | P0 |
| TC-US03-19 | SC-POSTINFO-03 | 打开已有文章显示最新保存内容 | ui-interaction | P0 |
| TC-US03-20 | SC-POSTINFO-04, SC-POSTINFO-05 | slug 自动跟随 vs 手动修改决策表 | ui-interaction | P0 |
| TC-US03-21 | SC-POSTINFO-06 | 中文标题提示"请填写英文 slug" | ui-interaction | P1 |
| TC-US03-22 | SC-POSTINFO-07 | 非法 slug 行内提示且不被保存 | ui-interaction | P0 |
| TC-US03-23 | SC-POSTINFO-08 | 重复 slug 提示"slug 已存在"且保持原值 | ui-interaction | P0 |
| TC-US03-24 | SC-POSTINFO-09 | 摘要超 200 字计数变红并提示 | ui-interaction | P1 |
| TC-US03-25 | SC-POSTINFO-10 | 标签添加、自动补全、删除 | ui-interaction | P1 |
| TC-US03-26 | SC-POSTINFO-11 | 编辑页访问不存在文章显示 404 | ui-interaction | P1 |

---

## TC-US03-01: API 创建草稿成功

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-01 |
| covers | SC-POSTINFO-02 |
| Scenario | 填写信息与正文后保存成功（API 层） |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（请求体含 cover: null 共七字段，读回含 cover；201 带 Location，PostView 字段） |

**前置条件：**
- 【环境前置】`adminSession` Fixture 可用；D1 已迁移
- 【数据前置】不存在 slug 为 `hello-astro-{runId}` 的文章

**测试数据：**
```json
{ "title": "Hello Astro", "slug": "hello-astro-{runId}", "tags": ["astro"],
  "summary": "Astro 5 入门笔记", "body": "# Hello\n\n正文第一段。", "publishedAt": "2026-10-10", "cover": null }
```

> 与编辑器一致发送 `DraftInput` 全部七个字段（`POST` 新建时字段均可选，缺省按空值）。

**步骤：**
1. 携带 `adminSession` 调用 `POST /api/admin/posts`，请求体为上述数据
2. 以返回的 `id` 调用 `GET /api/admin/posts/:id`

**预期结果：**
- 步骤 1 返回 201，`Location` = `/api/admin/posts/{id}`；响应为 `PostView`：非空 `id`，`status` = `draft`，`hasUnpublishedChanges` = `false`，`lastPublishedAt` = `null`
- 步骤 2 返回 200，`title`/`slug`/`tags`/`summary`/`body`/`publishedAt`/`cover` 与提交值逐字段相等（`cover` = `null`），`status` = `draft`，`updatedAt` 为 ISO-8601 时间且 ≥ 请求发起时间

**清理：** 删除创建的文章

---

## TC-US03-02: API 更新后读取为最新内容

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-02 |
| covers | SC-POSTINFO-02, SC-POSTINFO-03 |
| Scenario | 已有文章更新后，再次读取返回最新保存内容 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（PUT 提交整份工作稿；缺字段返回 400"请求缺少字段"，替代"未提交字段保持原值"） |

**前置条件：**
- 【数据前置】`postFactory({title:"旧标题", body:"旧正文"})` 创建文章 A
- 【环境前置】`adminSession` 可用

**测试数据：**
- 完整更新体：以 A 的当前工作稿（`GET` 所得七个字段）为底，`title` 改为 `新标题`、`body` 改为 `新正文`，其余字段（slug、tags、summary、publishedAt、cover）原样带上
- 缺字段更新体：`{ "title": "再改", "body": "再改正文" }`

**步骤：**
1. `PUT /api/admin/posts/:idA` 提交完整更新体
2. `GET /api/admin/posts/:idA`
3. `PUT /api/admin/posts/:idA` 提交缺字段更新体
4. `GET /api/admin/posts/:idA`

**预期结果：**
- 步骤 1 返回 200
- 步骤 2 返回 `title` = `新标题`，`body` = `新正文`；其余字段等于提交值（即原值）；`updatedAt` 晚于更新前值；`status` 仍为 `draft`
- 步骤 3 返回 400 `VALIDATION_FAILED`，`error.fields` = `["slug","tags","summary","publishedAt","cover"]`，信息"请求缺少字段：slug、tags、summary、publishedAt、cover"（整份不保存，防止部分覆盖丢数据）
- 步骤 4 与步骤 2 的内容和 `updatedAt` 相同

**清理：** 删除文章 A

---

## TC-US03-03: 标题等价类与边界

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-03 |
| covers | SC-POSTINFO-02 |
| Scenario | 标题长度与内容的有效/无效等价类（story 验收标准 5"标题不能为空"：保存时空标题存为"无标题"，发布时拦截，见 TC-US08-04） |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（空 / 空白标题存为"无标题"；上限 200、按码点计；PUT 提交整份） |

**前置条件：**
- 【数据前置】每行数据用 `postFactory()` 新建一篇文章 P（slug 唯一）
- 【环境前置】`adminSession` 可用

**测试数据（参数化）：**

| # | title | 预期 |
|---|-------|------|
| 1 | `""`（空） | 200，读回 `title` = `无标题` |
| 2 | `"   "`（仅空白） | 200，读回 `title` = `无标题`（去首尾空白后判空） |
| 3 | `"A"`（1 字符） | 200 |
| 4 | 200 个 `"字"` | 200，读回长度 200 |
| 5 | 201 个 `"字"` | 400 `VALIDATION_FAILED`，`fields` = `["title"]`，"标题不能超过 200 字" |
| 6 | `"🚀 发布日 Launch"` | 200，读回逐字节相等（emoji 不被截断/替换） |
| 7 | 199 个 `"a"` + `"😀"`（1 个码点） | 200（共 200 码点） |
| 8 | 196 个 `"a"` + `"👨‍👩‍👧"`（ZWJ 复合 emoji，3 个 emoji + 2 个 ZWJ = 5 个码点） | 400（共 201 码点：按码点计，不按字素） |

**步骤：** 对每行以 P 的当前工作稿为底、只替换 `title`，整份 `PUT /api/admin/posts/:idP`，随后 `GET` 读回

**预期结果：** 按表；400 情况下读回的 `title` 保持更新前原值

**清理：** 删除各行创建的文章

---

## TC-US03-04: slug 生成规则决策表

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-04 |
| covers | SC-POSTINFO-04, SC-POSTINFO-06 |
| Scenario | 由标题生成 slug 的纯函数（英文/中文/混合/特殊字符） |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（先 NFKD 去重音 Café → cafe，补全角行；上限 80 截断且不以 - 结尾） |

**前置条件：** 【环境前置】`slugify(title)`（`src/domains/post/slug.ts`，前后端共用纯函数）可单独调用，无 IO

**测试数据（决策表，标题类型 × 预期）：**

| # | 标题类型 | 输入 title | 预期 slug |
|---|---------|-----------|-----------|
| 1 | 英文 | `Hello Astro 5!` | `hello-astro-5`（BH-04 原文） |
| 2 | 英文 | `Hello Astro` | `hello-astro` |
| 3 | 英文 + 多空白 | `  Hello   World  ` | `hello-world` |
| 4 | 英文 + 标点 | `C++ / C# Tips` | `c-c-tips` |
| 5 | 英文 + 下划线 | `snake_case_title` | `snake-case-title` |
| 6 | 纯中文 | `你好世界` | `""`（空，BH-06） |
| 7 | 中英混合 | `React 与 Vue 对比` | `react-vue` |
| 8 | 中文 + 数字 | `2026 年度总结` | `2026` |
| 9 | emoji + 英文 | `🚀 Launch Day` | `launch-day` |
| 10 | 纯符号 | `---!!!` | `""` |
| 11 | 带重音字母 | `Café Déjà Vu` | `cafe-deja-vu`（NFKD 后去掉组合附加符号） |
| 12 | 全角字符 | `ＡＢＣ　１２３`（全角字母、数字与空格） | `abc-123`（NFKD 兼容分解为半角） |
| 13 | 超长 | 150 个 `a` | 截断至 80 个 `a` |
| 14 | 超长且截断点落在 `-` 上 | 79 个 `a` + ` Bcd` | 79 个 `a`（截到 80 位时末位是 `-`，去掉） |

**步骤：** 对每行调用 `slugify(title)`

**预期结果：** 输出等于预期 slug；所有非空输出均匹配 `^[a-z0-9]+(-[a-z0-9]+)*$` 且长度 ≤ 80

**清理：** 无

---

## TC-US03-05: 中文标题空 slug 草稿可保存、发布被拒

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-05 |
| covers | SC-POSTINFO-06 |
| Scenario | 草稿 slug 可为空；发布时 slug 必填 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（空 slug 为 ""；发布缺 slug 返回 422 MISSING_FIELDS，fields ["slug"]） |

**前置条件：** 【环境前置】`adminSession` 可用

**测试数据：** `{ "title": "你好世界", "slug": "", "body": "正文" }`

**步骤：**
1. `POST /api/admin/posts` 提交测试数据
2. `POST /api/admin/posts/:id/publish`
3. `GET /api/admin/posts/:id`

**预期结果：**
- 步骤 1 返回 201，`slug` = `""`，`status` = `draft`
- 步骤 2 返回 422 `MISSING_FIELDS`，信息"发布前请填写：slug"，`error.fields` = `["slug"]`
- 步骤 3 `status` 仍为 `draft`，内容不变

**清理：** 删除该文章

---

## TC-US03-06: slug 格式等价类与错误猜测

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-06 |
| covers | SC-POSTINFO-07 |
| Scenario | slug 含非法字符时拒绝保存 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（首尾空白 slug 去空白后保存（200）；接口错误文案"slug 只能包含小写字母、数字和连字符"） |

**前置条件：** 【数据前置】`postFactory()` 创建文章 P，记录原 slug `S0`；【环境前置】`adminSession` 可用

**测试数据（参数化）：**

| # | 类别 | slug | 预期 |
|---|------|------|------|
| 1 | 有效 | `hello-astro-5` | 200 |
| 2 | 有效（纯数字） | `2026` | 200 |
| 3 | 有效（单字符） | `a` | 200 |
| 4 | 无效：大写+空格+标点（BH-07 原文） | `Hello World!` | 400 |
| 5 | 无效：大写 | `Hello-World` | 400 |
| 6 | 无效：下划线 | `hello_world` | 400 |
| 7 | 无效：前导连字符 | `-hello` | 400 |
| 8 | 无效：尾随连字符 | `hello-` | 400 |
| 9 | 无效：连续连字符 | `hello--world` | 400 |
| 10 | 无效：Unicode 字母 | `héllo` | 400 |
| 11 | 无效：中文 | `你好` | 400 |
| 12 | 无效：路径穿越 | `../admin` | 400 |
| 13 | 无效：斜杠 | `2026/10/post` | 400 |
| 14 | 无效：URL 编码 | `hello%20world` | 400 |
| 15 | 有效：首尾空白 | ` hello ` | 200，读回 `hello`（服务端去首尾空白后校验） |

> 有效行使用值前追加唯一后缀以免冲突（如 `hello-astro-5-{runId}`），#3 使用 `a{runId}` 之外的独立文章并在清理时删除。

**步骤：** 对每行 `PUT /api/admin/posts/:idP` 提交 `{slug}`，随后 `GET` 读回

**预期结果：**
- 无效行：400 `VALIDATION_FAILED`，`error.fields` = `["slug"]`，错误信息"slug 只能包含小写字母、数字和连字符"（编辑页行内提示"仅允许小写字母、数字和连字符"见 TC-US03-22）；读回 `slug` = 上一次成功保存的值（未被保存）
- 有效行：200，读回 `slug` 等于提交值去首尾空白后的值

**清理：** 删除文章 P

---

## TC-US03-07: slug 长度边界

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-07 |
| covers | SC-POSTINFO-07 |
| Scenario | slug 长度上下边界（上限 80；去首尾空白后计长度） |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（上限 80；输入去首尾空白后再计长度） |

**前置条件：** 【数据前置】`postFactory()` 创建文章 P

**测试数据：**

| # | slug | 长度 | 预期 |
|---|------|------|------|
| 1 | `x` + runId 截成 1 位（如 `k`） | 1 | 200 |
| 2 | `{runId}-` + 补 `a` 至 79 | 79 | 200 |
| 3 | `{runId}-` + 补 `a` 至 80 | 80 | 200 |
| 4 | `{runId}-` + 补 `a` 至 81 | 81 | 400 `VALIDATION_FAILED`，`fields` = `["slug"]` |
| 5 | 前后各加 1 个空格的 80 位 slug（另取 runId 前缀） | 82（去空白后 80） | 200，读回不含空格的 80 位 |

**步骤：** 逐行 `PUT /api/admin/posts/:idP` 提交 `{slug}` 并读回

**预期结果：** 按表；400 时读回 slug 为上一次成功值

**清理：** 删除文章 P

---

## TC-US03-08: slug 与其他文章重复返回 409

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-08 |
| covers | SC-POSTINFO-08 |
| Scenario | slug 全站唯一；与自身原 slug 相同不算冲突 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（409 SLUG_TAKEN，文案"slug 已存在，请换一个"，错误体不带 fields） |

**前置条件：**
- 【数据前置】`postFactory({slug:"hello-astro-{runId}"})` 创建文章 B
- 【数据前置】`postFactory({slug:"orig-{runId}"})` 创建文章 A

**步骤：**
1. `PUT /api/admin/posts/:idA` 提交 `{slug:"hello-astro-{runId}"}`
2. `GET /api/admin/posts/:idA`
3. `PUT /api/admin/posts/:idA` 提交 `{slug:"orig-{runId}", title:"改个标题"}`（与自身原 slug 相同）
4. `POST /api/admin/posts` 提交 `{title:"X", slug:"hello-astro-{runId}"}`（新建时冲突）

**预期结果：**
- 步骤 1 返回 409 `SLUG_TAKEN`，信息"slug 已存在，请换一个"（错误体不带 `fields`），整份不保存
- 步骤 2 `slug` = `orig-{runId}`（保持原值），文章 B 未被修改
- 步骤 3 返回 200
- 步骤 4 返回 409 `SLUG_TAKEN`，未产生新文章

**清理：** 删除文章 A、B

---

## TC-US03-09: 并发写入相同 slug 竞态

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-09 |
| covers | SC-POSTINFO-08 |
| Scenario | 错误猜测：两请求同时把不同文章 slug 改为同一值 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（409 SLUG_TAKEN；唯一性由写入语句的 NOT EXISTS 条件保证） |

**前置条件：** 【数据前置】`postFactory()` 创建文章 A、C；目标 slug `race-{runId}` 不存在

**步骤：**
1. 并行（同一事件循环 tick 内）发出 `PUT /api/admin/posts/:idA` 与 `PUT /api/admin/posts/:idC`，均提交 `{slug:"race-{runId}"}`
2. 查询 slug = `race-{runId}` 的文章数量
3. 重复步骤 1–2 共 10 轮（每轮使用新目标 slug `race-{runId}-{i}`）

**预期结果：**
- 每轮恰好一个请求 200、另一个 409 `SLUG_TAKEN`
- 每轮数据库中该 slug 恰好 1 条（写入语句自带"slug 未被其他文章占用"条件，检查与写入原子完成，而非仅应用层先查后写）

**清理：** 删除文章 A、C

---

## TC-US03-10: 摘要边界 199/200/201

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-10 |
| covers | SC-POSTINFO-09 |
| Scenario | 摘要 ≤ 200 字，超出不被保存 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({summary:"原摘要"})` 创建文章 P

**测试数据：**

| # | summary | 字数 | 预期 |
|---|---------|------|------|
| 1 | `""` | 0 | 200（摘要可空） |
| 2 | 199 个 `"文"` | 199 | 200 |
| 3 | 200 个 `"文"` | 200 | 200 |
| 4 | 201 个 `"文"` | 201 | 400，"摘要不能超过 200 字" |
| 5 | 200 个 `"a"` | 200 | 200 |
| 6 | 199 个 `"文"` + `"😀"` | 200 | 200（emoji 计 1 字，建议口径） |
| 7 | 200 个 `"文"` + `"😀"` | 201 | 400 |

**步骤：** 逐行 `PUT /api/admin/posts/:idP` 提交 `{summary}`，随后读回

**预期结果：** 按表；400 时读回 `summary` 为上一次成功保存的值（超出部分未写入，不做静默截断入库）

**清理：** 删除文章 P

---

## TC-US03-11: 标签保存、去重与补全查询

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-11 |
| covers | SC-POSTINFO-10 |
| Scenario | 标签数组持久化；补全接口按不区分大小写的包含匹配返回已有标签 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（补全为不区分大小写的包含匹配（补 q=STR），响应 { tags: [{ name, count }] }；标签归一规则定稿） |

**前置条件：**
- 【数据前置】Seed 文章 `seed-tags-astro-react`（tags `astro`、`react`）存在
- 【数据前置】`postFactory({tags:[]})` 创建文章 P

**测试数据：** `["astro","cloudflare","astro"," Cloudflare "]`

**步骤：**
1. `PUT /api/admin/posts/:idP` 提交 `{tags:[上述数据]}`，随后读回
2. `PUT /api/admin/posts/:idP` 提交 `{tags:["cloudflare"]}`，随后读回
3. `GET /api/admin/tags?q=as`
4. `GET /api/admin/tags?q=STR`
5. `GET /api/admin/tags?q=zzz-{runId}`

**预期结果：**
- 步骤 1 读回 `tags` = `["astro","cloudflare"]`（去首尾空白；不区分大小写去重，保留首次出现的写法）
- 步骤 2 读回 `tags` = `["cloudflare"]`
- 步骤 3 返回 200 `{ "tags": [{ "name", "count" }] }`，`name` 中包含 `astro`，不包含 `react`
- 步骤 4 返回 200，`name` 中包含 `astro`（包含匹配且不区分大小写，不要求前缀）
- 步骤 5 返回 200，`{ "tags": [] }`

**清理：** 删除文章 P

---

## TC-US03-12: API 读取不存在的文章返回 404

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-12 |
| covers | SC-POSTINFO-11 |
| Scenario | 读取/更新不存在 id |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】id `nope` 不存在

**步骤：**
1. `GET /api/admin/posts/nope`
2. `PUT /api/admin/posts/nope` 提交 `{title:"x"}`

**预期结果：** 两者均返回 404；步骤 2 不会创建新文章（id 为 `nope` 的记录仍不存在）

**清理：** 无

---

## TC-US03-13: 未登录访问写接口与编辑页被拒

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-13 |
| covers | SC-POSTINFO-02, SC-POSTINFO-03, SC-POSTINFO-11 |
| Scenario | 无权限：无会话 / 伪造会话 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory()` 创建文章 P（用 Factory 直写 D1，不依赖会话）

**测试数据：** 会话 Cookie 三种：缺失 / `session=forged-0000` / 已登出会话的旧 Cookie（另建临时会话后登出获得，不影响共享 Fixture）

**步骤：** 对每种 Cookie 分别调用：
1. `POST /api/admin/posts`、`PUT /api/admin/posts/:idP`、`GET /api/admin/posts/:idP`、`GET /api/admin/tags`
2. 浏览器访问 `/admin/posts/new`、`/admin/posts/:idP`、`/admin/posts/nope`

**预期结果：**
- 步骤 1 全部 401，响应体不含文章数据；文章 P 未被修改
- 步骤 2 全部跳转登录页（不渲染编辑表单，也不泄露"文章不存在"与否）

**清理：** 删除文章 P

---

## TC-US03-14: 写接口 Origin 校验（CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-14 |
| covers | SC-POSTINFO-02 |
| Scenario | 已登录但 Origin 非本站的写请求被拒 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({title:"原标题"})` 创建文章 P；【环境前置】`adminSession` 可用

**测试数据：** Origin：`https://evil.example`、`null`、缺失

**步骤：** 携带 `adminSession` 与各 Origin 调用 `PUT /api/admin/posts/:idP` 提交 `{title:"被篡改"}`，随后用正确 Origin 读回

**预期结果：** 均返回 403；读回 `title` = `原标题`（"缺失 Origin"是否拒绝为建议，可退化为校验 Referer，待 design-domain 确认）

**清理：** 删除文章 P

---

## TC-US03-15: 文本字段中的 HTML 作为纯文本存储与回显

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-15 |
| covers | SC-POSTINFO-02, SC-POSTINFO-10 |
| Scenario | 错误猜测：标题/标签/摘要注入 HTML |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory()` 创建文章 P

**测试数据：** title `<img src=x onerror=alert(1)>`、tags `["<script>alert(1)</script>"]`、summary `"><svg onload=alert(1)>`

**步骤：**
1. `PUT /api/admin/posts/:idP` 提交上述数据（注：标签值若不满足标签规则被拒属可接受结果）
2. 浏览器打开 `/admin/posts/:idP`，监听 `page.on('dialog')`

**预期结果：**
- API 原样存储或按规则拒绝，不在服务端执行/转义破坏数据
- 编辑页标题输入框 value 为原字符串；无任何 dialog 触发；DOM 中不存在由该数据生成的 `img[onerror]`、`script`、`svg[onload]` 元素

**清理：** 删除文章 P

---

## TC-US03-16: 保存接口响应 P95 < 500ms

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-16 |
| covers | SC-POSTINFO-02 |
| Scenario | 全局 NFR"写作接口响应 P95 < 500ms" |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅（需在预发 Cloudflare 环境运行，本地 wrangler 仅作参考） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory()` 创建文章 P；【环境前置】预发环境，D1 已预热（先发 5 次请求丢弃）

**测试数据：** body 为 10,000 字 Markdown（与 US-04 性能样本共用生成器）

**步骤：** 串行 100 次 `PUT /api/admin/posts/:idP`（每次 body 末尾追加序号），记录客户端往返耗时

**预期结果：** 100 次全部 200；P95 < 500ms

**清理：** 删除文章 P

---

## UI 交互测试

> 统一前置：浏览器上下文注入 `adminSession` Cookie；视口 1280×800（除非另注）。选择器为建议写法，以 design-ui 产出的 `data-testid` 为准。

### TC-US03-17: 新建文章显示空白表单

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-17 |
| covers | SC-POSTINFO-01 |
| Scenario | 从文章列表点击"新建文章"进入空白写文章页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】已登录，位于 `/admin/posts`；浏览器时区固定 `Asia/Shanghai`，时钟固定 `2026-10-10T09:00:00+08:00`

**步骤：** 点击"新建文章"

**预期结果：**
- 进入写文章页（URL 为新建页，如 `/admin/posts/new`）
- 标题、slug、摘要输入框为空；无标签块；正文编辑区为空
- 发布日期显示 `2026-10-10`（显示格式以 shared-field-formats 为准）
- 状态标记显示"草稿"

**playwright_hint：**
```ts
await page.getByRole('button', { name: '新建文章' }).click();
await expect(page.getByLabel('标题')).toHaveValue('');
await expect(page.getByLabel('slug')).toHaveValue('');
await expect(page.getByLabel('发布日期')).toHaveValue('2026-10-10');
await expect(page.getByTestId('post-status')).toHaveText('草稿');
```

**清理：** 不保存直接离开；若自动保存生成了文章则按 id 删除

---

### TC-US03-18: Ctrl/Cmd+S 保存后地址栏变为编辑地址

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-18 |
| covers | SC-POSTINFO-02 |
| Scenario | 新建页填写后快捷键保存，以草稿写入并跳转编辑地址 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】位于新建文章页

**测试数据：** 标题 `Hello Astro`、slug 改为 `hello-astro-{runId}`、标签 `astro`、摘要 `Astro 5 入门笔记`、正文 `# Hello`

**步骤：**
1. 依次填写测试数据
2. 按 `ControlOrMeta+S`

**预期结果：**
- 浏览器默认"保存网页"对话框未出现（快捷键被拦截）
- 地址栏变为 `/admin/posts/{id}`（`{id}` 非空）
- 通过 `GET /api/admin/posts/{id}` 校验 `status` = `draft`，字段与输入一致

**playwright_hint：**
```ts
await page.keyboard.press('ControlOrMeta+S');
await expect(page).toHaveURL(/\/admin\/posts\/\d+$/);
```

**清理：** 删除该文章

---

### TC-US03-19: 打开已有文章显示最新保存内容

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-19 |
| covers | SC-POSTINFO-03 |
| Scenario | 编辑页加载已保存的字段与正文 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({title:"旧标题", body:"旧正文", tags:["astro"], summary:"旧摘要"})` 创建文章 P，随后再 `PUT` 将 body 改为 `旧正文-v2`（验证取最新）

**步骤：** 访问 `/admin/posts/:idP`

**预期结果：** 标题显示"旧标题"；编辑区内容为"旧正文-v2"；标签块"astro"；摘要"旧摘要"；slug 为 Factory 生成值

**playwright_hint：**
```ts
await expect(page.getByLabel('标题')).toHaveValue('旧标题');
await expect(page.getByTestId('md-editor')).toContainText('旧正文-v2');
```

**清理：** 删除文章 P

---

### TC-US03-20: slug 自动跟随 vs 手动修改决策表

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-20 |
| covers | SC-POSTINFO-04, SC-POSTINFO-05 |
| Scenario | slug 是否跟随标题变化 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（#4 清空后不恢复跟随；#5 按 slug ≠ slugify(标题) 判定改过） |

**前置条件：** 【环境前置】每行从全新的新建文章页开始（#5 除外）

**测试数据（决策表）：**

| # | 条件：slug 被手动修改过 | 条件：文章已有保存的 slug | 操作 | 预期 slug |
|---|---|---|---|---|
| 1 | 否 | 否 | 输入标题 `Hello Astro 5!` | `hello-astro-5`（BH-04） |
| 2 | 否 | 否 | 标题 `Hello` → 改为 `Hello World` | `hello-world`（持续跟随） |
| 3 | 是（改为 `my-post`） | 否 | 标题改为 `New Title` | `my-post`（BH-05） |
| 4 | 是，随后清空 slug 输入框 | 否 | 标题改为 `Back Again` | `""`（改过后不再跟随，清空也不恢复） |
| 5 | 否 | 是（Factory slug `keep-{runId}`） | 打开编辑页，标题改为 `Changed` | `keep-{runId}`（打开已有文章时 slug ≠ slugify(标题) 即视为改过） |

**步骤：** 按表操作

**预期结果：** slug 输入框值等于"预期 slug"列

**playwright_hint：**
```ts
await page.getByLabel('标题').fill('Hello Astro 5!');
await expect(page.getByLabel('slug')).toHaveValue('hello-astro-5');
await page.getByLabel('slug').fill('my-post');
await page.getByLabel('标题').fill('New Title');
await expect(page.getByLabel('slug')).toHaveValue('my-post');
```

**清理：** 删除 #5 的文章及任何因自动保存产生的文章

---

### TC-US03-21: 中文标题提示"请填写英文 slug"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-21 |
| covers | SC-POSTINFO-06 |
| Scenario | 中文标题无法生成 slug |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】新建文章页，未手动改过 slug

**步骤：**
1. 输入标题 `你好世界`
2. 按 `ControlOrMeta+S`

**预期结果：**
- 步骤 1：slug 输入框为空，并显示提示"请填写英文 slug"
- 步骤 2：保存成功（URL 变为 `/admin/posts/{id}`），状态仍为"草稿"

**playwright_hint：**
```ts
await page.getByLabel('标题').fill('你好世界');
await expect(page.getByLabel('slug')).toHaveValue('');
await expect(page.getByText('请填写英文 slug')).toBeVisible();
```

**清理：** 删除保存的文章

---

### TC-US03-22: 非法 slug 行内提示且不被保存

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-22 |
| covers | SC-POSTINFO-07 |
| Scenario | 输入 `Hello World!` 后显示格式错误 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({slug:"valid-{runId}"})` 创建文章 P，打开其编辑页

**步骤：**
1. 将 slug 改为 `Hello World!`
2. 按 `ControlOrMeta+S`，等待 3s（覆盖自动保存窗口）
3. 将 slug 改回 `valid2-{runId}`

**预期结果：**
- 步骤 1：slug 输入框下显示"仅允许小写字母、数字和连字符"
- 步骤 2：`GET /api/admin/posts/:idP` 的 `slug` 仍为 `valid-{runId}`
- 步骤 3：提示消失

**playwright_hint：**
```ts
await page.getByLabel('slug').fill('Hello World!');
await expect(page.getByText('仅允许小写字母、数字和连字符')).toBeVisible();
```

**清理：** 删除文章 P

---

### TC-US03-23: 重复 slug 提示"slug 已存在"且保持原值

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-23 |
| covers | SC-POSTINFO-08 |
| Scenario | 保存时 slug 与另一篇文章冲突 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】Factory 创建文章 B（slug `hello-astro-{runId}`）与文章 A（slug `orig-{runId}`），打开 A 的编辑页

**步骤：**
1. 将 slug 改为 `hello-astro-{runId}`
2. 按 `ControlOrMeta+S`

**预期结果：**
- slug 输入框下显示"slug 已存在"
- `GET /api/admin/posts/:idA` 的 `slug` = `orig-{runId}`

**playwright_hint：**
```ts
await page.getByLabel('slug').fill(`hello-astro-${runId}`);
await page.keyboard.press('ControlOrMeta+S');
await expect(page.getByText('slug 已存在')).toBeVisible();
```

**清理：** 删除文章 A、B

---

### TC-US03-24: 摘要超 200 字计数变红并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-24 |
| covers | SC-POSTINFO-09 |
| Scenario | 摘要字数计数与超限截断 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（按 admin-post-editor.md 摘要"超过 200 不可再输入"：201 字被截为 200，计数格式"N / 200"） |

**前置条件：** 【数据前置】`postFactory({summary:"原摘要"})` 创建文章 P，打开编辑页

**测试数据：** 199 / 200 / 201 个 `文`

**步骤：** 依次将摘要填为 199、200、201 字（201 字以一次粘贴 / `fill` 输入）；之后按 `ControlOrMeta+S`

**预期结果：**
- 199：计数 `199 / 200`，非红色，显示说明"留空时读者端自动截取正文开头"
- 200：计数 `200 / 200`，非红色
- 201：超出部分被截掉，输入框内容为 200 个 `文`，计数 `200 / 200`，非红色，不出现"摘要不能超过 200 字"；保存后 `GET` 读回 `summary` = 200 个 `文`
- 计数变红并提示"摘要不能超过 200 字"只在已有内容超过 200 字时出现（经接口无法保存这样的内容，本用例不覆盖）

**playwright_hint：**
```ts
await page.getByLabel('摘要').fill('文'.repeat(201));
await expect(page.getByLabel('摘要')).toHaveValue('文'.repeat(200));
await expect(page.getByText('200 / 200')).toBeVisible();
await expect(page.getByText('摘要不能超过 200 字')).toHaveCount(0);
```

**清理：** 删除文章 P

---

### TC-US03-25: 标签添加、自动补全、删除

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-25 |
| covers | SC-POSTINFO-10 |
| Scenario | 标签块交互全流程 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】Seed 标签 `astro`、`react` 存在；`postFactory({tags:[]})` 创建文章 P，打开编辑页

**步骤：**
1. 在标签框输入 `as`
2. 选中下拉中的 `astro`
3. 输入 `cloudflare` 并回车
4. 再次输入 `astro` 并回车（错误猜测：重复添加）
5. 点击 `astro` 标签块上的 ×
6. 按 `ControlOrMeta+S`

**预期结果：**
- 步骤 1：下拉建议显示 `astro`，不显示 `react`
- 步骤 3：显示两个标签块 `astro`、`cloudflare`
- 步骤 4：仍只有两个标签块（不重复）
- 步骤 5：只剩 `cloudflare`
- 步骤 6：`GET` 读回 `tags` = `["cloudflare"]`

**playwright_hint：**
```ts
const tagInput = page.getByLabel('标签');
await tagInput.fill('as');
await page.getByRole('option', { name: 'astro' }).click();
await tagInput.fill('cloudflare'); await tagInput.press('Enter');
await expect(page.getByTestId('tag-chip')).toHaveText(['astro', 'cloudflare']);
await page.getByTestId('tag-chip').filter({ hasText: 'astro' }).getByRole('button', { name: /删除|×/ }).click();
await expect(page.getByTestId('tag-chip')).toHaveText(['cloudflare']);
```

**清理：** 删除文章 P

---

### TC-US03-26: 编辑页访问不存在文章显示 404

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-26 |
| covers | SC-POSTINFO-11 |
| Scenario | 访问 `/admin/posts/nope` |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】id `nope` 不存在；【环境前置】已登录

**步骤：**
1. 访问 `/admin/posts/nope`
2. 点击"返回文章列表"

**预期结果：**
- 步骤 1：HTTP 状态 404；页面显示"文章不存在或已被删除"与"返回文章列表"链接；不渲染编辑表单
- 步骤 2：跳转至 `/admin`

**playwright_hint：**
```ts
const resp = await page.goto('/admin/posts/nope');
expect(resp?.status()).toBe(404);
await expect(page.getByText('文章不存在')).toBeVisible();
await page.getByRole('link', { name: '返回文章列表' }).click();
await expect(page).toHaveURL(/\/admin$/);
```

**清理：** 无

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-POSTINFO-01 | BH-01 | TC-US03-17 |
| SC-POSTINFO-02 | BH-02 | TC-US03-01, TC-US03-02, TC-US03-03, TC-US03-13, TC-US03-14, TC-US03-15, TC-US03-16, TC-US03-18 |
| SC-POSTINFO-03 | BH-03 | TC-US03-02, TC-US03-13, TC-US03-19 |
| SC-POSTINFO-04 | BH-04 | TC-US03-04, TC-US03-20 |
| SC-POSTINFO-05 | BH-05 | TC-US03-20 |
| SC-POSTINFO-06 | BH-06 | TC-US03-04, TC-US03-05, TC-US03-21 |
| SC-POSTINFO-07 | BH-07 | TC-US03-06, TC-US03-07, TC-US03-22 |
| SC-POSTINFO-08 | BH-08 | TC-US03-08, TC-US03-09, TC-US03-23 |
| SC-POSTINFO-09 | BH-09 | TC-US03-10, TC-US03-24 |
| SC-POSTINFO-10 | BH-10 | TC-US03-11, TC-US03-15, TC-US03-25 |
| SC-POSTINFO-11 | BH-11 | TC-US03-12, TC-US03-13, TC-US03-26 |

**Story 验收标准追溯**：AC1→TC-17；AC2→TC-04/20/21；AC3→TC-20；AC4→TC-08/09/23；AC5（标题不能为空）→TC-03（保存时存为"无标题"）、TC-US08-04（发布拦截）（behaviors.md 未为 AC5 单列 BH/SC，暂挂 SC-POSTINFO-02）；AC6→TC-11/25；AC7→TC-02/19。

**NFR 追溯**：授权/401→TC-13；CSRF Origin→TC-14；XSS→TC-15；写接口 P95→TC-16。

**Gap 检查**：behaviors.md SC-ID 集合 {SC-POSTINFO-01 … SC-POSTINFO-11}（11 个）与本文件 covers 集合求差 = ∅。

**Gap: 无**

---

## 执行记录

| 日期 | 执行人 | 结果 | 备注 |
|------|--------|------|------|
| — | — | ⏳ | 待 implement 阶段转化执行 |

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | AI（design-acceptance） |
| 2026-10-13 | v1.1 | 与 design-ui 对齐（build-editor-page-shell）：编辑页路由 `/admin/posts/:id`（去掉 `/edit`）；不存在时文案"文章不存在或已被删除"、链接"返回文章列表"回到 `/admin` | miraclehifi |
| 2026-10-15 | v1.2 | 期望值同步现行契约（sync-f001-acceptance-expectations）：约定表定稿（slug ≤ 80、标题 ≤ 200 按码点计、空标题存为"无标题"、slugify 先 NFKD、PUT 带齐七字段、422 `MISSING_FIELDS`）；TC-01 / 02 / 03 / 04 / 05 / 06 / 07 / 08 / 09 / 11 / 20 / 24 | miraclehifi |
