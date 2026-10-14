# 删除文章 验收测试

**US ID**: US-09
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-management/US-09-delete-post/behaviors.md)
**最后更新**: 2026-10-12
**Version Tag**: v1.1

> 验收规格（非可执行代码）。占位接口，**接口路径以 design-domain API 契约为准**：
> - 删除：`DELETE /api/admin/posts/:id`
> - 读者端：`GET /api/posts/:slug`，页面 `/`、`/posts/:slug`
>
> 约束：删除文章不删除 R2 图片；列表删除是前端延迟提交（6 秒撤销期结束或离开页面时才发 `DELETE`），撤销期过后的误删恢复依赖 D1 Time Travel，不提供回收站。
> 列表行操作见 [admin-post-list.md](../../../../../ui/pages/admin-post-list.md)"行操作""删除与撤销"。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US09-01 | SC-DELETE-01 | 从列表左滑删除（全滑 / 抽屉"删除"） | P0 | e2e |
| TC-US09-02 | SC-DELETE-02 | 从写文章页（含未保存修改）删除后回到列表 | P0 | e2e |
| TC-US09-03 | SC-DELETE-04 | 删除已发布（clean / dirty）文章后读者 404 且触发重建 | P0 | performance |
| TC-US09-04 | SC-DELETE-05 | 重复删除 / 不存在 id → 404，其他数据不受影响 | P1 | api |
| TC-US09-05 | SC-DELETE-06 | 删除接口 500 时提示且文章保留 | P1 | e2e |
| TC-US09-06 | SC-DELETE-01, SC-DELETE-04 | 状态转换：任意状态 → deleted；deleted 上的操作被拒 | P0 | api |
| TC-US09-07 | SC-DELETE-01 | 未登录删除 → 401 | P0 | security |
| TC-US09-08 | SC-DELETE-01 | 跨站 Origin 删除被拒（CSRF） | P1 | security |
| TC-US09-09 | SC-DELETE-01 | 删除不删除 R2 图片 | P2 | api |
| TC-US09-10 | SC-DELETE-01, SC-DELETE-02 | 写文章页确认框文案、标题特殊字符转义（含列表撤销提示） | P1 | ui-interaction |
| TC-US09-11 | SC-DELETE-03 | 写文章页取消 / Esc 关闭确认框，文章仍在 | P0 | ui-interaction |
| TC-US09-12 | SC-DELETE-02 | 写文章页确认删除进行中防重复提交 | P1 | ui-interaction |
| TC-US09-13 | SC-DELETE-01 | 删除后分页与空状态联动（边界：21 → 20 篇、1 → 0 篇） | P2 | ui-interaction |
| TC-US09-14 | SC-DELETE-07 | 列表删除后撤销：原位恢复、不发请求 | P0 | ui-interaction |
| TC-US09-15 | SC-DELETE-08 | 撤销期内离开页面 / 连续删除时立即提交 | P1 | e2e |
| TC-US09-16 | SC-DELETE-09 | 滑动交互：拖动不误跳转、同一时间一行、`⋯` 与键盘、减弱动效 | P1 | ui-interaction |

---

## 功能 / 接口测试

### TC-US09-01: 从列表确认删除

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-01 |
| covers | SC-DELETE-01 |
| Scenario | BH-01 从列表确认删除文章 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 创建草稿 "Old Post"、"Old Post 2" 与另一篇 "Keep Post"
- 【环境前置】已登录，位于 `/admin`；记录 `DELETE` 请求时间

**步骤：**
1. 把 "Old Post" 行向左拖过行宽 60% 后松手（触摸与鼠标各一轮，分别造数据）
2. 等待 6 秒
3. 把 "Old Post 2" 左滑露出抽屉，点击"删除"，等待 6 秒
4. 刷新页面；`GET /api/admin/posts/{id}`

**预期结果：**
- 拖过 60% 时红色删除块铺满整行；松手后行折叠消失，"共 N 篇"与筛选数量立即减 1
- 显示提示"已删除《Old Post》"和"撤销"按钮；**列表里不弹确认框**
- 松手后 6 秒内没有 `DELETE` 请求；6 秒后发出 1 次
- 刷新后 "Old Post"、"Old Post 2" 都不存在，"Keep Post" 仍在；管理接口按 id 读取返回 404

**清理：** `resetPosts()`

---

### TC-US09-02: 从写文章页删除后回到列表

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-02 |
| covers | SC-DELETE-02 |
| Scenario | BH-02 从写文章页删除后回到列表 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿 "Old Post"
- 【环境前置】已登录，在 "Old Post" 写文章页；输入文字使状态栏为"未保存"（验证"离开确认"不被触发的关键前提）；监听 `beforeunload` / dialog 事件

**步骤：** 点击设置抽屉的"删除文章"并确认

**预期结果：**
- 跳转到 `/admin`，列表中不再有 "Old Post"
- 离开时不弹出"未保存"确认（无 dialog 事件）
- 删除后不再发出该文章的自动保存请求（防止"保存"把文章重新创建或返回 404 报错）

**清理：** `resetPosts()`

---

### TC-US09-03: 删除已发布文章后读者无法访问

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-03 |
| covers | SC-DELETE-04 |
| Scenario | BH-04 删除已发布文章后读者无法访问 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（缓存部分在预发布环境） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-12 v1.1 观察页面由首页 `/` 改为文章列表页 `/posts`（网站地图调整） |

**前置条件：**
- 【数据前置】已发布 clean 文章 slug `old-post`；已发布 dirty 文章 slug `old-dirty`（已发布 "D1"，编辑 "D2"）
- 【环境前置】预发布环境（已配置 Workers Builds Deploy Hook）；确认 `/posts`、`/posts/old-post`、`/posts/old-dirty` 为已发布状态的静态页

**步骤：** 分别删除两篇；记录 T0；读者接口立即检查，页面每 10s 轮询

**预期结果：**
- 读者端按 slug "old-post" 读取返回不存在（`old-dirty` 同样，已发布内容与未发布修改都不可读）
- 触发读者页重建：重建完成后（≤ 5 分钟，沿用 US-08 SC-PUBLISH-07 约定）文章列表页 `/posts` 不再列出、文章页返回 404
- 删除后可用同一 slug 新建文章（slug 被释放，以 design-domain 确认）

**清理：** `resetPosts()`；触发一次重建

---

### TC-US09-04: 重复删除 / 不存在 id → 404

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-04 |
| covers | SC-DELETE-05 |
| Scenario | BH-05 删除不存在的文章返回 404 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】文章 X（将被删除）、Y、Z；【环境前置】已登录

**测试数据 / 预期结果：**

| 请求 | 预期 |
|------|------|
| `DELETE /api/admin/posts/{X.id}`（首次） | 200/204 |
| 同一请求再次调用 | 404，不影响其他数据（Y、Z 仍在且内容不变） |
| `DELETE /api/admin/posts/nope` | 404 |
| `DELETE /api/admin/posts/`（空 id） | 404/405，不删除任何数据 |
| `DELETE /api/admin/posts/1%20OR%201=1` | 404/400，不删除任何数据 |
| `DELETE /api/admin/posts/*` | 404/400，不删除任何数据 |

**步骤：** 依次调用；最后 `GET /api/admin/posts` 校验总数为 2

**清理：** `resetPosts()`

---

### TC-US09-05: 删除失败提示且文章保留

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-05 |
| covers | SC-DELETE-06 |
| Scenario | BH-06 删除失败时提示且文章保留 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（路由拦截） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】文章 "Old Post"；【环境前置】已登录；拦截删除接口返回 500（另测 `route.abort()`）

**步骤：** 列表页全滑删除 "Old Post"，等待 6 秒撤销期结束；另在写文章页"删除文章" → "确认删除"

**预期结果：**
- 列表场景：该行回到原位置，数量恢复，显示常驻提示"删除《Old Post》失败，请重试"
- 写文章页场景：显示"删除失败，请重试"，停留在写文章页，不跳转，编辑内容不丢失
- 取消拦截后重试可删除成功

**清理：** `unroute`；`resetPosts()`

---

### TC-US09-06: 状态转换：任意 → deleted

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-06 |
| covers | SC-DELETE-01, SC-DELETE-04 |
| Scenario | 删除在状态机中的合法与非法转换 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】每行独立构造起始状态；【环境前置】已登录

**转换表：**

| # | 起始状态 | 事件 | 合法 | 预期 |
|------|------|------|------|------|
| D1 | draft（从未发布） | delete | ✅ | deleted；管理端 404 |
| D2 | draft（曾发布后撤回） | delete | ✅ | deleted；读者端仍 404 |
| D3 | published(clean) | delete | ✅ | deleted；读者端 404 |
| D4 | published(dirty) | delete | ✅ | deleted；已发布内容与编辑内容均不可读 |
| D5 | deleted | delete | ❌ | 404 |
| D6 | deleted | publish / update / unpublish | ❌ | 404 |
| D7 | deleted | save（自动保存 PUT） | ❌ | 404，不重新创建文章 |
| D8 | deleted | GET 写文章页 | ❌ | 显示"文章不存在"（SC-POSTINFO-11） |

**步骤：** 构造起始状态 → 调用事件 → 校验管理端与读者端

**预期结果：** 与转换表一致；非法转换不产生任何数据

**清理：** `resetPosts()`

---

### TC-US09-07: 未登录删除 → 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-07 |
| covers | SC-DELETE-01 |
| Scenario | 权限：删除需有效会话 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】已发布文章 P；【环境前置】无 Cookie / `session=forged` / 已登出旧 Cookie

**步骤：** 各身份调用 `DELETE /api/admin/posts/{P.id}`；对不存在 id 同样调用

**预期结果：**
- 全部返回 401（不存在 id 也返回 401 而非 404，避免未授权探测 id）
- P 仍存在，读者仍可读取

**清理：** `resetPosts()`

---

### TC-US09-08: 跨站 Origin 删除（CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-08 |
| covers | SC-DELETE-01 |
| Scenario | NFR 写接口校验 Origin |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】文章 P；【环境前置】有效管理员 Cookie

**步骤：** 带 `Origin: https://evil.example.com` 调用删除

**预期结果：** 403（以契约为准），P 仍存在

**清理：** `resetPosts()`

---

### TC-US09-09: 删除不删除 R2 图片

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-09 |
| covers | SC-DELETE-01 |
| Scenario | 约束：图片管理不在本 Feature 范围 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】上传测试图片 `a.png` 至测试 R2 桶，文章正文引用其 URL；【环境前置】已登录

**步骤：** 删除文章；HEAD 图片 URL

**预期结果：** 文章删除成功；图片 URL 仍返回 200，R2 对象数量不变

**清理：** `resetPosts()`；删除测试 R2 对象

---

## UI 交互测试

> 以下 TC 均为 `type: ui-interaction`，Playwright 运行；选择器为建议写法。

### TC-US09-10: 确认框文案与标题转义

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-10 |
| covers | SC-DELETE-01 |
| Scenario | BH-01 确认框内容；错误猜测：标题含 HTML/超长 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】"Old Post"、`<img src=x onerror=alert(1)>`、200 字长标题三篇；【环境前置】已登录

**步骤：** 分别在三篇的写文章页打开删除确认框；再在列表全滑删除 HTML 标题那篇

**预期结果：**
- 弹出确认框，标题"删除《Old Post》？"，说明"删除后无法恢复。已发布的文章读者将无法再访问。"
- HTML 标题作为纯文本显示，不执行脚本（无 dialog 事件）
- 长标题截断或换行，不撑破对话框，"确认删除"/"取消"按钮可见
- 对话框 `role="alertdialog"`，打开后焦点在"取消"（破坏性操作默认安全按钮）
- 列表撤销提示"已删除《…》"中的 HTML 标题同样按纯文本显示

**playwright_hint：**
```ts
await page.goto(`/admin/posts/${oldPost.id}`);
await page.getByRole('button', { name: '删除文章' }).click();
await expect(page.getByRole('alertdialog')).toContainText('删除后无法恢复。已发布的文章读者将无法再访问。');
page.on('dialog', () => { throw new Error('XSS executed'); });
```

**清理：** `resetPosts()`

---

### TC-US09-11: 取消 / Esc 关闭确认框

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-11 |
| covers | SC-DELETE-03 |
| Scenario | BH-03 取消删除文章保持不变 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】"Old Post"；【环境前置】已登录，在 "Old Post" 写文章页；记录删除请求计数

**步骤：**
1. 点"删除文章"打开确认框，点击"取消"
2. 再次打开，按 Esc
3. 再次打开，点击遮罩层（行为以 design-ui 为准）

**预期结果：**
- 确认框关闭，文章仍在
- 删除请求计数为 0
- 关闭后焦点回到"删除文章"按钮

**playwright_hint：**
```ts
await page.getByRole('button', { name: '取消' }).click();
await expect(page.getByRole('alertdialog')).toBeHidden();
await expect(page.getByRole('link', { name: 'Old Post' })).toBeVisible();
// Esc
await page.keyboard.press('Escape');
expect(deleteCalls).toBe(0);
```

**清理：** `resetPosts()`

---

### TC-US09-12: 确认删除进行中防重复提交

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-12 |
| covers | SC-DELETE-01 |
| Scenario | 确认后请求进行中按钮加载禁用 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（路由延迟） |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】"Old Post"；【环境前置】已登录，在 "Old Post" 写文章页；删除接口延迟 2s

**步骤：** 点击"确认删除"后快速再点 2 次、按 Enter

**预期结果：**
- "确认删除"显示加载并禁用，"取消"禁用或忽略 Esc（以 design-ui 为准）
- 只发出 1 次删除请求；最终跳转到 `/admin`，无"删除失败"误报

**playwright_hint：**
```ts
const confirm = page.getByRole('button', { name: '确认删除' });
await confirm.click();
await expect(confirm).toBeDisabled();
expect(deleteCalls).toBe(1);
```

**清理：** `unroute`；`resetPosts()`

---

### TC-US09-13: 删除后分页与空状态联动

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-13 |
| covers | SC-DELETE-01 |
| Scenario | 边界值：删除导致总页数/空状态变化 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】场景 A：21 篇；场景 B：1 篇；【环境前置】已登录

**步骤：**
- A：进入第 2 页（仅 1 篇），全滑删除该篇并等待 6 秒
- B：全滑删除唯一一篇并等待 6 秒

**预期结果：**
- A：列表回到第 1 页显示 20 篇，分页控件消失（不停留在空的第 2 页）
- B：显示空状态"还没有文章"与"写第一篇"按钮

**playwright_hint：**
```ts
await page.goto('/admin?page=2');
// 删除后
await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(20);
await expect(page.getByRole('navigation', { name: /分页/ })).toHaveCount(0);
```

**清理：** `resetPosts()`

---

### TC-US09-14: 列表删除后撤销

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-14 |
| covers | SC-DELETE-07 |
| Scenario | BH-07 列表删除后撤销 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（`page.clock` 控制计时） |
| type | ui-interaction |
| Change History | 2026-10-12 v1.1 新增 |

**前置条件：** 【数据前置】3 篇文章 A、B、C（B 在中间）；【环境前置】已登录，位于 `/admin`；记录删除请求计数

**步骤：**
1. 全滑删除 B，3 秒后点"撤销"
2. 再删除 B，把鼠标停在提示上 10 秒，移开后再等 6 秒
3. 重新造数据，删除 B，Tab 到"撤销"按 Enter

**预期结果：**
- 步骤 1：B 回到 A、C 之间并单行弹入，数量恢复；删除请求计数 0
- 步骤 2：悬停期间提示不消失、不发请求；移开 6 秒后提示消失并发出 1 次删除
- 步骤 3：键盘撤销效果同步骤 1
- 提示 `role="status"`，读屏能读到"已删除《B》"

**playwright_hint：**
```ts
await page.clock.install();
await swipeFull(page.getByRole('group', { name: '《B》' }));
await page.clock.runFor(3000);
await page.getByRole('button', { name: '撤销' }).click();
expect(deleteCalls).toBe(0);
```

**清理：** `resetPosts()`

---

### TC-US09-15: 撤销期内离开页面 / 连续删除

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-15 |
| covers | SC-DELETE-08 |
| Scenario | BH-08 撤销期内离开页面立即提交删除 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（关标签页场景在 Chromium 下验证 keepalive） |
| type | e2e |
| Change History | 2026-10-12 v1.1 新增 |

**前置条件：** 【数据前置】文章 A、B、C；【环境前置】已登录，位于 `/admin`

**步骤：**
1. 删除 A，1 秒内点击 C 进入写文章页
2. 回列表，删除 B 后立即关闭标签页；新开页面查询
3. 重新造数据，删除 A，2 秒后删除 B

**预期结果：**
- 步骤 1：跳转前发出 A 的删除请求（keepalive），A 被删除
- 步骤 2：B 被删除（请求随页面卸载发出）
- 步骤 3：删除 B 时 A 的请求立即发出；提示换成"已删除《B》"；B 在其后 6 秒提交
- 每篇只发出 1 次删除请求

**清理：** `resetPosts()`

---

### TC-US09-16: 滑动交互

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-16 |
| covers | SC-DELETE-09 |
| Scenario | BH-09 拖动卡片不误进写文章页；抽屉开合规则 |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化（`page.mouse` / `touchscreen` 模拟拖动） |
| type | ui-interaction |
| Change History | 2026-10-12 v1.1 新增 |

**前置条件：** 【数据前置】文章 A、B；【环境前置】已登录；桌面 1440 与手机 390 两种视口

**测试数据 / 预期结果：**

| 操作 | 预期 |
|------|------|
| 在 A 的标题上按住向左拖 100px 后松手 | 抽屉停在打开位置（露出"编辑""删除"），URL 仍为 `/admin` |
| 向左拖 40px 后慢慢松手 | 弹回关闭 |
| 竖直方向滑动 A | 页面滚动，抽屉不动 |
| A 抽屉打开时点 A 卡片 | 抽屉收起，不跳转 |
| A 打开时向左拖 B | A 收起，B 打开 |
| 抽屉内点"编辑" | 进入 `/admin/posts/{A.id}` |
| 桌面鼠标悬停 A | 出现 `⋯`；点 `⋯` 抽屉打开，`aria-expanded="true"` |
| Tab 到 A 的 `⋯` 按 Enter | 抽屉打开，焦点到"编辑"；Tab 到"删除"；Esc 收起，焦点回到 `⋯` |
| 抽屉打开时焦点在 `⋯` 上按 Delete | 同全滑删除（行移除 + 撤销提示） |
| 抽屉关闭时 Tab | 跳过"编辑""删除"（`inert`） |
| 切换筛选 / 翻页 | 已打开的抽屉收起 |
| `prefers-reduced-motion: reduce` | 松手 0.2s 归位，无回弹、无删除块跃出动画 |

**清理：** `resetPosts()`

---

## 测试数据策略

| 策略 | 用途 | 说明 |
|------|------|------|
| Factory `createPost({ status, publishedContent, draftContent, title, slug, updatedAt })` / `createPosts(N, …)` | 全部 TC | 直接写测试 D1；与 US-07/US-08 共用同一 Factory |
| Factory `resetPosts()` | 清理 | 清空 post 表；预发布环境清除读者缓存 |
| Fixture `adminSession`（只读共享） | 认证 | 测试管理员凭据，storageState 复用；禁止生产账号 |
| Fixture `readerClient` | 读者端断言 | 无 Cookie HTTP 客户端 |
| 测试 R2 桶 | TC-US09-09 | 独立测试桶，TC 结束删除对象 |
| 路由拦截 / 请求计数 | TC-US09-01, 05, 11, 12, 14, 15 | `page.route` 统计 `DELETE` 次数与时间 |
| `page.clock` | TC-US09-01, 13, 14, 15 | 快进 6 秒撤销期，避免真实等待 |
| Helper `swipeFull(row)` / `swipeOpen(row)` | TC-US09-01, 05, 13–16 | 用 `page.mouse` 或 `touchscreen` 从卡片右侧向左拖过 60% / 100px |

---

## 覆盖矩阵

| SC-ID | Behavior | 验收标准（story.md） | TC |
|-------|----------|------|------|
| SC-DELETE-01 | BH-01 | AC-4 | TC-US09-01, 06, 07, 08, 09, 10, 13 |
| SC-DELETE-02 | BH-02 | AC-1, AC-2 | TC-US09-02, 10, 12 |
| SC-DELETE-03 | BH-03 | AC-3 | TC-US09-11 |
| SC-DELETE-04 | BH-04 | AC-2, AC-4 | TC-US09-03, 06 |
| SC-DELETE-05 | BH-05 | — | TC-US09-04 |
| SC-DELETE-06 | BH-06 | — | TC-US09-05 |
| SC-DELETE-07 | BH-07 | AC-5 | TC-US09-14 |
| SC-DELETE-08 | BH-08 | AC-4 | TC-US09-15 |
| SC-DELETE-09 | BH-09 | AC-4 | TC-US09-16 |

**NFR 覆盖**：授权 401（TC-US09-07）、CSRF（TC-US09-08）、读者页重建（TC-US09-03）、XSS 边界（TC-US09-10）

**Gap 分析**：behaviors.md SC-ID 共 9 个（SC-DELETE-01 ~ 09），全部被 `covers` 引用。**Gap: 无**

---

## 执行记录

| 日期 | 执行人 | 结果 | 备注 |
|------|--------|------|------|
| — | — | ⏳ | 待 implement 阶段转为可执行测试 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-12 | v1.1 | 列表删除改为左滑 / 全滑 + 6 秒撤销：改写 TC-01、05、13；确认框类 TC-10~12 限定写文章页；新增 TC-14（撤销）、15（离开页面 / 连续删除）、16（滑动交互）（[Backlog](../../../../../backlog/swipe-row-actions.md)） | miraclehifi |
| 2026-10-13 | v1.2 | TC-03：缓存失效改为触发重建，5 分钟内可见（[Backlog](../../../../../backlog/reader-build-time-prerender.md)） | miraclehifi |
| 2026-10-14 | v1.3 | TC-10 确认框文案按设计稿（"删除《标题》？"）；TC-12 成功后以跳转列表为准（不显示"已删除"） | miraclehifi |
