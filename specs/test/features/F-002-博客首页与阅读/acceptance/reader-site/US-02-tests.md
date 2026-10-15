# 首页自我介绍 验收测试

**US ID**: US-02
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/reader-site/US-02-home-intro/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/reader-site/US-02-home-intro/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。站点配置见 [_fixtures.md](../_fixtures.md)"站点配置夹具"。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US02-01 | SC-HOME-01 | 首页内容来自配置且不列文章 | P0 | e2e |
| TC-US02-02 | SC-HOME-02 | 社交链接新标签页、邮箱为 mailto | P1 | ui-interaction |
| TC-US02-03 | SC-HOME-03 | 空配置项不渲染 | P1 | unit |
| TC-US02-04 | SC-HOME-04 | 非法配置让构建失败 | P1 | unit |

---

## 功能 / 接口测试

### TC-US02-01: 首页内容来自配置且不列文章

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-01 |
| covers | SC-HOME-01 |
| Scenario | 首页内容来自配置且不列文章 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】默认 `site.ts` 占位配置

**步骤：**
1. 访问 `/`

**预期结果：**
- 显示头像（`img` 的 `alt` 为"Halcyon 的头像"，带 width / height）、名字"Halcyon"、3 段简介
- 页面中没有文章卡片，也没有 `/posts/` 开头的文章详情链接（顶栏"文章"除外）

**清理：** 无（只读夹具）

---

### TC-US02-03: 空配置项不渲染

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-03 |
| covers | SC-HOME-03 |
| Scenario | 空配置项不渲染 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】配置对象摄影站为 `""`、某社交链接为 `undefined`

**步骤：**
1. 调用配置归一化函数 `normalizeSiteConfig`，并渲染首页 / 顶栏

**预期结果：**
- 归一化结果中不含空链接
- 首页与顶栏都不出现 `href=""` 或 `href` 缺失的 `a`

**清理：** 无（只读夹具）

---

### TC-US02-04: 非法配置让构建失败

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-04 |
| covers | SC-HOME-04 |
| Scenario | 非法配置让构建失败 |
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
| 非法输入 | `github: 'javascript:alert(1)'`；`email: 'me@'`；`photo: 'ftp://x'` |

**步骤：**
1. 对每个非法输入调用 `normalizeSiteConfig`

**预期结果：**
- 抛出错误，消息含配置项名（如 `site.github`）
- 合法 http(s) 地址与邮箱通过

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US02-02: 社交链接新标签页、邮箱为 mailto

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-02 |
| covers | SC-HOME-02 |
| Scenario | 社交链接新标签页、邮箱为 mailto |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 读取首页 GitHub 链接与邮箱链接的属性

**预期结果：**
- GitHub：`href="https://github.com/example"`、`target="_blank"`、`rel` 含 `noopener noreferrer`
- 邮箱：`href="mailto:me@example.com"`，无 `target`

**playwright_hint：**
```ts
await expect(page.getByRole('link', { name: 'me@example.com' })).toHaveAttribute('href', 'mailto:me@example.com');
```

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-HOME-01 | TC-US02-01 |
| SC-HOME-02 | TC-US02-02 |
| SC-HOME-03 | TC-US02-03 |
| SC-HOME-04 | TC-US02-04 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
