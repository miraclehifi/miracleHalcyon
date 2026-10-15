# 三栏：同标签文章、阅读进度与目录 验收测试

**US ID**: US-08
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-08-reading-sidebars/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-08-reading-sidebars/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。断点 1280 与侧栏宽度以 design-ui 为准。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US08-01 | SC-SIDEBAR-01 | 宽屏三栏结构 | P0 | e2e |
| TC-US08-02 | SC-SIDEBAR-02 | 同标签文章排序与上限 | P0 | unit |
| TC-US08-03 | SC-SIDEBAR-03 | 无同标签文章时不显示 | P1 | e2e |
| TC-US08-04 | SC-SIDEBAR-04 | 阅读进度 | P1 | ui-interaction |
| TC-US08-05 | SC-SIDEBAR-05 | 目录高亮与点击跳转 | P0 | ui-interaction |
| TC-US08-06 | SC-SIDEBAR-06 | 减弱动效直接跳转 | P2 | ui-interaction |
| TC-US08-07 | SC-SIDEBAR-07, SC-SIDEBAR-09 | 窄屏进度条、目录抽屉与同标签移到文末 | P0 | ui-interaction |
| TC-US08-08 | SC-SIDEBAR-08 | 无标题时不显示目录 | P1 | e2e |
| TC-US08-09 | SC-SIDEBAR-05 | 目录数据纯函数 | P1 | unit |

---

## 功能 / 接口测试

### TC-US08-01: 宽屏三栏结构

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-01 |
| covers | SC-SIDEBAR-01 |
| Scenario | 宽屏三栏结构 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440×900

**步骤：**
1. 访问 `/posts/hello`

**预期结果：**
- 左栏 `nav`"同标签文章"、中间正文、右栏含进度"0%"与 `nav`"目录"
- 目录 5 项，顺序：安装、依赖、配置、环境变量、结语；h3 项缩进
- 三栏在视口内并列，无横向滚动

**清理：** 无（只读夹具）

---

### TC-US08-02: 同标签文章排序与上限

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-02 |
| covers | SC-SIDEBAR-02 |
| Scenario | 同标签文章排序与上限 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 对夹具数据调用 `relatedPosts(hello, all)`

**预期结果：**
- 共 8 篇，第 1 位 filler-01（共享 2 个标签），其后按发布时间降序：prev-post、case-lower、filler-02 …
- 不含 hello 本身、草稿、已撤回
- 大小写不同的标签视为同一标签

**清理：** 无（只读夹具）

---

### TC-US08-03: 无同标签文章时不显示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-03 |
| covers | SC-SIDEBAR-03 |
| Scenario | 无同标签文章时不显示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 1440 与 390 视口分别访问 `/posts/first-post`（无标签）与 `/posts/latest-post`（标签无其他文章）

**预期结果：**
- 没有"同标签文章"栏或文末区块

**清理：** 无（只读夹具）

---

### TC-US08-08: 无标题时不显示目录

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-08 |
| covers | SC-SIDEBAR-08 |
| Scenario | 无标题时不显示目录 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 1440 与 390 访问 `/posts/first-post`

**预期结果：**
- 没有目录 `nav` 与"目录"按钮；进度仍显示

**清理：** 无（只读夹具）

---

### TC-US08-09: 目录数据纯函数

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-09 |
| covers | SC-SIDEBAR-05 |
| Scenario | 目录数据纯函数 |
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
| 输入 | `hello` 正文；只有 h4 的正文；标题含代码与链接的正文；两个同名 h2 |

**步骤：**
1. 调用 `extractToc(html)`

**预期结果：**
- 只取 h2 / h3，层级正确
- 标题文本去掉标记，保留可见文字
- 同名标题锚点不重复（`-1` 后缀，与渲染出的 `id` 一致）

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US08-04: 阅读进度

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-04 |
| covers | SC-SIDEBAR-04 |
| Scenario | 阅读进度 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440×900

**步骤：**
1. 滚动到正文顶部、正文中点、正文末尾，分别读取进度

**预期结果：**
- 约 0%、约 50%（±5%）、100%；进度元素 `role="progressbar"`，`aria-valuenow` 同步

**playwright_hint：**
```ts
const bar = page.getByRole('progressbar', { name: '阅读进度' });
await expect(bar).toHaveAttribute('aria-valuenow', '100');
```

**清理：** 无（只读夹具）

---

### TC-US08-05: 目录高亮与点击跳转

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-05 |
| covers | SC-SIDEBAR-05 |
| Scenario | 目录高亮与点击跳转 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440×900

**步骤：**
1. 滚动使"配置"标题进入阅读位置；点击目录"结语"

**预期结果：**
- "配置"目录项 `aria-current="true"`，其他项没有
- 点击后地址带 `#结语` 对应锚点，"结语"标题位于视口上部（不被顶栏遮挡，`scroll-margin-top` 生效）

**playwright_hint：**
```ts
const toc = page.getByRole('navigation', { name: '目录' });
await toc.getByRole('link', { name: '结语' }).click();
await expect(page).toHaveURL(/#/);
```

**清理：** 无（只读夹具）

---

### TC-US08-06: 减弱动效直接跳转

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-06 |
| covers | SC-SIDEBAR-06 |
| Scenario | 减弱动效直接跳转 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】`reducedMotion: 'reduce'`

**步骤：**
1. 点击目录项后立即读取 `scrollY`

**预期结果：**
- 点击后同一帧即到达目标位置（`scroll-behavior` 为 auto）

**清理：** 无（只读夹具）

---

### TC-US08-07: 窄屏进度条、目录抽屉与同标签移到文末

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-07 |
| covers | SC-SIDEBAR-07, SC-SIDEBAR-09 |
| Scenario | 窄屏进度条、目录抽屉与同标签移到文末 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】390×844，`hasTouch`

**步骤：**
1. 访问 `/posts/hello`；点"目录"按钮；按 Esc；再打开并点"配置"

**预期结果：**
- 左右栏不可见；顶部进度细条可见
- "目录"按钮 ≥ 44×44
- 打开后为对话框"目录"，焦点在其中；Esc 关闭后焦点回"目录"按钮
- 点"配置"后抽屉关闭并跳到该标题
- 文末有"同标签文章"区块（8 篇）

**playwright_hint：**
```ts
await page.getByRole('button', { name: '目录' }).click();
const dlg = page.getByRole('dialog', { name: '目录' });
await page.keyboard.press('Escape');
await expect(page.getByRole('button', { name: '目录' })).toBeFocused();
```

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-SIDEBAR-01 | TC-US08-01 |
| SC-SIDEBAR-02 | TC-US08-02 |
| SC-SIDEBAR-03 | TC-US08-03 |
| SC-SIDEBAR-04 | TC-US08-04 |
| SC-SIDEBAR-05 | TC-US08-05, TC-US08-09 |
| SC-SIDEBAR-06 | TC-US08-06 |
| SC-SIDEBAR-07 | TC-US08-07 |
| SC-SIDEBAR-08 | TC-US08-08 |
| SC-SIDEBAR-09 | TC-US08-07 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
