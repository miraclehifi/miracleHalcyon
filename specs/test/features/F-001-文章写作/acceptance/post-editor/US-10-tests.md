# 格式工具栏与快捷键 验收测试

**US ID**: US-10
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-10-format-toolbar/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-10-format-toolbar/behaviors.md)
**最后更新**: 2026-10-12
**Version Tag**: v1.0

> 本文件为验收**规格**，非可执行代码；implement 阶段转化为测试代码。
> 格式命令的文本变换放在纯函数单元层（下称 `applyFormat(text, selection, command) → { text, selection }`，名称待 design-domain 确定），UI 层只验证接线、快捷键与提示交互。

---

## 约定与建议值

| 项 | 取值 | 来源 |
|----|------|------|
| 冷启动延迟 | 400ms（断言窗口：350ms 时未出现，600ms 内出现） | BH-07 / components.md"悬停提示参数" |
| 预热窗口 | 300ms | BH-08 |
| 长按时长 | 500ms | BH-10 |
| `Mod` | Mac（`userAgentData.platform` 或 `navigator.platform` 含 Mac）为 `Meta`，其他为 `Control` | story 约束 |
| 宽 / 窄屏断点 | 768px | admin-post-editor.md"响应式" |

---

## 测试数据策略

| 策略 | 内容 | 隔离方式 |
|------|------|----------|
| **Fixture（共享只读）** | `adminSession`：测试管理员已登录会话 Cookie | 只读 |
| **Factory** | `postFactory({body, slug='t-{runId}-{seq}', status='draft'})` | 每用例独立 |
| **Cleanup** | afterEach 删除本用例创建及自动保存产生的文章（按 runId 前缀 + id） | — |

---

## 测试用例列表

| TC ID | covers | 场景 | type | Priority |
|-------|--------|------|------|----------|
| TC-US10-01 | SC-TOOLBAR-01, SC-TOOLBAR-02 | 行内格式变换矩阵 | unit | P0 |
| TC-US10-02 | SC-TOOLBAR-03 | 行级前缀切换矩阵 | unit | P0 |
| TC-US10-03 | SC-TOOLBAR-01, SC-TOOLBAR-06 | 点击加粗后撤销还原 | ui-interaction | P0 |
| TC-US10-04 | SC-TOOLBAR-04 | 快捷键执行命令并拦截默认行为 | ui-interaction | P0 |
| TC-US10-05 | SC-TOOLBAR-05 | 组字期间快捷键不触发 | ui-interaction | P1 |
| TC-US10-06 | SC-TOOLBAR-07 | 悬停 400ms 显示提示与键帽 | ui-interaction | P1 |
| TC-US10-07 | SC-TOOLBAR-08 | 相邻按钮共用一个提示 | ui-interaction | P1 |
| TC-US10-08 | SC-TOOLBAR-09 | 键盘聚焦显示、Esc 关闭 | a11y | P0 |
| TC-US10-09 | SC-TOOLBAR-10 | 手机长按显示提示且不触发操作 | ui-interaction | P1 |
| TC-US10-10 | SC-TOOLBAR-11 | 顶栏与抽屉图标按钮的提示 | ui-interaction | P2 |

---

## 测试用例详情

### TC-US10-01: 行内格式变换矩阵

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-01 |
| covers | SC-TOOLBAR-01, SC-TOOLBAR-02 |
| Scenario | `applyFormat` 对行内命令的包裹、取消包裹、空选区 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据**（`‸` 表示光标，`⟦ ⟧` 表示选区）：

| 命令 | 输入 | 输出 |
|------|------|------|
| bold | `写作是⟦思考⟧` | `写作是**⟦思考⟧**` |
| bold | `写作是**⟦思考⟧**` | `写作是⟦思考⟧` |
| bold | `写作是‸` | `写作是**‸**` |
| italic | `⟦思考⟧` | `*⟦思考⟧*` |
| code | `⟦npm i⟧` | `` `⟦npm i⟧` `` |
| link | `⟦思考⟧` | `[思考](⟦url⟧)`（选区落在 `url`） |
| link | `‸` | `[‸](url)`（光标在方括号内） |

**预期结果：** 每行输出的文本与选区完全一致

---

### TC-US10-02: 行级前缀切换矩阵

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-02 |
| covers | SC-TOOLBAR-03 |
| Scenario | 行级命令对单行、多行、已有前缀的处理 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：**

| 命令 | 输入（选区覆盖的行） | 输出 |
|------|------|------|
| heading2 | `标题` | `## 标题` |
| heading2 | `## 标题` | `标题` |
| list | `苹果` / `香蕉` | `- 苹果` / `- 香蕉` |
| list | `- 苹果` / `- 香蕉` | `苹果` / `香蕉` |
| list | `苹果` / `- 香蕉`（混合） | `- 苹果` / `- 香蕉`（有一行没有该前缀时全部加上） |
| task | `买菜` | `- [ ] 买菜` |
| quote | `- 苹果` | `> 苹果`（替换前缀） |

**预期结果：** 输出一致；选区仍覆盖原来的行

---

### TC-US10-03: 点击加粗后撤销还原

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-03 |
| covers | SC-TOOLBAR-01, SC-TOOLBAR-06 |
| Scenario | 工具栏按钮接线正确，改动进入浏览器原生撤销栈 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** `postFactory({body:"写作是思考"})` 创建文章 P

**步骤：**
1. 打开 `/admin/posts/:idP`，在源码区选中"思考"
2. 点击工具栏"加粗"
3. 按 `Mod+Z`

**预期结果：**
- 步骤 2：源码区为 `写作是**思考**`，焦点仍在源码区，选中文字为"思考"
- 步骤 3：源码区恢复为 `写作是思考`

**playwright_hint：**
```ts
await page.getByRole('button', { name: '加粗' }).click();
await expect(page.getByTestId('md-editor')).toHaveValue('写作是**思考**');
await page.keyboard.press('ControlOrMeta+z');
await expect(page.getByTestId('md-editor')).toHaveValue('写作是思考');
```

**清理：** 删除文章 P

---

### TC-US10-04: 快捷键执行命令并拦截默认行为

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-04 |
| covers | SC-TOOLBAR-04 |
| Scenario | 6 个快捷键各自生效，`keydown` 被 `preventDefault`；焦点在标题框时不响应 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** `postFactory({body:"思考"})` 创建文章 P

**测试数据：** `Mod+B` → `**思考**`；`Mod+I` → `*思考*`；`Mod+K` → `[思考](url)`；`Mod+E` → `` `思考` ``；`Mod+Shift+8` → `- 思考`；`Mod+Shift+.` → `> 思考`

**步骤**（每个快捷键各执行一遍，执行前把正文重置为"思考"并全选）：
1. 按快捷键
2. 把焦点移到标题输入框，按 `Mod+B`

**预期结果：**
- 步骤 1：源码区为对应输出；页面内监听到的该次 `keydown` 事件 `defaultPrevented === true`
- 步骤 2：标题与正文都不变

**清理：** 删除文章 P

---

### TC-US10-05: 组字期间快捷键不触发

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-05 |
| covers | SC-TOOLBAR-05 |
| Scenario | `isComposing` 为真的 `keydown` 不执行格式命令 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ⚠️ 浏览器自动化难以驱动真实输入法，用派发合成事件替代 |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：** 在源码区派发 `compositionstart`，再派发 `keydown`（`key:'b'`、`metaKey` / `ctrlKey` 为真、`isComposing:true`）

**预期结果：** 源码区内容不变；事件未被 `preventDefault`

---

### TC-US10-06: 悬停 400ms 显示提示与键帽

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-06 |
| covers | SC-TOOLBAR-07 |
| Scenario | 冷启动延迟、提示位置、键帽按平台显示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**测试数据：** 视口 1280×800；分别模拟 Mac 与 Windows 平台运行

**步骤：**
1. 鼠标移到"加粗"，等 350ms
2. 再等 250ms
3. 鼠标移出工具栏，等 700ms；再移到"任务列表"，等 600ms

**预期结果：**
- 步骤 1：页面上没有 `role="tooltip"`
- 步骤 2：出现 `role="tooltip"`，文字含"加粗"；键帽 Mac 为 `⌘B`，Windows 为 `Ctrl B`；提示顶边 ≥ 按钮底边（在按钮下方）
- 步骤 3：提示只含"任务列表"，没有 `kbd`

---

### TC-US10-07: 相邻按钮共用一个提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-07 |
| covers | SC-TOOLBAR-08 |
| Scenario | 提示开着或在预热窗口内切换按钮，立即换内容，且只有一个提示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：**
1. 鼠标移到"加粗"，等到提示出现
2. 移到"斜体"，等 100ms
3. 移出工具栏，等 200ms，再移到"链接"，等 100ms

**预期结果：**
- 步骤 2：`role="tooltip"` 数量为 1，文字含"斜体"
- 步骤 3：`role="tooltip"` 数量为 1，文字含"链接"（没有等 400ms）

---

### TC-US10-08: 键盘聚焦显示、Esc 关闭

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-08 |
| covers | SC-TOOLBAR-09 |
| Scenario | `:focus-visible` 立即显示并关联 `aria-describedby`；Esc 关闭；鼠标点击不显示 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | a11y |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：**
1. 聚焦标题输入框，按 Tab 直到焦点落在"二级标题"
2. 按 Esc
3. 用鼠标点击"加粗"后把鼠标移出工具栏

**预期结果：**
- 步骤 1：立即出现 `role="tooltip"`，文字"二级标题"；按钮 `aria-describedby` 等于提示的 `id`；按钮可访问名称仍为"二级标题"
- 步骤 2：提示消失，`document.activeElement` 仍是"二级标题"按钮；按钮不再有 `aria-describedby`
- 步骤 3：页面上没有 `role="tooltip"`

---

### TC-US10-09: 手机长按显示提示且不触发操作

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-09 |
| covers | SC-TOOLBAR-10 |
| Scenario | 触屏长按 500ms 显示提示（无键帽），随后的 click 被吞掉；轻点正常执行 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ⚠️ 需 `hasTouch` 上下文 + CDP 派发触摸事件 |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**前置条件：** `postFactory({body:"思考"})` 创建文章 P；视口 390×844，`hasTouch: true`

**步骤：**
1. 源码区全选，在"加粗"上按下 600ms 后松开
2. 轻点"加粗"

**预期结果：**
- 步骤 1：出现提示"加粗"，没有 `kbd`；提示底边 ≤ 按钮顶边（在按钮上方）；源码区仍为 `思考`
- 步骤 2：源码区为 `**思考**`

**清理：** 删除文章 P

---

### TC-US10-10: 顶栏与抽屉图标按钮的提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-10 |
| covers | SC-TOOLBAR-11 |
| Scenario | 只有图标的按钮有提示，带文字的按钮没有 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-12 v1.0 初始创建 |

**步骤：**
1. 视口 1280×800，打开设置抽屉，鼠标停在"关闭设置"600ms
2. 鼠标停在顶栏"设置"（带文字）600ms
3. 视口 390×844（`hasTouch`），长按顶栏返回按钮 600ms

**预期结果：**
- 步骤 1：提示"关闭设置"，在按钮下方
- 步骤 2：没有 `role="tooltip"`
- 步骤 3：提示"返回文章列表"，在按钮下方，完整在视口内

---

## 追溯矩阵

| SC-ID | BH | TC |
|------|------|------|
| SC-TOOLBAR-01 | BH-01 | TC-US10-01, TC-US10-03 |
| SC-TOOLBAR-02 | BH-02 | TC-US10-01 |
| SC-TOOLBAR-03 | BH-03 | TC-US10-02 |
| SC-TOOLBAR-04 | BH-04 | TC-US10-04 |
| SC-TOOLBAR-05 | BH-05 | TC-US10-05 |
| SC-TOOLBAR-06 | BH-06 | TC-US10-03 |
| SC-TOOLBAR-07 | BH-07 | TC-US10-06 |
| SC-TOOLBAR-08 | BH-08 | TC-US10-07 |
| SC-TOOLBAR-09 | BH-09 | TC-US10-08 |
| SC-TOOLBAR-10 | BH-10 | TC-US10-09 |
| SC-TOOLBAR-11 | BH-11 | TC-US10-10 |

**Story 验收标准追溯**：AC1→TC-01/03；AC2→TC-02；AC3→TC-04/05；AC4→TC-06；AC5→TC-07；AC6→TC-08；AC7→TC-09；约束"可被原生撤销"→TC-03。

**NFR 追溯**：键盘可达→TC-08；移动端可用→TC-09/10。

**Gap 检查**：behaviors.md SC-ID 集合 {SC-TOOLBAR-01 … SC-TOOLBAR-11}（11 个）与本文件 covers 集合求差 = ∅。

**Gap: 无**

---

## 执行记录

| 日期 | 执行人 | 结果 | 备注 |
|------|--------|------|------|
| — | — | ⏳ | 待 implement 阶段转化执行 |

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-12 | v1.0 | 初始创建（[Backlog](../../../../../backlog/editor-warm-tooltip.md)） | miraclehifi |
