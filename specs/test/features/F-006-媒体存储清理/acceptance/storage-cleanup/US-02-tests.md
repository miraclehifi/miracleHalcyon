# 一键清理未引用媒体 验收测试

**US ID**: US-02
**Story**: [story.md](../../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-02-cleanup-orphans/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-006-媒体存储清理/stories/storage-cleanup/US-02-cleanup-orphans/behaviors.md)
**最后更新**: 2026-10-16
**Version Tag**: v1.0

> 验收规格（非可执行代码）。占位接口，**以 design-domain API 契约为准**：
> - 清理：`POST /api/admin/storage/cleanup`（无请求体）
> - 检测：`GET /api/admin/storage/orphans`
>
> 测试数据 Factory 与清理策略同 [US-01-tests](US-01-tests.md)"测试数据"。断言 R2 时直接 `MEDIA.head(key)`，断言 D1 时直接查 `images`。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US02-01 | SC-CLEANUP-01 | 清理未引用图片（含其视频）：R2 与 D1 同步删除，返回数量与体积 | P0 | api |
| TC-US02-02 | SC-CLEANUP-02 | 只清理视频：删 `.live.mp4`、视频列置空、图片保留 | P0 | api |
| TC-US02-03 | SC-CLEANUP-07 | 清理不碰被引用 / 带 live / 保护期内记录 | P0 | api |
| TC-US02-04 | SC-CLEANUP-06, SC-CLEANUP-08 | 页面打开后被重新引用的图片不被删除，提示按实际结果 | P0 | e2e |
| TC-US02-05 | SC-CLEANUP-09 | 中途失败后再次清理可完成（幂等） | P1 | api |
| TC-US02-06 | SC-CLEANUP-10 | 未登录 401 / 非法 Origin 403，不删除任何数据 | P0 | security |
| TC-US02-07 | SC-CLEANUP-12 | 1,200 张分批清理 | P1 | api |
| TC-US02-08 | SC-CLEANUP-11 | 视频已清理的图片加 live：预览与读者页只显示静态图 | P1 | e2e |
| TC-US02-09 | SC-CLEANUP-01 | 无候选时调用清理：返回 0，不出错 | P2 | api |
| TC-US02-10 | SC-CLEANUP-01 | 完整流程：确认清理 → Toast → 统计归零 | P0 | ui-interaction |
| TC-US02-11 | SC-CLEANUP-03 | 确认框文案；取消 / Esc 不发请求 | P0 | ui-interaction |
| TC-US02-12 | SC-CLEANUP-04 | 清理中防重复提交 | P1 | ui-interaction |
| TC-US02-13 | SC-CLEANUP-05 | 无候选时清理按钮禁用 | P1 | ui-interaction |
| TC-US02-14 | SC-CLEANUP-09 | 清理失败提示、关闭确认框并自动重新检测 | P1 | ui-interaction |

**覆盖目标**：需求覆盖 100%（AC1–AC6）、行为覆盖 100%（SC-CLEANUP-01 – 12）。

---

## 功能 / 接口测试

### TC-US02-01: 清理未引用图片（含其视频）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-01 |
| covers | SC-CLEANUP-01 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-16 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`img(O1, {size: 1000, videoSize: 5000, ageHours: 48})`、`img(O2, {size: 2000, ageHours: 48})` 不被引用
- 【数据前置】`img(V, {size: 300, videoSize: 7000, ageHours: 48})` 被 body 以 `…jpg` 引用
- 【环境前置】已登录会话，`Origin` 为站点地址

**步骤：** `POST /api/admin/storage/cleanup`；再 `GET /api/admin/storage/orphans`

**预期结果：**
- 200；`removedImages = 2`，`removedVideos = 1`，`freedBytes = 15000`（1000 + 5000 + 2000 + 7000）
- R2：`O1.jpg`、`O1.jpg.live.mp4`、`O2.jpg`、`V.jpg.live.mp4` 不存在；`V.jpg` 存在
- D1：`images` 中无 O1、O2；V 行存在
- 再次检测：全部计数为 0

### TC-US02-02: 只清理视频

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-02 |
| covers | SC-CLEANUP-02 |
| Priority | P0 |
| type | api |

**前置条件：** `img(V, {size: 300, videoSize: 7000, ageHours: 48})`，被两篇文章分别以 `…jpg`、`…jpg#wide` 引用
**预期结果：**
- `removedImages = 0`，`removedVideos = 1`，`freedBytes = 7000`
- R2：`V.jpg.live.mp4` 不存在，`V.jpg` 存在且内容不变
- D1：V 行 `video_key IS NULL`、`video_size IS NULL`；`key`、`mime`、`size`、`width`、`height`、`rgb`、`original_name`、`created_at` 不变；`db_update_time` 更新
- `GET /img/…V.jpg` 仍 200

### TC-US02-03: 清理不碰被引用 / 带 live / 保护期内记录

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-03 |
| covers | SC-CLEANUP-07 |
| Priority | P0 |
| type | api |

**前置条件：** 复用 TC-US01-02 的 A、B、C1、C2，TC-US01-05 的 #3、#4，TC-US01-06 的 N1、N2，外加未引用的 O（48 小时）
**预期结果：** 只有 O 的 R2 对象与 D1 记录被删除；其余图片对象、视频对象、D1 行（含 `video_key`）全部不变；`removedImages = 1`，`removedVideos = 0`

### TC-US02-04: 页面打开后被重新引用的图片不被删除

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-04 |
| covers | SC-CLEANUP-06, SC-CLEANUP-08 |
| Priority | P0 |
| type | e2e |

**前置条件：** 3 张未引用图片 R、S、T（48 小时，各 1,048,576 B）
**步骤：**
1. 打开 `/admin/storage`，看到"未引用图片 3 张"
2. 测试通过管理接口把 R 的 URL 写入某篇文章正文并保存（模拟另一标签页）
3. 不重新检测，直接点"一键清理未引用资源" → 确认

**预期结果：**
- R 的 R2 对象与 D1 记录保留；S、T 被删除
- Toast 为"已清理 2 项，释放 2.0 MB"（按接口返回，不按页面旧统计）
- 统计刷新为 0

### TC-US02-05: 中途失败后再次清理可完成

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-05 |
| covers | SC-CLEANUP-09 |
| Priority | P1 |
| type | api |

**前置条件：** 5 张未引用图片（2 张带视频）；用依赖注入让 media 存储层在第 1 批 R2 删除成功后的 D1 写入抛错（或 R2 删除抛错，两种各一轮）
**步骤：** 调用清理 → 恢复依赖 → 再调用清理
**预期结果：**
- 第一次：500，`error.code = CLEANUP_FAILED`（以契约为准）；不出现"D1 记录已删但 R2 对象仍在且无人管理"之外的不一致——允许 R2 已删、D1 仍在（下次检测仍可见并重试）
- 第二次：200，剩余资源全部清理；再次检测为 0；R2 对已不存在的 key 删除不报错（幂等）

### TC-US02-06: 未登录 401 / 非法 Origin 403

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-06 |
| covers | SC-CLEANUP-10 |
| Priority | P0 |
| type | security |

**步骤：**
1. 无会话 `POST /api/admin/storage/cleanup`
2. 有会话但 `Origin: https://evil.example`
3. 有会话、无 `Origin` 也无 `Referer`
4. `GET /api/admin/storage/cleanup`（方法不对）

**预期结果：** 1 → 401 `UNAUTHENTICATED`；2、3 → 403 `FORBIDDEN_ORIGIN`；4 → 405；所有情况下未引用图片的 R2 对象与 D1 记录都还在

### TC-US02-07: 1,200 张分批清理

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-07 |
| covers | SC-CLEANUP-12 |
| Priority | P1 |
| type | api |

**测试数据（边界值）：** 未引用图片 1,200 张（其中 300 张带视频，即 R2 对象 1,500 个）；另造 1,000 张、1,001 张两组单独跑
**预期结果：** 全部删除；`removedImages` 等于造数；R2 单次 `delete` 调用 key 数 ≤ 1,000（对 R2 绑定计数断言）；D1 单条语句绑定参数不超过上限（design-domain 定具体值）

### TC-US02-08: 视频已清理的图片加 live

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-08 |
| covers | SC-CLEANUP-11 |
| Priority | P1 |
| type | e2e |

**前置条件：** 图片 V 已执行"只清理视频"（R2 无 `.live.mp4`，`video_key IS NULL`）
**步骤：** 在写文章页正文把 V 的引用改为 `…jpg#live`，等待预览；发布后打开读者文章页（test:build 夹具或 preview）
**预期结果：** 预览与读者页悬停（`hover()`）触发播放后，视频 404，`[data-live-badge]` 隐藏，静态图仍显示；控制台无未捕获错误（视频 404 只出现在网络面板）

### TC-US02-09: 无候选时调用清理

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-09 |
| covers | SC-CLEANUP-01 |
| Priority | P2 |
| type | api |

**预期结果：** 200，`removedImages = 0`、`removedVideos = 0`、`freedBytes = 0`；不调用 R2 `delete`

---

## UI 交互测试

### TC-US02-10: 完整流程

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-10 |
| covers | SC-CLEANUP-01 |
| Priority | P0 |
| type | ui-interaction |

**前置条件：** 同 TC-US02-01
**步骤：** 打开存储页 → 点"一键清理未引用资源" → 确认框点"清理"
**预期结果：** Toast"已清理 3 项，释放 15 KB"（15,000 B < 1 MB，按格式规则显示为向上取整的 KB）；确认框关闭；三项统计为 0；按钮禁用并显示"存储状态良好，无未引用文件"

**playwright_hint：**
```ts
await page.getByRole("button", { name: "一键清理未引用资源" }).click();
const dialog = page.getByRole("alertdialog");
await dialog.getByRole("button", { name: "清理" }).click();
await expect(page.getByRole("status")).toHaveText("已清理 3 项，释放 15 KB");
await expect(page.getByRole("button", { name: "一键清理未引用资源" })).toBeDisabled();
```

### TC-US02-11: 确认框文案；取消 / Esc

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-11 |
| covers | SC-CLEANUP-03 |
| Priority | P0 |
| type | ui-interaction |

**前置条件：** 2 张未引用图片（共 3,000,000 B，其一带 1,000,000 B 视频）+ 1 段未引用视频（2,000,000 B）
**预期结果：**
- 确认框（`role="alertdialog"`）文案："将清理 2 张图片、1 个实况视频，释放 5.7 MB。清理后无法恢复。"；"清理"为危险按钮
- 点"取消"、按 Esc 各一轮：确认框关闭，焦点回到"一键清理"按钮，没有 `POST /api/admin/storage/cleanup` 请求，统计不变

**playwright_hint：**
```ts
const posts: string[] = []; page.on("request", (r) => r.method() === "POST" && posts.push(r.url()));
await page.keyboard.press("Escape");
expect(posts.filter((u) => u.includes("/storage/cleanup"))).toHaveLength(0);
```

### TC-US02-12: 清理中防重复提交

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-12 |
| covers | SC-CLEANUP-04 |
| Priority | P1 |
| type | ui-interaction |

**步骤：** 拦截清理接口挂起；确认框点"清理"后连点 3 次；Esc 尝试关闭
**预期结果：** 只发出 1 个清理请求；确认按钮 `aria-busy="true"` 并禁用；进行中不能关闭确认框

### TC-US02-13: 无候选时清理按钮禁用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-13 |
| covers | SC-CLEANUP-05 |
| Priority | P1 |
| type | ui-interaction |

**前置条件：** 只有保护期内的未引用图片
**预期结果：** "一键清理未引用资源"禁用；"存储状态良好，无未引用文件"可见；点击无反应、不弹确认框

### TC-US02-14: 清理失败提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-14 |
| covers | SC-CLEANUP-09 |
| Priority | P1 |
| type | ui-interaction |

**步骤：** 清理接口 `route.fulfill({ status: 500 })` 一次
**预期结果：** 确认框关闭；`Toast/Error`"清理未完成，请重试"；随后自动发起一次检测请求，统计按检测结果显示；"一键清理"可再次点击

**playwright_hint：**
```ts
await page.route("**/api/admin/storage/cleanup", (r) => r.fulfill({ status: 500, body: "{}" }), { times: 1 });
const detect = page.waitForRequest("**/api/admin/storage/orphans");
await dialog.getByRole("button", { name: "清理" }).click();
await expect(page.getByRole("alert")).toHaveText("清理未完成，请重试");
await detect;
```

---

## 追溯矩阵

| AC | Behavior | TC |
|----|----------|----|
| AC1 | SC-CLEANUP-05 | TC-US02-13 |
| AC2 | SC-CLEANUP-03 | TC-US02-11 |
| AC3 | SC-CLEANUP-01、02、04、12 | TC-US02-01、02、07、09、10、12 |
| AC4 | SC-CLEANUP-06、07、08 | TC-US02-03、04 |
| AC5 | SC-CLEANUP-09 | TC-US02-05、14 |
| AC6 | SC-CLEANUP-11 | TC-US02-08 |
| — | SC-CLEANUP-10 | TC-US02-06 |
