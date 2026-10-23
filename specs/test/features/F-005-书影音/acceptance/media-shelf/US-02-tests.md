# 粘贴豆瓣链接识别填表 验收测试

**US ID**: US-02
**Story**: [story.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/behaviors.md)
**最后更新**: 2026-10-22
**Version Tag**: v1.0

> 验收规格（非可执行代码）。占位接口，**接口路径、字段与错误码以 design-domain API 契约为准**：
> - 识别：`POST /api/admin/shelf/recognize`，请求 `{text, excludeId?}`
>   - 成功：`{fields: {type, title, creator, year, coverData, doubanUrl, doubanId}, missing: [...]}`（`coverData` 为服务端下载的封面 `data:` URL，ADR-011）
>   - 重复：`{duplicate: {id, title}}`
>   - 失败：`error.code` ∈ `NOT_DOUBAN_LINK` / `NOT_SUBJECT_LINK` / `FETCH_FAILED` / `PARSE_FAILED`
> - 封面：识别时下载；保存时以文件随 US-01 保存接口提交，保存接口不接受外部 URL
>
> **豆瓣数据来源打桩**：workers 测试替换 `fetch`，按请求 URL 返回 `tests/fixtures/douban/` 下的录制响应（2026-10-21 spike 录制，来源条目见该目录 README）；E2E 中服务端请求无法被 Playwright 拦截，识别接口用 `page.route` 打桩，真实豆瓣链路只在 spike 与 verify 手工 / 脚本核对（不进 CI，避免依赖外网）。
> 未特别注明的 TC：Version Tag v1.0、Automation Feasibility ✅、Change History "2026-10-21 v1.0 初始创建"。

## 测试数据

### 录制夹具（Fixture，只读）

| 名称 | 内容 | 期望识别 |
|------|------|---------|
| `book-principles` | 书《原则》（`book/27608239`），作者"[美] 瑞·达利欧"，2018，有封面 | book / 原则 / 瑞·达利欧（去掉国籍括号）/ 2018 |
| `book-manga` | 书，标签含"漫画" | comic |
| `movie-shawshank` | 电影《肖申克的救赎》，导演弗兰克·德拉邦特，1994 | movie / … / 1994 |
| `movie-animated` | 电影，类型含"动画" | movie |
| `tv-drama` | 电视剧，类型"剧情 / 悬疑" | series |
| `tv-anime` | 电视剧，类型含"动画" | series（动画剧集按剧集记） |
| `game-video` | 电子游戏，有开发商 | game，creator = 开发商 |
| `game-board` | 卡坦岛（`genres` 含"问答/桌游"） | boardgame |
| `book-no-year` | 书，无出版年 | missing 含 year |
| `no-title` | 返回 200 但无标题字段 | PARSE_FAILED |
| `tv-dispatch` | 作者提供的真实分享链接 `dispatch/movie/37501131` 对应 `movie/37501131`（韩剧，`is_tv: true`） | series |
| `redirect-offsite` | Rexxar 返回 302 → `https://evil.example/`（测试构造） | FETCH_FAILED，且不请求 evil.example |
| `cover-ok` / `cover-svg` / `cover-6mb` / `cover-timeout` / `cover-offsite` | 封面响应（`cover-offsite`：条目数据中的封面地址不在豆瓣图片域） | 见 TC-US02-09、11、12 |

**清理**：workers 测试按文件隔离；E2E 条目带 `e2e-{随机}` 前缀并在结束时删除。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US02-01 | SC-RECOG-03, SC-RECOG-04 | 识别条目链接：字段映射 | P0 | api |
| TC-US02-02 | SC-RECOG-05, SC-RECOG-06 | 从分享文字提取链接（等价类） | P0 | api |
| TC-US02-03 | SC-RECOG-09, SC-RECOG-10, SC-RECOG-11 | 分类推断（决策表） | P0 | api |
| TC-US02-04 | SC-RECOG-08 | 部分识别返回 missing | P0 | api |
| TC-US02-05 | SC-RECOG-13 | 非豆瓣 / 非条目链接 | P0 | api |
| TC-US02-06 | SC-RECOG-14 | 豆瓣请求失败与超时 | P0 | api |
| TC-US02-07 | SC-RECOG-15 | 解析不出条目 | P0 | api |
| TC-US02-08 | SC-RECOG-18, SC-RECOG-19 | 按豆瓣条目 ID 去重 | P0 | api |
| TC-US02-09 | SC-RECOG-23 | SSRF：白名单、不跟随跳转 | P0 | security |
| TC-US02-10 | SC-RECOG-24 | 未登录 / 跨站调用识别接口 | P0 | security |
| TC-US02-11 | SC-RECOG-20 | 识别时下载封面，保存后存入 R2 | P0 | api |
| TC-US02-12 | SC-RECOG-21 | 封面下载失败降级（等价类） | P0 | api |
| TC-US02-13 | SC-RECOG-14 | 识别总耗时 ≤ 8s | P1 | performance |
| TC-US02-14 | SC-RECOG-03, SC-RECOG-12 | E2E 主流程：识别 → 改分类 → 保存 | P0 | e2e |
| TC-US02-15 | SC-RECOG-01, SC-RECOG-02 | 识别框初始态，粘贴不自动识别 | P1 | ui-interaction |
| TC-US02-16 | SC-RECOG-16 | 空白内容时"识别"禁用 | P1 | ui-interaction |
| TC-US02-17 | SC-RECOG-17 | 识别中加载态，表单可继续输入 | P1 | ui-interaction |
| TC-US02-18 | SC-RECOG-07, SC-RECOG-08 | 只覆盖识别到的字段，提示已识别 / 未识别 | P0 | ui-interaction |
| TC-US02-19 | SC-RECOG-13, SC-RECOG-14, SC-RECOG-15 | 失败提示，表单不变 | P1 | ui-interaction |
| TC-US02-20 | SC-RECOG-18 | 重复提示与"去编辑" | P1 | ui-interaction |
| TC-US02-21 | SC-RECOG-22 | 清空后再识别覆盖 | P1 | ui-interaction |
| TC-US02-22 | SC-RECOG-20, SC-RECOG-21 | 封面预览与下载失败提示 | P1 | ui-interaction |
| TC-US02-23 | SC-RECOG-20 | 游戏不下载豆瓣封面，提示粘贴 IGDB 链接 | P1 | api |

**覆盖目标**：需求覆盖 100%（AC1–AC11）、行为覆盖 100%（SC-RECOG-01 – 24）。

---

## 功能 / 接口测试

### TC-US02-01: 识别条目链接：字段映射

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-03, SC-RECOG-04 | P0 | api |

**测试数据：** `text` = `https://book.douban.com/subject/1234567/`（→ `book-principles`）、`https://movie.douban.com/subject/1292052/`（→ `movie-shawshank`）、`https://m.douban.com/movie/subject/1292052/`（移动端链接）、`https://movie.douban.com/subject/1292052/?from=share#comments`

**预期结果：**
- 200；`fields` 逐字段：`type`、`title`、`creator`、`year`（整数）、`coverData`（`data:image/jpeg;base64,…`，解码后与夹具封面字节一致）、`doubanUrl`（规范化为 `https://{book|movie}.douban.com/subject/{id}/`，去掉查询与片段）、`doubanId`（纯数字字符串）
- `missing` 为 `[]`
- 移动端链接与带参数链接得到与桌面链接相同的 `doubanUrl` / `doubanId`
- 不返回状态、评分、日期、短评字段

### TC-US02-02: 从分享文字提取链接

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-05, SC-RECOG-06 | P0 | api |

| 输入 | 期望识别 |
|------|---------|
| `https://www.douban.com/doubanapp/dispatch/movie/37501131`（作者提供的真实 App 分享链接 → `tv-dispatch`） | 37501131，分类 series，`doubanUrl` 为 `https://movie.douban.com/subject/37501131/`；只请求 Rexxar 条目与封面 |
| `【豆瓣】我在看《肖申克的救赎》 https://www.douban.com/doubanapp/dispatch/movie/1292052` | 1292052 |
| `推荐 https://example.com/a 和 https://book.douban.com/subject/111/ 还有 https://book.douban.com/subject/222/` | 111 |
| 链接紧贴中文标点：`看这个：https://book.douban.com/subject/111/。` | 111 |
| 链接前后有换行与空格 | 正常识别 |
| `http://` 开头的条目链接 | 正常识别，`doubanUrl` 规范为 https |

### TC-US02-03: 分类推断（决策表）

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-09, SC-RECOG-10, SC-RECOG-11 | P0 | api |

| 豆瓣类别 | 条件 | 期望 `type` | 夹具 |
|---------|------|------------|------|
| 书 | 标签无"漫画" | book | book-principles |
| 书 | 标签含"漫画" | comic | book-manga |
| 电影 | 任意（含动画） | movie | movie-shawshank、movie-animated |
| 电视剧 | 任意（含动画） | series | tv-drama、tv-anime |
| 游戏 | 电子游戏 | game | game-video |
| 游戏 | 桌游判定字段命中 | boardgame | game-board |

**预期结果：** 与表一致；`game-video` 的 `creator` 为开发商

### TC-US02-04: 部分识别返回 missing

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-08 | P0 | api |

**测试数据：** `book-no-year`；另构造无封面、无作者的书夹具

**预期结果：** 200；缺失字段在 `fields` 中为 `null`，并列入 `missing`（如 `["year"]`、`["cover", "creator"]`）；`title` 缺失不属于部分识别（见 TC-07）

### TC-US02-05: 非豆瓣 / 非条目链接

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-13 | P0 | api |

| 输入 | 期望 `error.code` |
|------|------------------|
| `https://example.com/book/1` | NOT_DOUBAN_LINK |
| `一段没有链接的文字` | NOT_DOUBAN_LINK |
| `https://douban.com.evil.example/subject/1/` | NOT_DOUBAN_LINK |
| `https://www.douban.com/`、`https://www.douban.com/doulist/123/` | NOT_SUBJECT_LINK |
| `https://book.douban.com/subject/abc/` | NOT_SUBJECT_LINK |
| 空字符串、`text` 缺失、10,001 字符 | 400 VALIDATION_FAILED |

**预期结果：** 422（或契约约定的状态码）+ 对应错误码；以上情况均未向外发出任何请求

### TC-US02-06: 豆瓣请求失败与超时

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-14 | P0 | api |

**测试数据：** 桩分别返回 404、418、500、抛网络错误、挂起不响应

**预期结果：** 均返回 `FETCH_FAILED`；挂起时在 8s 内返回（用假计时器或缩短超时配置验证）

### TC-US02-07: 解析不出条目

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-15 | P0 | api |

**测试数据：** `no-title`；返回 HTML 人机验证页而非 JSON；返回非法 JSON

**预期结果：** 均返回 `PARSE_FAILED`

### TC-US02-08: 按豆瓣条目 ID 去重

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-18, SC-RECOG-19 | P0 | api |

**前置：** `entry({id: X, doubanId: "1234567", title: "原则"})`；`entry({doubanId: null})` 若干

| 请求 | 期望 |
|------|------|
| `text` = 1234567 链接，无 `excludeId` | `{duplicate: {id: X, title: "原则"}}`，不返回 `fields` |
| 同上，`excludeId: X` | 正常返回 `fields` |
| `text` = 1234567 链接，`excludeId: 其他条目` | duplicate |
| 条目 X 已清除豆瓣链接后再识别 | 正常返回 `fields` |
| 隐藏的条目同 ID | duplicate（隐藏条目也参与去重） |

**附加：** 两个条目保存为同一 `doubanId`（绕过识别直接调用保存接口）→ 第二个返回 409 `DUPLICATE_DOUBAN_ID`；`doubanId` 为 `null` 的条目可任意多

### TC-US02-09: SSRF：白名单、不跟随跳转

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-23 | P0 | security |

| 输入 | 期望 |
|------|------|
| `redirect-offsite` | FETCH_FAILED，fetch 桩未收到对 evil.example 的请求（所有请求 `redirect: "manual"`） |
| `http://127.0.0.1/subject/1/`、`http://169.254.169.254/` | NOT_DOUBAN_LINK，无请求 |
| `https://book.douban.com@evil.example/subject/1/` | NOT_DOUBAN_LINK，无请求 |
| 条目数据中的封面地址为 `https://evil.example/a.jpg`（`cover-offsite`） | 不下载，`coverData: null`，`missing` 含 `cover` |
| 保存接口请求体带任意外部封面地址字段（如 `coverUrl`） | 字段被忽略，不发出外部请求；封面只认上传文件 |

**预期结果：** 所有外发请求的主机都在白名单内（夹具桩记录全部请求 URL 用于断言）

### TC-US02-10: 未登录 / 跨站调用识别接口

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-24 | P0 | security |

**预期结果：** 无 Cookie → 401；有效会话 + 异站 Origin → 403；两种情况 fetch 桩均未收到请求

### TC-US02-11: 识别时下载封面，保存后存入 R2

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-20 | P0 | api |

**步骤：** 1. 识别 `book-principles`，封面桩返回 `cover-ok`（jpg）　2. 把 `coverData` 解码为文件，随 US-01 新增接口提交

**预期结果：** 1：封面请求带豆瓣 `Referer`，`coverData` 为 `data:image/jpeg;base64,…`；2：201，R2 有新对象，Content-Type `image/jpeg`，条目 `cover` 为 `/covers/...` 站内路径，记录中无任何豆瓣地址

### TC-US02-12: 封面下载失败降级

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-21 | P0 | api |

| 封面响应 | 期望 |
|---------|------|
| `cover-svg`（或 HTML 418 页） | 200，其余字段正常，`coverData: null`，`missing` 含 `cover` |
| `cover-6mb` | 同上 |
| `cover-timeout` | 同上，整次识别仍在 8 秒内返回 |
| 5 MiB 整 jpg | `coverData` 非空 |

**预期结果：** 识别过程不写 R2（识别接口无任何持久化副作用）

### TC-US02-13: 识别总耗时 ≤ 8s

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-14 | P1 | performance |

**步骤：** 书条目接口桩延迟 3s、标签接口桩延迟 3s（并行）、封面桩延迟 6s

**预期结果：** 接口在 8s（+ 200ms 容差）内返回：条目字段齐全、`coverData: null`、`missing` 含 `cover`；条目接口本身超过 8s 时返回 `FETCH_FAILED`

### TC-US02-14: E2E 主流程：识别 → 改分类 → 保存

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-03, SC-RECOG-12 | P0 | e2e |

**前置：** `page.route` 桩识别接口返回 `tv-drama` 被判为 `series` 的结果（`title: "e2e-xxx 某剧 第一季"`、`coverData` 为一张小 jpg 的 data URL）；保存接口不打桩

**步骤：** 新增表单粘贴链接 → 点"识别" → 分类改"电影"、标题去掉"第一季"、选状态"看过" → 保存

**预期结果：** 列表"电影"标签下出现该条目，标题为修改后的值、封面缩略图来自 `/covers/`；编辑表单中豆瓣链接仍在

---

## UI 交互测试

### TC-US02-15: 识别框初始态，粘贴不自动识别

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-01, SC-RECOG-02 | P1 | ui-interaction |

**步骤：** 打开新增表单 → 向识别框粘贴链接 → 等待 1s

**预期结果：** 初始有占位文字、"识别"按钮，无清空按钮；粘贴后出现清空按钮，未发出识别请求

**playwright_hint：** `const box = page.getByPlaceholder('粘贴豆瓣分享链接或分享文字，自动识别条目信息'); await box.fill(url); await page.clock.runFor(1000); expect(recognizeCalls).toBe(0); await expect(page.getByRole('button', { name: '清空' })).toBeVisible()`

### TC-US02-16: 空白内容时"识别"禁用

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-16 | P1 | ui-interaction |

**预期结果：** 识别框为空或只有空格 / 换行时"识别"`disabled`；输入非空白字符后可用

**playwright_hint：** `await box.fill('  \n '); await expect(page.getByRole('button', { name: '识别' })).toBeDisabled()`

### TC-US02-17: 识别中加载态，表单可继续输入

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-17 | P1 | ui-interaction |

**前置：** 识别接口桩延迟 1s 后返回成功

**步骤：** 点"识别"，在等待期间填短评"等待中输入"、评分 3

**预期结果：** 等待期间按钮 `disabled` 且有加载态（`aria-busy="true"`），表单字段可编辑；返回后短评、评分保持，标题等被填入

**playwright_hint：** `await page.getByRole('button', { name: '识别' }).click(); await expect(page.getByRole('button', { name: /识别/ })).toHaveAttribute('aria-busy', 'true'); await page.getByLabel('短评').fill('等待中输入')`

### TC-US02-18: 只覆盖识别到的字段，提示已识别 / 未识别

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-07, SC-RECOG-08 | P0 | ui-interaction |

**前置：** 表单已填状态"在读"、评分 4、日期 2026-09-01、短评"还行"、年份 2020；识别桩返回 `book-no-year` 映射结果（`missing: ["year"]`）

**预期结果：** 标题、作者、封面预览被填入并短暂高亮（带高亮类，约 1.5s 后移除）；年份仍为 2020；状态、评分、日期、短评不变；提示"已识别：分类、标题、封面、作者"和"未识别：年份，请手动填写"

**playwright_hint：** `await expect(page.getByLabel('年份')).toHaveValue('2020'); await expect(page.getByText('未识别：年份，请手动填写')).toBeVisible(); await expect(page.getByLabel('标题')).toHaveAttribute('data-recognized', 'true')`

### TC-US02-19: 失败提示，表单不变

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-13, SC-RECOG-14, SC-RECOG-15 | P1 | ui-interaction |

**数据：** 识别桩依次返回 `NOT_DOUBAN_LINK`、`NOT_SUBJECT_LINK`、`FETCH_FAILED`、`PARSE_FAILED`、500

**预期结果：** 提示依次为"不是豆瓣链接""不是豆瓣条目链接""链接打不开""解析不出条目信息""识别失败，请稍后重试"；表单字段不变；手填后可保存

**playwright_hint：** `await page.route('**/shelf/recognize', r => r.fulfill({ status: 422, json: { error: { code: 'FETCH_FAILED' } } })); await expect(page.getByRole('status')).toContainText('链接打不开')`

### TC-US02-20: 重复提示与"去编辑"

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-18 | P1 | ui-interaction |

**前置：** 已有条目 `e2e-xxx 原则`；识别桩返回 `{duplicate: {id, title}}`

**预期结果：** 提示"这条已经录入过"与"去编辑"；表单不变；点"去编辑"打开该条目编辑表单（标题为 `e2e-xxx 原则`）；若当前表单有未保存内容，先确认放弃

**playwright_hint：** `await page.getByRole('button', { name: '去编辑' }).click(); await expect(page.getByLabel('标题')).toHaveValue(/原则/)`

### TC-US02-21: 清空后再识别覆盖

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-22 | P1 | ui-interaction |

**步骤：** 识别 A → 点清空 → 识别框为空且聚焦 → 粘贴 B 识别

**预期结果：** 标题、作者、年份、封面、豆瓣链接为 B；已识别提示更新为 B 的字段

**playwright_hint：** `await page.getByRole('button', { name: '清空' }).click(); await expect(box).toHaveValue(''); await expect(box).toBeFocused()`

### TC-US02-22: 封面预览与下载失败提示

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-20, SC-RECOG-21 | P1 | ui-interaction |

**步骤：** 1. 识别桩返回带 `coverData` 的结果　2. 识别桩返回 `coverData: null`、`missing: ["cover"]`

**预期结果：** 1：封面区显示预览图（`src` 以 `data:` 开头），全程无对 `doubanio.com` 的请求；2：封面区保持原状，结果区显示"未识别：封面，可手动上传"

**playwright_hint：** `await expect(page.getByRole('img', { name: '封面预览' })).toHaveAttribute('src', /^data:image/); await expect(page.getByText('未识别：封面，可手动上传')).toBeVisible()`

### TC-US02-23: 游戏不下载豆瓣封面，提示粘贴 IGDB 链接

| covers | Priority | type |
|--------|----------|------|
| SC-RECOG-20 | P1 | api |

**前置条件：** 游戏条目录制夹具（`genres` 不含"桌游"）与桌游夹具；替身 client 记录请求

**预期结果：** 游戏：200，`fields.type = "game"`、`coverData: null`、`missing` 含 `cover`，替身**没有**封面请求；前端提示"未识别：封面，游戏封面请粘贴 IGDB 图片链接"，平台下拉保持原值。桌游：照常下载封面（`coverData` 为 data URL）（2026-10-23 [game-case-shelf](../../../../../backlog/game-case-shelf.md)）

---

## 追溯矩阵

| AC | Behaviors | TC |
|----|-----------|----|
| AC1 识别框 | SC-RECOG-01, 02, 16 | TC-15, 16 |
| AC2 识别链接 | SC-RECOG-03, 04 | TC-01, 14 |
| AC3 分享文字 | SC-RECOG-05, 06 | TC-02 |
| AC4 不覆盖手填项 | SC-RECOG-07 | TC-18 |
| AC5 部分识别 | SC-RECOG-08 | TC-04, 18 |
| AC6 失败 | SC-RECOG-13, 14, 15 | TC-05, 06, 07, 13, 19 |
| AC7 识别中 | SC-RECOG-17 | TC-17 |
| AC8 去重 | SC-RECOG-18, 19 | TC-08, 20 |
| AC9 封面 | SC-RECOG-20, 21 | TC-11, 12, 22, 23 |
| AC10 改分类 | SC-RECOG-09–12 | TC-03, 14 |
| AC11 再次识别 | SC-RECOG-22 | TC-21 |
| NFR 防 SSRF / 鉴权 | SC-RECOG-23, 24 | TC-09, 10 |
