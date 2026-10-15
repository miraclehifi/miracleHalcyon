# 上一篇 / 下一篇 验收测试

**US ID**: US-09
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-09-prev-next/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-09-prev-next/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。数据见 [_fixtures.md](../_fixtures.md)。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US09-01 | SC-PREVNEXT-01, SC-PREVNEXT-05 | 文末相邻文章（跳过草稿与已撤回） | P0 | e2e |
| TC-US09-02 | SC-PREVNEXT-02, SC-PREVNEXT-03 | 首尾只显示一侧 | P1 | e2e |
| TC-US09-03 | SC-PREVNEXT-04 | 相邻计算纯函数 | P1 | unit |

---

## 功能 / 接口测试

### TC-US09-01: 文末相邻文章（跳过草稿与已撤回）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-01 |
| covers | SC-PREVNEXT-01, SC-PREVNEXT-05 |
| Scenario | 文末相邻文章（跳过草稿与已撤回） |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts/hello`，读取文末导航

**预期结果：**
- `nav`"上一篇 / 下一篇"中：上一篇 Prev Post（2026-10-05）链接 `/posts/prev-post`；下一篇 Latest Post（2026-10-14）
- 不出现 Withdrawn、Draft

**清理：** 无（只读夹具）

---

### TC-US09-02: 首尾只显示一侧

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-02 |
| covers | SC-PREVNEXT-02, SC-PREVNEXT-03 |
| Scenario | 首尾只显示一侧 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts/first-post` 与 `/posts/latest-post`

**预期结果：**
- first-post 只有"下一篇"（Filler 36）
- latest-post 只有"上一篇"（Hello Halcyon）

**清理：** 无（只读夹具）

---

### TC-US09-03: 相邻计算纯函数

| 字段 | 值 |
|------|------|
| TC-ID | TC-US09-03 |
| covers | SC-PREVNEXT-04 |
| Scenario | 相邻计算纯函数 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 输入 | 只有 1 篇；3 篇同一天发布（按 `lastPublishedAt` 排序打破平局）；列表已按发布时间倒序 |

**步骤：**
1. 调用 `adjacentPosts(slug, sorted)`

**预期结果：**
- 1 篇 → `{ prev: null, next: null }`，页面不渲染区块
- 同一天按与 `/posts` 列表相同的排序规则确定相邻关系

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-PREVNEXT-01 | TC-US09-01 |
| SC-PREVNEXT-02 | TC-US09-02 |
| SC-PREVNEXT-03 | TC-US09-02 |
| SC-PREVNEXT-04 | TC-US09-03 |
| SC-PREVNEXT-05 | TC-US09-01 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
