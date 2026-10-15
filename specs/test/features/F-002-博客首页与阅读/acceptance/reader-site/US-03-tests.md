# 构建时预渲染与发布后重建 验收测试

**US ID**: US-03
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/reader-site/US-03-static-rebuild/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/reader-site/US-03-static-rebuild/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。Deploy Hook 的地址与请求方式以 design-arch 为准；workers 集成测试中以注入的 `fetch` 替身记录请求，不访问外网。
> 发布 / 撤回 / 删除接口沿用 F-001 [post api-contract](../../../../../engineering/backend/domains/post/api-contract.md)。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US03-01 | SC-REBUILD-01 | 读者路由全部预渲染 | P0 | build |
| TC-US03-02 | SC-REBUILD-02 | 发布成功后调用 Deploy Hook 一次 | P0 | integration |
| TC-US03-03 | SC-REBUILD-03 | 发布更新、撤回、删除已发布文章各触发一次 | P0 | integration |
| TC-US03-04 | SC-REBUILD-04 | 删除从未发布的草稿不触发 | P1 | integration |
| TC-US03-05 | SC-REBUILD-05 | Deploy Hook 失败不影响发布 | P0 | integration |
| TC-US03-06 | SC-REBUILD-06 | 未配置 Deploy Hook 时静默跳过 | P1 | integration |
| TC-US03-07 | SC-REBUILD-07 | 空数据构建成功 | P1 | build |
| TC-US03-08 | SC-REBUILD-08 | 数据源不可用时构建失败 | P0 | build |
| TC-US03-09 | SC-REBUILD-09 | 草稿与已撤回内容不进入产物 | P0 | build |
| TC-US03-10 | SC-REBUILD-02 | 线上发布到可见时长 | P1 | performance |

---

## 功能 / 接口测试

### TC-US03-01: 读者路由全部预渲染

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-01 |
| covers | SC-REBUILD-01 |
| Scenario | 读者路由全部预渲染 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | build |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`reader-fixture`

**步骤：**
1. 执行构建；检查 `dist/` 与 Worker 路由清单

**预期结果：**
- 存在静态 HTML：`/`、`/posts`、`/posts/page/2`、`/posts/page/3`、41 个 `/posts/:slug`、每个已发布标签的 `/tags/:tag`（含 `/tags/astro/page/2`）、404 页
- 以上路由都不在 Worker 按需渲染的路由中；`/admin/**`、`/api/**`、`/img/**` 仍由 Worker 处理

**清理：** 无（只读夹具）

---

### TC-US03-02: 发布成功后调用 Deploy Hook 一次

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-02 |
| covers | SC-REBUILD-02 |
| Scenario | 发布成功后调用 Deploy Hook 一次 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】workers 集成环境，`DEPLOY_HOOK_URL` 为测试地址，`fetch` 替身返回 200
- 【数据前置】Factory 草稿一篇

**步骤：**
1. `POST /api/admin/posts/:id/publish`

**预期结果：**
- 接口 200
- 替身收到 1 次 `POST` 到 `DEPLOY_HOOK_URL`
- 通过 `ctx.waitUntil` 发出，不阻塞响应

**清理：** `resetPosts()`

---

### TC-US03-03: 发布更新、撤回、删除已发布文章各触发一次

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-03 |
| covers | SC-REBUILD-03 |
| Scenario | 发布更新、撤回、删除已发布文章各触发一次 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 同 TC-US03-02；Factory 已发布文章（有未发布修改）

**步骤：**
1. 依次：发布更新 → 撤回 → 重新发布 → 删除

**预期结果：**
- 每个成功操作后替身各收到 1 次请求，共 4 次
- 操作失败（如对草稿发布更新返回 409）时不发请求

**清理：** `resetPosts()`

---

### TC-US03-04: 删除从未发布的草稿不触发

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-04 |
| covers | SC-REBUILD-04 |
| Scenario | 删除从未发布的草稿不触发 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 同 TC-US03-02；Factory 草稿

**步骤：**
1. `DELETE /api/admin/posts/:id`

**预期结果：**
- 接口 204
- 替身收到 0 次请求

**清理：** `resetPosts()`

---

### TC-US03-05: Deploy Hook 失败不影响发布

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-05 |
| covers | SC-REBUILD-05 |
| Scenario | Deploy Hook 失败不影响发布 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 同 TC-US03-02；替身分别返回 500、抛出网络错误

**步骤：**
1. 各发布一篇草稿

**预期结果：**
- 发布接口均 200，文章状态为已发布
- 记录错误日志，内容含状态码或错误类型，不含 `DEPLOY_HOOK_URL` 的值

**清理：** `resetPosts()`

---

### TC-US03-06: 未配置 Deploy Hook 时静默跳过

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-06 |
| covers | SC-REBUILD-06 |
| Scenario | 未配置 Deploy Hook 时静默跳过 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】不设 `DEPLOY_HOOK_URL`

**步骤：**
1. 发布一篇草稿

**预期结果：**
- 接口 200；替身 0 次请求；无错误日志

**清理：** `resetPosts()`

---

### TC-US03-07: 空数据构建成功

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-07 |
| covers | SC-REBUILD-07 |
| Scenario | 空数据构建成功 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | build |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`reader-fixture-empty`

**步骤：**
1. 执行构建（输出到临时目录）

**预期结果：**
- 构建成功
- `/posts` 显示"还没有文章"，无分页
- 没有 `/posts/:slug`、`/tags/*` 页面

**清理：** 无（只读夹具）

---

### TC-US03-08: 数据源不可用时构建失败

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-08 |
| covers | SC-REBUILD-08 |
| Scenario | 数据源不可用时构建失败 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | build |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】数据源指向返回 500 的地址 / 不可达地址 / 返回非 JSON

**步骤：**
1. 执行构建

**预期结果：**
- 构建以非 0 退出码失败
- 错误信息含接口地址与状态（或错误类型）
- 不产出读者页（不会用空站点覆盖线上）

**清理：** 无（只读夹具）

---

### TC-US03-09: 草稿与已撤回内容不进入产物

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-09 |
| covers | SC-REBUILD-09 |
| Scenario | 草稿与已撤回内容不进入产物 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | build |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`reader-fixture`

**步骤：**
1. 在 `dist/` 全部文件中搜索 "Draft"、"draft-post"、"Withdrawn"、"withdrawn-post"、"Secret"

**预期结果：**
- 均无匹配

**清理：** 无（只读夹具）

---

### TC-US03-10: 线上发布到可见时长

| 字段 | 值 |
|------|------|
| TC-ID | TC-US03-10 |
| covers | SC-REBUILD-02 |
| Scenario | 线上发布到可见时长 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ❌ 不适合自动化（线上手动实测） |
| type | performance |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】生产环境已配置 Workers Builds 与 Deploy Hook

**步骤：**
1. 连续 5 次：发布一篇测试文章，记录 T0；每 10 秒请求 `/posts` 直到出现

**预期结果：**
- P95 ≤ 5 分钟；记录每次时长到 verify 报告

**清理：** 删除测试文章（再次触发重建）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-REBUILD-01 | TC-US03-01 |
| SC-REBUILD-02 | TC-US03-02, TC-US03-10 |
| SC-REBUILD-03 | TC-US03-03 |
| SC-REBUILD-04 | TC-US03-04 |
| SC-REBUILD-05 | TC-US03-05 |
| SC-REBUILD-06 | TC-US03-06 |
| SC-REBUILD-07 | TC-US03-07 |
| SC-REBUILD-08 | TC-US03-08 |
| SC-REBUILD-09 | TC-US03-09 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
