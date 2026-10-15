# US-12 图片排版标记 验收测试

**US ID**: US-12
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/behaviors.md)
**最后更新**: 2026-10-13
**Version Tag**: v1.0

> 用例以 behaviors.md 为基础，补充等价类、边界值和错误猜测。写法规则以 [ADR-005](../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) 为准。
> 渲染规则是纯函数 `renderMarkdown`，大部分用例在单元层用"输入 Markdown → 输出 HTML 结构"矩阵覆盖（见 [frontend-unit-tests.md](../../unit/frontend-unit-tests.md) §12）。本文件只放需要浏览器参与的端到端行为，以及代表性的渲染断言。
> 菜单的视觉与位置以 design-ui 补充的规格为准。

---

## 测试数据策略

| 类别 | 策略 |
|------|------|
| 图片 | 测试环境 R2 预置只读夹具：`img/2026/10/aaaaaaaaaa_1600x900_556677.jpg` 等 9 张（宽高、主色各不相同），所有 TC 共用，只读 |
| 测试文章 | 每个 TC 通过 API 新建草稿，正文直接写入 Markdown，标题前缀 `[E2E-US12]` |
| 视口 | 桌面 1440×900，用"预览"模式核对宽图（正文宽约 680px）；手机用 `devices['iPhone 13']` |
| 渲染断言 | 依赖渲染结构的 `data-*` 约定（`[data-article-image]`、`[data-wide]`、`[data-gallery="grid|accordion"]`、`figcaption`），以 feature-architecture §6.3 为准 |

以下用 `IMG(n)` 表示第 n 张夹具的完整 Markdown URL，例如 `IMG(1)` = `/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg`。

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | 优先级 |
|-------|--------|------|------|--------|
| TC-US12-01 | SC-LAYOUT-01 | `#wide` 渲染为宽图并预留宽高比 | e2e | P0 |
| TC-US12-02 | SC-LAYOUT-02 | 2 / 3 / 9 张图片的段落渲染为网格 | e2e | P0 |
| TC-US12-03 | SC-LAYOUT-03 | 首张 `#accordion` 且 3 / 7 张渲染为手风琴 | e2e | P0 |
| TC-US12-04 | SC-LAYOUT-04 | 边界：手风琴 2 张 / 8 张退回网格；网格 10 张折行 | e2e | P1 |
| TC-US12-05 | SC-LAYOUT-05 | 图片与文字同段、图片之间空行，不成组 | e2e | P1 |
| TC-US12-06 | SC-LAYOUT-06 | title 渲染为图注；无 title 不显示；alt 保留 | e2e | P0 |
| TC-US12-07 | SC-LAYOUT-10 | 未知标记、外链、不符合命名的文件名按普通图显示 | e2e | P1 |
| TC-US12-08 | SC-LAYOUT-10 | 安全：标记和 title 中的注入内容被过滤 | security | P0 |
| TC-US12-09 | SC-LAYOUT-07 | 单图菜单切换宽图，改写源码，⌘Z 撤销 | ui-interaction | P0 |
| TC-US12-10 | SC-LAYOUT-07 | 已有 `#live` 时开 / 关宽图，标记合并正确 | ui-interaction | P1 |
| TC-US12-11 | SC-LAYOUT-08 | 组图菜单：网格 ↔ 手风琴 ↔ 拆成单图 | ui-interaction | P0 |
| TC-US12-12 | SC-LAYOUT-08 | 张数不在 3–7 时"手风琴"不可用并提示 | ui-interaction | P1 |
| TC-US12-13 | SC-LAYOUT-09 | 手机点按出现菜单，点外部关闭，可点区域 ≥ 44px | ui-interaction | P1 |
| TC-US12-14 | SC-LAYOUT-11 | 菜单打开期间源码中删除该图：菜单关闭，源码不被改写 | ui-interaction | P1 |
| TC-US12-15 | SC-LAYOUT-11 | 同一 URL 出现两次，菜单只改被操作的那一张 | ui-interaction | P1 |
| TC-US12-16 | SC-LAYOUT-12 | 底栏"图片写法"说明的打开、内容、Esc 关闭、焦点回归 | ui-interaction | P2 |
| TC-US12-17 | SC-LAYOUT-13 | 继续输入时，已加载的图片不重新加载、不重新播放动画 | ui-interaction | P1 |
| TC-US12-18 | SC-LAYOUT-07, SC-LAYOUT-08 | 菜单可用键盘操作（Tab 到图片、Enter 打开、方向键、Esc） | ui-interaction | P1 |

---

## TC-US12-01: `#wide` 渲染为宽图并预留宽高比

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-01 |
| covers | SC-LAYOUT-01 |
| Scenario | 宽图标记 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**前置条件：** 【数据前置】正文为 `![山](IMG(1)#wide)`，下方还有一段文字 `段落`；【环境前置】桌面视口，"预览"模式

**步骤：** 打开草稿；在图片网络请求返回前（用 `route` 延迟 3s）测量图片容器尺寸，返回后再测一次

**预期结果：**
- `[data-article-image][data-wide]` 存在
- 图片容器宽度 > `段落` 的宽度（向两侧扩出）
- 加载前后容器高度不变，宽高比 = 1600 / 900（误差 ±1px）

**清理：** 删除草稿

---

## TC-US12-02: 2 / 3 / 9 张图片的段落渲染为网格

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-02 |
| covers | SC-LAYOUT-02 |
| Scenario | 组图网格的识别与列数 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：** 三个段落，彼此用空行隔开：段落 A 有 2 行图片（IMG(1–2)），段落 B 有 3 行（IMG(3–5)），段落 C 有 9 行（IMG(1–9)）

**预期结果：**
- 共 3 个 `[data-gallery="grid"]`，分别含 2、3、9 张图
- 列数按 components.md "组图网格参数"随张数决定（以 design-ui 为准）
- 每个单元格都是 RefineFrame 包裹的图片（components.md"图片加载参数"），且带主色（`[data-gallery-item][data-accent]`）

**清理：** 删除草稿

---

## TC-US12-03: 首张 `#accordion` 且 3 / 7 张渲染为手风琴

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-03 |
| covers | SC-LAYOUT-03 |
| Scenario | 手风琴识别（区间上下界） |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：** 段落 A 有 3 张，首张带 `#accordion`；段落 B 有 7 张，首张带 `#accordion`

**预期结果：** 两个都是 `[data-gallery="accordion"]`，分别含 3 张和 7 张

**清理：** 删除草稿

---

## TC-US12-04: 边界——手风琴 2 张 / 8 张退回网格；网格 10 张折行

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-04 |
| covers | SC-LAYOUT-04 |
| Scenario | 区间外的退回规则 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：** 2 张且首张带 `#accordion`；8 张且首张带 `#accordion`；10 张不带标记

**预期结果：**
- 前两个都是 `[data-gallery="grid"]`
- 10 张的段落渲染为两个连续的网格，分别是 9 张和 1 张（剩下 1 张时按单图显示，以 design-ui 为准）
- 页面无报错

**清理：** 删除草稿

---

## TC-US12-05: 图片与文字同段、图片之间空行，不成组

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-05 |
| covers | SC-LAYOUT-05 |
| Scenario | 不成组的等价类 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：**
1. `见下图` + 换行 + IMG(1) + 换行 + IMG(2)（同一段落）
2. IMG(3) + 空行 + IMG(4)
3. 同一行内两张图片，中间用空格分隔（同一段落、只有图片）

**预期结果：**
- 情况 1 和情况 2：没有 `[data-gallery]`，每张都是单图
- 情况 3：成组（判断条件是段落里只有图片和空白，与是否换行无关）

**清理：** 删除草稿

---

## TC-US12-06: title 渲染为图注；无 title 不显示；alt 保留

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-06 |
| covers | SC-LAYOUT-06 |
| Scenario | 图注 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：** `![一只猫](IMG(2) "窗台上的猫")`；`![无图注](IMG(3))`；在组图中给第 1 张写 title

**预期结果：**
- 第 1 张：`figcaption` 文本为"窗台上的猫"；`img[alt="一只猫"]`
- 第 2 张：没有 `figcaption`
- 组图中单元格的 title 作为该图的说明（展示位置以 design-ui 为准），不会变成整组的图注

**清理：** 删除草稿

---

## TC-US12-07: 未知标记、外链、不符合命名的文件名按普通图显示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-07 |
| covers | SC-LAYOUT-10 |
| Scenario | 容错 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（外链用 `route` 返回本地 png） |
| type | e2e |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：**

| # | Markdown | 预期 |
|---|----------|------|
| 1 | `![a](https://example.com/a.png#foo)` | 普通图片，不预留比例 |
| 2 | `![b](/img/2026/10/bad-name.jpg)` | 普通图片，不预留比例 |
| 3 | `![c](IMG(1)#WIDE)` | 不认（标记区分大小写），按普通图片 |
| 4 | `![d](IMG(1)#wide,foo)` | 认出 `wide`，忽略 `foo` |
| 5 | `![e](https://example.com/x.jpg#live)` | 外链不加载视频，不显示 `LIVE` |
| 6 | `![f](IMG(1)#live)`，但 R2 中没有对应视频 | 静态图；视频 404 后隐藏 `LIVE`（同 TC-US11-25） |

**额外断言：** 控制台没有未捕获的错误；图片之后的正文正常渲染

**清理：** 删除草稿

---

## TC-US12-08: 安全——标记和 title 中的注入内容被过滤

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-08 |
| covers | SC-LAYOUT-10 |
| Scenario | 图片插件生成的结构不能绕过 sanitize |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（在 `window.__xss` 上埋点检测） |
| type | security |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：**
- `![x](IMG(1)#wide" onerror="window.__xss=1)`
- `![x](javascript:window.__xss=1)`
- `![x](IMG(1) "<img src=x onerror=window.__xss=1>")`
- `![x](/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg#live)`，并把 `.live.mp4` 的地址篡改为 `javascript:` 前缀（通过构造 key 实现）

**预期结果：**
- `window.__xss` 始终为 undefined
- 渲染结果中没有 `on*` 属性；`javascript:` 链接被移除
- 图注作为纯文本显示

**清理：** 删除草稿

---

## UI 交互测试

### TC-US12-09: 单图菜单切换宽图，改写源码，⌘Z 撤销

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-09 |
| covers | SC-LAYOUT-07 |
| Scenario | 通过预览反向改写源码 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**前置条件：** 【数据前置】正文共 5 行，第 5 行为 `![山](IMG(1))`；桌面并排模式

**步骤：**
1. 鼠标移到预览中的图片上，点击右上角"图片选项"按钮
2. 点击菜单里的"宽图"
3. 焦点回到源码区后按 `ControlOrMeta+Z`

**预期结果：**
- 步骤 1：悬停后出现"图片选项"按钮；点击后出现菜单（`role="menu"`），"宽图"项 `aria-checked="false"`
- 步骤 2：第 5 行变为 `![山](IMG(1)#wide)`；预览中出现 `[data-wide]`；"宽图"项变为 `aria-checked="true"`；触发自动保存（保存状态变为"未保存"）
- 步骤 3：第 5 行恢复原样

**playwright_hint：**
```ts
await preview.locator('[data-article-image]').hover();
await page.getByRole('button', { name: '图片选项' }).click();
const menu = page.getByRole('menu', { name: '图片' });
await menu.getByRole('menuitemcheckbox', { name: '宽图' }).click();
await expect(editor).toHaveValue(/!\[山\]\([^)]+#wide\)/);
await editor.focus();
await page.keyboard.press('ControlOrMeta+z');
await expect(editor).not.toHaveValue(/#wide/);
```

**清理：** 删除草稿

### TC-US12-10: 已有 `#live` 时开 / 关宽图，标记合并正确

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-10 |
| covers | SC-LAYOUT-07 |
| Scenario | 标记合并（决策表） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**步骤与预期（每行单独执行）：**

| 原 URL 片段 | 操作 | 结果片段 |
|-------------|------|---------|
| （无） | 开宽图 | `#wide` |
| `#live` | 开宽图 | `#live,wide` |
| `#live,wide` | 关宽图 | `#live` |
| `#wide` | 关宽图 | （无，`#` 也去掉） |
| `#accordion`（组内首张） | 单图菜单不出现，改为组图菜单 | — |

**playwright_hint：** 同 TC-US12-09，用 `toHaveValue` 断言每一行

**清理：** 删除草稿

### TC-US12-11: 组图菜单——网格 ↔ 手风琴 ↔ 拆成单图

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-11 |
| covers | SC-LAYOUT-08 |
| Scenario | 组图形态的状态转换 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**前置条件：** 【数据前置】正文是一个由 4 张图片组成的段落（IMG(1–4)），渲染为网格

**步骤：**
1. 悬停组图，点击"组图选项"，在菜单中选"手风琴"
2. 选"网格"
3. 选"拆成单图"
4. 按 `ControlOrMeta+Z` 撤销步骤 3

**预期结果：**
- 步骤 1：第一张的 URL 加上 `#accordion`，渲染为 `[data-gallery="accordion"]`
- 步骤 2：`#accordion` 被去掉，渲染为网格
- 步骤 3：4 张图片之间各插入 1 个空行（共 3 个空行），渲染为 4 张单图，没有 `[data-gallery]`
- 步骤 4：恢复为网格段落

**playwright_hint：**
```ts
await preview.locator('[data-gallery]').hover();
await page.getByRole('button', { name: '组图选项' }).click();
const menu = page.getByRole('menu', { name: '组图' });
await menu.getByRole('menuitemradio', { name: '手风琴' }).click();
await expect(preview.locator('[data-gallery="accordion"]')).toBeVisible();
await menu.getByRole('menuitem', { name: '拆成单图' }).click();
await expect(preview.locator('[data-gallery]')).toHaveCount(0);
```

**清理：** 删除草稿

### TC-US12-12: 张数不在 3–7 时"手风琴"不可用并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-12 |
| covers | SC-LAYOUT-08 |
| Scenario | 菜单项的禁用条件（边界：2、3、7、8 张） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**步骤与预期：**

| 张数 | "手风琴"项 |
|------|-----------|
| 2 | `aria-disabled="true"`；悬停或聚焦时提示"手风琴需要 3–7 张图片"；点击后源码不变 |
| 3 | 可用 |
| 7 | 可用 |
| 8 | 同 2 张 |

**playwright_hint：**
```ts
await expect(menu.getByRole('menuitemradio', { name: '手风琴' })).toHaveAttribute('aria-disabled', 'true');
await menu.getByRole('menuitemradio', { name: '手风琴' }).hover();
await expect(page.getByRole('tooltip')).toHaveText('手风琴需要 3–7 张图片');
```

**清理：** 删除草稿

### TC-US12-13: 手机点按出现菜单，点外部关闭，可点区域 ≥ 44px

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-13 |
| covers | SC-LAYOUT-09 |
| Scenario | 触屏交互 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**前置条件：** 移动视口；切到"预览"Tab；正文为 `![山](IMG(1))`

**步骤：** 点按图片；检查各菜单项的尺寸；点按菜单外的正文区域

**预期结果：** 点按后菜单出现；每个菜单项的 boundingBox 宽、高都 ≥ 44；点外部后菜单关闭；在菜单里切换宽图后，切回"编辑"Tab 能看到源码已改写

**playwright_hint：**
```ts
await preview.locator('[data-article-image]').tap();
for (const item of await menu.getByRole('menuitemcheckbox').all()) {
  const b = await item.boundingBox(); expect(b!.height).toBeGreaterThanOrEqual(44);
}
await preview.locator('p').first().tap();
await expect(menu).toBeHidden();
```

**清理：** 删除草稿

### TC-US12-14: 菜单打开期间源码中删除该图——菜单关闭，源码不被改写

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-14 |
| covers | SC-LAYOUT-11 |
| Scenario | 定位失效时的保护 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（菜单打开后直接通过 `fill` 修改 textarea） |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**步骤：**
1. 打开单图菜单
2. 用脚本把源码中的这张图删掉，替换为 `新内容`
3. 等预览更新后，尝试点击之前定位到的菜单项（如果它仍然存在）

**预期结果：** 预览更新后菜单关闭；源码保持 `新内容`，没有出现 `#wide`

**playwright_hint：**
```ts
await editor.evaluate((t: HTMLTextAreaElement) => { t.value = '新内容'; t.dispatchEvent(new Event('input', { bubbles: true })); });
await expect(menu).toBeHidden();
await expect(editor).toHaveValue('新内容');
```

**清理：** 删除草稿

### TC-US12-15: 同一 URL 出现两次，菜单只改被操作的那一张

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-15 |
| covers | SC-LAYOUT-11 |
| Scenario | 错误猜测：只按 URL 定位会改错图 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**测试数据：** 第 1 行 `![a](IMG(1))`，空行，第 3 行 `![b](IMG(1))`

**步骤：** 在预览中对第二张图片：悬停 → "图片选项" → "宽图"

**预期结果：** 只有第 3 行带 `#wide`，第 1 行不变

**playwright_hint：** `preview.locator('[data-article-image]').nth(1).hover()`，然后断言 `editor` 的值

**清理：** 删除草稿

### TC-US12-16: 底栏"图片写法"说明的打开、内容、Esc 关闭、焦点回归

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-16 |
| covers | SC-LAYOUT-12 |
| Scenario | 写法帮助 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**步骤：** 用键盘聚焦并打开底栏的"图片写法"；按 Esc；再点击打开一次，然后点击外部

**预期结果：**
- 说明中包含 5 个示例：宽图 `#wide`、实况照片 `#live`、图注 `"图注"`、组图网格（连续图片）、手风琴 `#accordion`
- 说明中包含"从 iPhone 上传实况照片"一节（电脑导出原件 / 存储到文件后多选）
- 按 Esc 后关闭，焦点回到"图片写法"按钮；点击外部也会关闭

**playwright_hint：**
```ts
await page.getByRole('button', { name: '图片写法' }).click();
const dlg = page.getByRole('dialog', { name: '图片写法' });
for (const s of ['#wide', '#live', '#accordion']) await expect(dlg).toContainText(s);
await page.keyboard.press('Escape');
await expect(page.getByRole('button', { name: '图片写法' })).toBeFocused();
```

**清理：** 无

### TC-US12-17: 继续输入时，已加载的图片不重新加载、不重新播放动画

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-17 |
| covers | SC-LAYOUT-13 |
| Scenario | 预览挂载复用 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**前置条件：** 正文包含单图 IMG(1)、一个 3 张的网格，以及一段文字

**步骤：**
1. 等所有图片加载完成，给每个图片根节点打上 `data-testmark`（通过 `evaluate`）
2. 在文字段落末尾输入 20 个字符
3. 统计输入期间对 `/img/` 的网络请求

**预期结果：** 输入后图片根节点仍带 `data-testmark`（DOM 被复用）；状态仍是已加载（没有 `data-loading`）；输入期间对 `/img/` 的请求数为 0

**playwright_hint：**
```ts
await preview.locator('[data-article-image]').evaluateAll(els => els.forEach(e => e.setAttribute('data-testmark', '1')));
let imgReq = 0; page.on('request', r => { if (r.url().includes('/img/')) imgReq++; });
await editor.press('End'); await editor.pressSequentially('一二三四五六七八九十一二三四五六七八九十');
await expect(preview.locator('[data-article-image][data-testmark]')).toHaveCount(4);
expect(imgReq).toBe(0);
```

**清理：** 删除草稿

### TC-US12-18: 菜单可用键盘操作

| 字段 | 值 |
|------|------|
| TC-ID | TC-US12-18 |
| covers | SC-LAYOUT-07, SC-LAYOUT-08 |
| Scenario | 可访问性 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-13 v1.0 初始创建 |

**步骤：** 在预览区内按 Tab 聚焦到"图片选项"按钮（聚焦后可见），按 Enter 打开菜单，用 ↓ 移动，用 Space 切换，用 Esc 关闭

**预期结果：** 打开后焦点在第一项上；↓ 在菜单项之间移动；Space 切换宽图，源码随之改写；按 Esc 后菜单关闭，焦点回到触发按钮

**playwright_hint：**
```ts
await page.keyboard.press('Enter');
await expect(menu.getByRole('menuitemcheckbox', { name: '宽图' })).toBeFocused();
await page.keyboard.press('Space');
await expect(editor).toHaveValue(/#wide/);
await page.keyboard.press('Escape');
```

**清理：** 删除草稿

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-LAYOUT-01 | BH-01 宽图 | TC-US12-01 |
| SC-LAYOUT-02 | BH-02 组图网格 | TC-US12-02 |
| SC-LAYOUT-03 | BH-03 手风琴 | TC-US12-03 |
| SC-LAYOUT-04 | BH-04 手风琴张数越界 | TC-US12-04 |
| SC-LAYOUT-05 | BH-05 混有文字不成组 | TC-US12-05 |
| SC-LAYOUT-06 | BH-06 图注 | TC-US12-06 |
| SC-LAYOUT-07 | BH-07 单图菜单 | TC-US12-09, 10, 18 |
| SC-LAYOUT-08 | BH-08 组图菜单 | TC-US12-11, 12, 18 |
| SC-LAYOUT-09 | BH-09 手机点按菜单 | TC-US12-13 |
| SC-LAYOUT-10 | BH-10 容错 | TC-US12-07, 08 |
| SC-LAYOUT-11 | BH-11 定位保护 | TC-US12-14, 15 |
| SC-LAYOUT-12 | BH-12 写法帮助 | TC-US12-16 |
| SC-LAYOUT-13 | BH-13 不重复加载 | TC-US12-17 |

| 验收标准（story.md §2） | TC-IDs |
|------------------------|--------|
| AC1 宽图 | TC-US12-01 |
| AC2 组图 / 手风琴 | TC-US12-02, 03, 04, 05 |
| AC3 图注 | TC-US12-06 |
| AC4 单图菜单 | TC-US12-09, 10, 13 |
| AC5 组图菜单 | TC-US12-11, 12 |
| AC6 写错不报错 | TC-US12-07, 08 |
| AC7 写法帮助 | TC-US12-16 |

**Gap 检查**：behaviors.md 共有 SC-LAYOUT-01 ~ SC-LAYOUT-13 13 个 SC-ID，每个都至少有 1 个 TC 覆盖。

**Gap: 无**

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-13 | v1.1 | TC-US12-16 增加 iPhone 导出方法断言 | miraclehifi |
| 2026-10-13 | v1.2 | 菜单改为"悬停出按钮 → 点击展开"（design-ui），同步 TC-US12-09/11/15/18 步骤 | miraclehifi |
