# 检测未引用媒体 验收测试

**US ID**: US-01
**Story**: [story.md](../../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-01-detect-orphans/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-01-detect-orphans/behaviors.md)
**最后更新**: 2026-10-16
**Version Tag**: v1.0

> 验收规格（非可执行代码）。占位接口，**接口路径与响应字段以 design-domain API 契约为准**：
> - 检测：`GET /api/admin/storage/orphans`
> - 页面：`/admin/storage`
>
> 体积显示按 [shared-field-formats](../../../../../engineering/shared-field-formats.md)"文件体积"（1 MB = 1,048,576 B）。
> 时间相关用例通过 `images.created_at` 造数据（相对"现在"偏移），不等待真实时间。

## 测试数据（共享 Factory）

| 名称 | 构造方式 | 说明 |
|------|---------|------|
| `img(key, {size, videoSize, ageHours})` | 直接写 D1 `images` + R2 `MEDIA`（测试 bucket） | key 形如 `img/2026/10/{10 位 base32}_800x600_112233.jpg`；`ageHours` 决定 `created_at = now - ageHours` |
| `post({body, cover, pubBody, pubCover})` | 直接写 D1 `posts` | `pubBody` 非空时同时写 `pub_hash`、`pub_slug`、`pub_title`（满足 CHECK） |

**清理**：每个用例结束清空 `posts`、`images` 与测试 bucket 中 `img/` 前缀对象（workers 测试按文件隔离存储）。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US01-01 | SC-DETECT-01 | 顶栏进入存储页，三项统计与体积显示 | P0 | e2e |
| TC-US01-02 | SC-DETECT-02, SC-DETECT-03, SC-DETECT-04 | 四列引用判定：body / pub_body / cover / pub_cover | P0 | api |
| TC-US01-03 | SC-DETECT-05 | 引用写法等价类：图片语法、链接、HTML、完整地址、带片段 | P0 | api |
| TC-US01-04 | SC-DETECT-06 | 未引用图片及其视频的计数与体积 | P0 | api |
| TC-US01-05 | SC-DETECT-07, SC-DETECT-08 | 实况视频引用判定（决策表） | P0 | api |
| TC-US01-06 | SC-DETECT-09 | 24 小时保护期边界 | P0 | api |
| TC-US01-07 | SC-DETECT-05 | key 匹配错误猜测：相似 key、前后缀不误判 | P1 | api |
| TC-US01-08 | SC-DETECT-16 | 未登录调用检测接口 → 401 | P0 | security |
| TC-US01-09 | SC-DETECT-15 | 未登录访问存储页跳转登录 | P0 | e2e |
| TC-US01-10 | SC-DETECT-14 | 存储页不请求任何图片 / 视频 | P1 | e2e |
| TC-US01-11 | SC-DETECT-01 | 检测性能：300 篇 / 3,000 张 < 2s | P2 | performance |
| TC-US01-12 | SC-DETECT-10 | 空状态：无未引用资源 | P1 | ui-interaction |
| TC-US01-13 | SC-DETECT-11 | 重新检测刷新统计与检测时间 | P1 | ui-interaction |
| TC-US01-14 | SC-DETECT-12 | 检测中加载态与按钮不可点 | P2 | ui-interaction |
| TC-US01-15 | SC-DETECT-13 | 检测失败错误态与重试 | P1 | ui-interaction |

**覆盖目标**：需求覆盖 100%（AC1–AC10）、行为覆盖 100%（SC-DETECT-01 – 16）。

---

## 功能 / 接口测试

### TC-US01-01: 顶栏进入存储页，三项统计与体积显示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-01 |
| covers | SC-DETECT-01 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-16 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`img(O1, {size: 1500000, videoSize: 1000000, ageHours: 48})`、`img(O2, {size: 1500000, ageHours: 48})` 不被引用；`img(V, {size: 400000, videoSize: 2000000, ageHours: 48})` 被一篇文章 body 以无片段形式引用
- 【环境前置】已登录，位于 `/admin`

**步骤：**
1. 点击后台顶栏"存储"

**预期结果：**
- URL 为 `/admin/storage`；顶栏"存储"为当前项
- "未引用图片"显示 `2 张` 与 `2.9 MB`（3,000,000 B）
- "未引用实况视频"显示 `1 个` 与 `1.9 MB`（2,000,000 B）
- "预计可释放"显示 `5.7 MB`（6,000,000 B），视觉高亮
- 显示检测时间（本地时区 HH:mm）

### TC-US01-02: 四列引用判定

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-02 |
| covers | SC-DETECT-02, SC-DETECT-03, SC-DETECT-04 |
| Priority | P0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-16 v1.0 初始创建 |

**前置条件（等价类：每列一个只出现在该列的图片，均 48 小时前上传）：**

| 图片 | 只出现在 | 文章状态 |
|------|---------|---------|
| A | `body` | 草稿（`pub_hash IS NULL`） |
| B | `pub_body` | 已发布、工作稿已删掉 B |
| C1 | `cover` | 草稿 |
| C2 | `pub_cover` | 已发布、工作稿封面已换 |
| O | 无 | — |

**步骤：** `GET /api/admin/storage/orphans`

**预期结果：**
- 200；`orphanImageCount = 1`，`orphanImageBytes = O.size`
- A、B、C1、C2 都不计入

### TC-US01-03: 引用写法等价类

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-03 |
| covers | SC-DETECT-05 |
| Priority | P0 |
| type | api |

**测试数据（每行一张图片，只出现在一篇草稿 body 中，48 小时前上传）：**

| 写法 | 示例 |
|------|------|
| 图片语法 | `![a](/img/2026/10/k1…_800x600_112233.jpg)` |
| 图片语法 + title + 片段 | `![a](/img/…jpg#wide,accordion "图注")` |
| 普通链接 | `[原图](/img/…jpg)` |
| HTML | `<img src="/img/…webp">` |
| 完整地址 | `https://miracle-halcyon.example/img/…png` |
| 代码块内 | ```` ```\n/img/…gif\n``` ```` |

**预期结果：** 以上图片均不计入未引用（判定按 key 全文匹配，不解析 Markdown；代码块内出现也算引用——宁可少删）。

### TC-US01-04: 未引用图片及其视频的计数与体积

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-04 |
| covers | SC-DETECT-06 |
| Priority | P0 |
| type | api |

**前置条件：** `img(O, {size: 1000, videoSize: 5000, ageHours: 48})` 不被引用；无其他图片

**预期结果（逐字段）：**
- `orphanImageCount = 1`，`orphanImageBytes = 1000`
- `orphanVideoCount = 0`，`orphanVideoBytes = 0`
- `totalOrphanBytes = 6000`（含 O 的视频）
- `protectedCount = 0`

### TC-US01-05: 实况视频引用判定（决策表）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-05 |
| covers | SC-DETECT-07, SC-DETECT-08 |
| Priority | P0 |
| type | api |

**决策表（均为带视频图片，48 小时前上传）：**

| # | 图片被引用 | 任一引用片段含 `live` | 预期 |
|---|-----------|---------------------|------|
| 1 | 否 | — | 计入未引用图片（视频随图片） |
| 2 | 是（`…jpg`、`…jpg#wide`） | 否 | 视频计入未引用视频，图片不计 |
| 3 | 是（`…jpg`、`…jpg#wide,live`，后者在另一篇的 pub_body） | 是 | 都不计 |
| 4 | 是（`…jpg#live`） | 是 | 都不计 |
| 5 | 是（`…jpg#LIVE`、`…jpg#lively`） | 保守视为是（ADR-009：URL 片段含 live 即算，不区分大小写） | 都不计（视频保留） |
| 6 | 是（`…jpg#wide`，同一正文后面别处出现英文单词 live） | 否（片段只有 wide，与预览一致） | 视频计入未引用视频 |
| 8 | 是（只出现视频地址 `…_112233.live.mp4`） | 是（直接引用视频） | 都不计 |
| 7 | 普通图片（无视频）被引用、不带 live | — | 都不计 |

**预期结果：** `orphanVideoCount = 2`，`orphanVideoBytes` 只含 #2、#6 的视频体积；另加一条一致性断言：对 markdown `parseMarks` 判定为含 `live` 的任意 URL，引用查询也判定为带实况（不能漏判）。

### TC-US01-06: 24 小时保护期边界

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-06 |
| covers | SC-DETECT-09 |
| Priority | P0 |
| type | api |

**测试数据（边界值）：**

| 图片 | 情况 | 上传距今 | 预期 |
|------|------|---------|------|
| N1 | 未引用 | 23 小时 59 分 | 不计入，计入 `protectedCount` |
| N2 | 带视频、引用不带 live | 1 小时 | 不计入，计入 `protectedCount` |
| N3 | 未引用 | 24 小时 1 分 | 计入未引用图片 |
| N4 | 已引用 | 1 小时 | 不计入，也不计入 `protectedCount`（本来就不是候选） |

**预期结果：** `orphanImageCount = 1`（N3），`orphanVideoCount = 0`，`protectedCount = 2`

### TC-US01-07: key 匹配错误猜测

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-07 |
| covers | SC-DETECT-05 |
| Priority | P1 |
| type | api |

**测试数据：** 图片 `img/2026/10/abcdefghij_800x600_112233.jpg` 不被引用，但正文出现：
- 同 id、不同尺寸：`/img/2026/10/abcdefghij_801x600_112233.jpg`
- 同名不同月：`/img/2026/09/abcdefghij_800x600_112233.jpg`
- 只出现视频地址：`/img/2026/10/abcdefghij_800x600_112233.live.mp4`（key 主干相同，视为引用了该图片——宁可少删）
- key 中的 `_` 不当作通配符：`/img/2026/10/abcdefghijX800x600_112233.jpg` 不算引用

**预期结果：** 前两种不算引用（计入未引用）；第三种算引用（不计入未引用图片）。

### TC-US01-08: 未登录调用检测接口 → 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-08 |
| covers | SC-DETECT-16 |
| Priority | P0 |
| type | security |

**步骤：** 无 cookie / 过期会话 cookie 分别调用 `GET /api/admin/storage/orphans`
**预期结果：** 401，`error.code = UNAUTHENTICATED`（auth 契约），响应不含统计

### TC-US01-09: 未登录访问存储页跳转登录

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-09 |
| covers | SC-DETECT-15 |
| Priority | P0 |
| type | e2e |

**步骤：** 未登录访问 `/admin/storage`
**预期结果：** 跳转 `/admin/login?next=%2Fadmin%2Fstorage`；登录后回到 `/admin/storage`

### TC-US01-10: 存储页不请求任何图片 / 视频

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-10 |
| covers | SC-DETECT-14 |
| Priority | P1 |
| type | e2e |

**前置条件：** 有未引用图片（带视频）与被引用图片
**步骤：** 监听 `page.on('request')`，打开 `/admin/storage`，等检测完成，点"重新检测"
**预期结果：** 没有 URL 路径以 `/img/` 开头的请求；页面无 `<img>`、`<video>` 指向 `/img/`

### TC-US01-11: 检测性能

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-11 |
| covers | SC-DETECT-01 |
| Priority | P2 |
| type | performance |

**前置条件：** 300 篇文章（工作稿与已发布快照各约 10 KB、各含 10 张图片引用）、3,000 张图片记录（600 张未引用）
**预期结果：** `GET /api/admin/storage/orphans` 在 workers 测试环境中 < 2s，结果正确（`orphanImageCount = 600`）（基线见 ADR-009）

---

## UI 交互测试

### TC-US01-12: 空状态

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-12 |
| covers | SC-DETECT-10 |
| Priority | P1 |
| type | ui-interaction |

**前置条件：** 只有被引用的图片 + 1 张 1 小时前上传的未引用图片
**预期结果：** 三项统计为 `0 张 · 0 MB`、`0 个 · 0 MB`、`0 MB`；显示"存储状态良好，无未引用文件"；"一键清理未引用资源"禁用；显示"近 24 小时上传的 1 项不参与清理"

**playwright_hint：**
```ts
await expect(page.getByText("存储状态良好，无未引用文件")).toBeVisible();
await expect(page.getByRole("button", { name: "一键清理未引用资源" })).toBeDisabled();
await expect(page.getByText("近 24 小时上传的 1 项不参与清理")).toBeVisible();
```

### TC-US01-13: 重新检测

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-13 |
| covers | SC-DETECT-11 |
| Priority | P1 |
| type | ui-interaction |

**步骤：** 打开存储页（1 张未引用）→ 测试直接写 D1，把该图片 key 写入一篇文章 body → 点"重新检测"
**预期结果：** 未引用图片变为 `0 张`；检测时间更新（用 `page.clock` 前进 2 分钟后点，时间文本变化）

**playwright_hint：**
```ts
await page.clock.install();
await page.goto("/admin/storage"); await waitForHydration(page);
await page.clock.fastForward("02:00");
await page.getByRole("button", { name: "重新检测" }).click();
await expect(page.getByTestId("orphan-images")).toContainText("0 张");
```

### TC-US01-14: 检测中加载态

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-14 |
| covers | SC-DETECT-12 |
| Priority | P2 |
| type | ui-interaction |

**步骤：** `page.route` 拦截检测接口延迟 1s 后放行；打开页面
**预期结果：** 延迟期间统计区 `aria-busy="true"`，"重新检测"与"一键清理"禁用；放行后显示数字、按钮恢复

**playwright_hint：**
```ts
await page.route("**/api/admin/storage/orphans", async (r) => { await gate; await r.continue(); });
await expect(page.getByRole("button", { name: "重新检测" })).toBeDisabled();
```

### TC-US01-15: 检测失败错误态与重试

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-15 |
| covers | SC-DETECT-13 |
| Priority | P1 |
| type | ui-interaction |

**步骤：** 第一次检测请求 `route.fulfill({ status: 500 })`（或 `route.abort()` 模拟断网）；之后取消拦截，点"重新检测"
**预期结果：** 失败时统计区显示"检测失败，请重试"（`role="alert"`），"一键清理"禁用；重试后正常显示统计

**playwright_hint：**
```ts
await page.route("**/api/admin/storage/orphans", (r) => r.fulfill({ status: 500, body: "{}" }), { times: 1 });
await expect(page.getByRole("alert")).toHaveText(/检测失败，请重试/);
```

---

## 追溯矩阵

| AC | Behavior | TC |
|----|----------|----|
| AC1 | SC-DETECT-01 | TC-US01-01、11 |
| AC2 | SC-DETECT-02 | TC-US01-02 |
| AC3 | SC-DETECT-03、04 | TC-US01-02 |
| AC4 | SC-DETECT-05 | TC-US01-03、07 |
| AC5 | SC-DETECT-06 | TC-US01-04 |
| AC6 | SC-DETECT-07、08 | TC-US01-05 |
| AC7 | SC-DETECT-09 | TC-US01-06 |
| AC8 | SC-DETECT-11 | TC-US01-13 |
| AC9 | SC-DETECT-14 | TC-US01-10 |
| AC10 | SC-DETECT-15、16 | TC-US01-08、09 |
| — | SC-DETECT-10、12、13 | TC-US01-12、14、15 |
