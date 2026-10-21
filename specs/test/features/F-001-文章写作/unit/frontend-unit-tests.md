# F-001 文章写作 前端组件单元测试规格

**Feature**: F-001-文章写作
**最后更新**: 2026-10-16
**Version Tag**: v1.0
**技术假设**: React 19 + Vitest + @testing-library/react + @testing-library/user-event + jsdom（可访问性断言可加 vitest-axe）

> **层级定位**：组件隔离层。不启动浏览器、不依赖后端；网络以 mock（MSW 或注入的 fake client）替代，时间以 `vi.useFakeTimers()` 控制。
> 端到端交互（点击后真实服务调用、跨页跳转、缓存）已在 `acceptance/` 各 US 的 TC 中覆盖，此处不重复。
> **组件名为暂定，以 design-ui / design-domain 为准**；改名时只需同步本文件组件标题，UT-ID 保持不变。

---

## 约定

| 项 | 约定 |
|------|------|
| UT-ID | `UT-xx`，Feature 内全局唯一，按组件分段编号 |
| 分类 | R = 渲染测试；S = 内部状态 / 纯函数测试；A = 可访问性测试 |
| covers | 关联的 SC-ID；无直接对应写 `—` |
| 文案 | 断言文案与 behaviors.md 一致 |
| 独立性 | 每条用例独立 render；`afterEach` 执行 `cleanup()`、`vi.useRealTimers()`、清空 localStorage mock |

---

## 1. LoginForm

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-01 | R | 初始渲染 | 账号、密码输入框（type=password）、"登录"按钮 | SC-LOGIN-01 |
| UT-02 | S | 账号或密码为空（含纯空格账号） | "登录"按钮禁用；两者都非空才可用 | SC-LOGIN-05 |
| UT-03 | S | 提交中（onSubmit 返回 pending Promise） | 按钮显示加载指示并禁用；再次点击 onSubmit 只调用 1 次 | SC-LOGIN-10 |
| UT-04 | R | props `error="账号或密码错误"` | 表单上方显示该文案；密码框被清空，账号保留 | SC-LOGIN-04 |
| UT-05 | R | props `error` 为锁定提示 | 显示"尝试次数过多，请 15 分钟后再试" | SC-LOGIN-06 |
| UT-06 | S | 纯函数 `safeNextPath(next)` | `/admin/posts/abc/edit` → 原值；`https://evil.example.com`、`//evil.com`、`/\evil.com`、`javascript:alert(1)`、空 → `/admin` | SC-LOGIN-11 |
| UT-07 | A | 键盘 | Tab 顺序：账号 → 密码 → 登录；在密码框按 Enter 提交 | SC-LOGIN-01 |
| UT-08 | A | 标签与错误关联 | 输入框有可访问名称（label）；错误信息 `role="alert"`，出错后焦点移至密码框 | SC-LOGIN-04 |

---

## 2. PostListTable / PostListFilters / Pagination

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-10 | R | 传入 3 条文章 | 按传入顺序渲染行；每行显示标题（链接到 `/admin/posts/{id}`，伪元素扩到整行；无标题显示斜体"无标题"）、状态标记、更新时间（不显示标签） | SC-POSTLIST-01, SC-POSTLIST-02 |
| UT-11 | R | `items=[]` 且无筛选条件 | 显示插画/图标、"还没有文章"和"写第一篇"按钮 | SC-POSTLIST-06 |
| UT-12 | R | `items=[]` 且有筛选条件 | 写明条件（有关键字"没有标题包含“xyz”的草稿文章"，只有状态筛选"还没有草稿文章"）并显示"清除筛选"；点击后清空搜索、回到 `/admin` 并重新拉取 | SC-POSTLIST-07 |
| UT-13 | R | `error` 状态 | 显示"加载失败"与"重试"；点击触发 `onRetry`；不显示空状态 | SC-POSTLIST-09 |
| UT-14 | R | `loading` 状态 | 显示骨架/加载指示，列表区 `aria-busy="true"` | SC-POSTLIST-09 |
| UT-15 | S | 纯函数 `parseListQuery(search)` | `?status=draft&q=astro&page=2` → `{status:'draft', q:'astro', page:2}`；`status=foo` → `all`；`page` 为 `0`/`-1`/`abc`/`1.5` → 1；q 首尾空格去除 | SC-POSTLIST-04, SC-POSTLIST-08 |
| UT-16 | S | 纯函数 `buildListQuery(state)` | 默认值不写入 URL（`all`、page 1、空 q）；筛选/搜索变化时 page 重置为 1 | SC-POSTLIST-04 |
| UT-17 | S | 搜索框防抖（fake timers） | 连续输入 `a`,`as`,`ast` 在防抖期内只触发 1 次 `onSearch('ast')` | SC-POSTLIST-05 |
| UT-18 | S | 纯函数 `getPageCount(total, 20)`（`src/components/ui/Pagination.tsx`）边界 | 0→0、1→1、20→1、21→2、40→2、41→3、45→3 | SC-POSTLIST-08 |
| UT-19 | R | Pagination `totalPages<=1` | 不渲染分页控件 | SC-POSTLIST-08 |
| UT-20 | R | Pagination 第 1 / 末页 | "上一页"/"下一页"分别禁用；当前页 `aria-current="page"` | SC-POSTLIST-08 |
| UT-21 | A | 列表语义与导航 | 表格有表头；筛选控件有可访问名称；分页为 `nav` 且 `aria-label` 含"分页"；搜索框 `role="searchbox"` 有 label | SC-POSTLIST-04, SC-POSTLIST-08 |
| UT-22 | A | 行"更多"菜单 | 按钮 `aria-haspopup="menu"`、`aria-expanded` 同步；方向键在菜单项间移动，Esc 关闭并还焦点 | SC-DELETE-01 |

---

## 3. PostStatusBadge

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-25 | R | `status='draft'` | 文案"草稿" | SC-POSTLIST-01, SC-POSTINFO-01 |
| UT-26 | R | `status='published', dirty=false` | 文案"已发布" | SC-POSTLIST-01, SC-PUBLISH-04 |
| UT-27 | R | `status='published', dirty=true` | 文案"已发布 · 有修改"（列表）/"已发布 · 有修改"（写作页，变体 prop；文案统一以 design-ui 为准） | SC-POSTLIST-01, SC-AUTOSAVE-08 |
| UT-28 | S | 纯函数 `derivePostState(post)` | draft → `draft`；published 且编辑内容 = 已发布内容 → `clean`；不等 → `dirty` | SC-PUBLISH-04, SC-PUBLISH-08 |
| UT-29 | A | 状态不只靠颜色区分 | 文字始终可见；颜色对比度满足 axe 检查（亮/暗主题） | — |

---

## 4. PostMetaForm（标题 / slug / 标签 / 摘要 / 发布日期）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-30 | R | 新建模式初始渲染（冻结日期 2026-10-10） | 标题、slug、标签、摘要为空；发布日期为 2026-10-10 | SC-POSTINFO-01 |
| UT-31 | R | 编辑模式传入已有文章 | 各字段显示传入值（"旧标题"等） | SC-POSTINFO-03 |
| UT-32 | S | 纯函数 `slugify(title)` | `Hello Astro 5!`→`hello-astro-5`；`Hello Astro`→`hello-astro`；`  A  B  `→`a-b`；`C++ & C#`→`c-c`；`Ünïcödé`→`unicode`（或空，以 design-domain 为准）；`你好世界`→`''`；`---`→`''`；超长标题截断不以 `-` 结尾 | SC-POSTINFO-04, SC-POSTINFO-06 |
| UT-33 | S | slug 跟随标题 | 未手动改 slug 时，标题变化 slug 自动更新 | SC-POSTINFO-04 |
| UT-34 | S | 手动改 slug 后锁定 | slug 改为 `my-post` 后改标题为 "New Title"，slug 保持 `my-post`；清空 slug 后是否恢复跟随以 design-ui 为准 | SC-POSTINFO-05 |
| UT-35 | R | 中文标题 slug 为空 | slug 输入框为空并提示"请填写英文 slug" | SC-POSTINFO-06 |
| UT-36 | S | 纯函数 `validateSlug(s)` | `hello-astro`、`a1` 合法；`Hello World!`、`a_b`、`a b`、`中文`、空串 非法 → "仅允许小写字母、数字和连字符"；`-a`/`a-`/`a--b` 以 design-domain 为准 | SC-POSTINFO-07 |
| UT-37 | R | props `slugError="slug 已存在"` | slug 输入框下显示该文案 | SC-POSTINFO-08 |
| UT-38 | S | 摘要计数器边界 | 0/200、199/200、200/200 正常色；201 时显示红色 "201/200" 与"摘要不能超过 200 字"；中文与 emoji 按码位计数（与服务端校验一致，build-post-settings-drawer 决定）；超过 200 后不能再变长 | SC-POSTINFO-09 |
| UT-39 | S | TagInput 回车添加 | 输入 `cloudflare` 回车 → 新增标签块；重复标签不重复添加；空白输入不添加；首尾空格去除 | SC-POSTINFO-10 |
| UT-40 | S | TagInput 自动补全 | `suggestions=['astro','react']`，输入 `as` → 下拉仅显示 `astro`；选中后加入标签块并清空输入；已选标签不再出现在建议中 | SC-POSTINFO-10 |
| UT-41 | S | TagInput 删除 | 点击 `astro` 上 × → 只剩其他标签；输入框为空时 Backspace 删除最后一个 | SC-POSTINFO-10 |
| UT-42 | A | TagInput 键盘与 ARIA | 输入框 `role="combobox"`、`aria-expanded`、`aria-activedescendant`；↑↓ 选择、Enter 确认、Esc 关闭下拉；× 按钮可访问名称"删除标签 astro" | SC-POSTINFO-10 |
| UT-43 | A | 字段错误关联 | 出错字段 `aria-invalid="true"` 且 `aria-describedby` 指向错误文案；摘要计数器 `aria-live="polite"` | SC-POSTINFO-07, SC-POSTINFO-09, SC-PUBLISH-03 |

---

## 5. MarkdownEditor + PreviewPane

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-45 | S | 纯函数 `renderMarkdown(md)` GFM | `# 标题`→`<h1>`；`- [ ] 任务`→checkbox 列表（disabled）；表格→`<table>`；`> 引用`→`<blockquote>`；链接→`<a href>` | SC-PREVIEW-01 |
| UT-46 | S | 代码高亮 | ```` ```ts ```` 代码块输出带语言 class / 高亮 token；未知语言降级为纯文本不抛错 | SC-PREVIEW-02 |
| UT-47 | S | 纯函数 sanitize | `<script>alert(1)</script>` 被移除；`<img src=x onerror=alert(1)>` 移除 onerror；`[x](javascript:alert(1))` href 被移除；`<iframe>`、`<svg onload>`、`style` 表达式被过滤；正常 `<img src=https://…>` 保留 | SC-PREVIEW-03 |
| UT-48 | S | 渲染与读者端一致 | 预览与读者端共用同一 `renderMarkdown` 模块（快照对比同一输入输出相同） | SC-PREVIEW-02 |
| UT-49 | R | 空正文 | PreviewPane 显示"在左侧开始写作，这里会显示预览" | SC-PREVIEW-05 |
| UT-50 | S | 预览更新节流（fake timers） | 连续输入时渲染函数调用被节流/防抖；停止输入后 ≤ 300ms 内（推进计时器）预览为最新内容 | SC-PREVIEW-01, SC-PREVIEW-04 |
| UT-51 | S | 万字渲染性能（基准） | 10000 字 + 20 代码块输入单次 `renderMarkdown` 耗时 < 300ms（jsdom 仅作回归基线，真实指标见验收） | SC-PREVIEW-04 |
| UT-52 | R | 视图模式 | `viewMode='split'` 两区并排；`'edit'` 隐藏预览；`'preview'` 隐藏编辑（只加 `hidden`，不卸载）；无记录时 ≥ 1024px 默认并排、768–1023px 默认编辑；选择记在 `mh:editor:view`，存储不可用时不报错；窄屏渲染为 Tab，默认"编辑" | SC-PREVIEW-06, SC-PREVIEW-07 |
| UT-53 | S | 纯函数 行映射 `scrollPairs` + `interpolate` | 渲染（`sourceMap`）的顶层块带源码起始行 `data-line`；两侧行位置配对（加首尾、丢弃不递增的点）后分段线性插值，双向；无锚点时按比例映射 | SC-PREVIEW-08 |
| UT-54 | S | Ctrl/Cmd+S 快捷键 | 编辑器内按 Ctrl+S / Meta+S 调用 `onSaveNow` 且 `preventDefault` 被调用 | SC-AUTOSAVE-11 |
| UT-55 | A | 编辑器与 Tab | 编辑区有可访问名称"正文"；Tab 切换器 `role="tablist"`，←→ 切换，选中 `aria-selected`、`aria-controls` 指向面板；宽屏视图切换为单选组 `radiogroup`（"视图"，`aria-checked`） | SC-PREVIEW-06, SC-PREVIEW-07 |

---

## 6. SaveStatusIndicator（状态机）

**状态机：**

| 当前 | 事件 | 下一状态 | 显示文案 |
|------|------|------|------|
| saved | EDIT | dirty | 未保存 |
| dirty | SAVE_START | saving | 保存中… |
| saving | SAVE_OK | saved | 已保存 · HH:mm |
| saving | EDIT | saving（标记 pendingChanges） | 保存中… |
| saving | SAVE_OK（有 pendingChanges） | dirty | 未保存 |
| saving | SAVE_FAIL（网络/5xx） | error | 保存失败，将自动重试 |
| saving | SAVE_FAIL（401） | authExpired | 登录已过期，请重新登录（含登录链接，新窗口） |
| error | SAVE_START（重试） | saving | 保存中… |
| authExpired | SAVE_OK | saved | 已保存 · HH:mm |

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-60 | S | 纯 reducer 合法转换 | 按上表逐行断言下一状态 | SC-AUTOSAVE-02, SC-AUTOSAVE-06, SC-AUTOSAVE-10 |
| UT-61 | S | 非法事件 | saved 收到 SAVE_OK/SAVE_FAIL 状态不变、不抛错 | SC-AUTOSAVE-02 |
| UT-62 | R | 各状态文案 | 与上表一致；`已保存 · 14:32` 时间格式 HH:mm（冻结时钟 14:32） | SC-AUTOSAVE-02 |
| UT-63 | S | 会话过期跳转 | 自动保存或发布返回 401 → 先写入本地暂存，再跳 `/admin/login?next={当前路径}`，不触发离开确认（UI 决定 #3） | SC-AUTOSAVE-10 |
| UT-64 | S | `shouldWarnOnLeave(state)` | dirty / saving / error / authExpired → true；saved → false | SC-AUTOSAVE-09 |
| UT-65 | A | 播报 | 指示器 `role="status"` / `aria-live="polite"`；错误态不只用颜色 | SC-AUTOSAVE-02 |

---

## 7. AutosaveController / useAutosave（fake timers）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-70 | S | 2 秒防抖 | 输入后推进 1999ms 未保存；推进至 2000ms 调用 save 1 次，载荷为最新内容 | SC-AUTOSAVE-01 |
| UT-71 | S | 连续输入重置计时 | 每 1s 输入一次共 5 次，期间不保存；最后一次后 2s 保存 1 次 | SC-AUTOSAVE-01 |
| UT-72 | S | 立即保存 | `saveNow()` 立即调用 save，并取消挂起的防抖 | SC-AUTOSAVE-11 |
| UT-73 | S | 保存串行化 | 保存进行中再次触发，不并发；上一次完成后用最新内容再保存 1 次 | SC-AUTOSAVE-02 |
| UT-74 | S | 新建文章首存 | 无 id 且标题为空、正文非空 → create 载荷 title="无标题"；成功后回调 `onCreated(id)`（用于替换 URL） | SC-AUTOSAVE-04 |
| UT-75 | S | 空白新建不保存 | 无 id 且所有字段为空（含仅空白）→ 推进任意时间都不调用 create | SC-AUTOSAVE-05 |
| UT-76 | S | 失败重试与本地暂存 | 每次编辑节流 500ms 写入 stash（`mh:draft:{id|new}`，值含内容与 `savedAt`），save reject（网络）时保留；新建创建成功后 new → id；按退避策略（如 2s/4s/8s，上限以 design-domain 为准）重试；成功后清除 stash | SC-AUTOSAVE-06 |
| UT-77 | S | 401 处理 | save 返回 401 → `failed` / `unauthenticated`，在通知页面之前同步写入 stash（不等节流），不重试；下一次编辑/恢复后保存成功并清除 stash | SC-AUTOSAVE-10 |
| UT-78 | S | 纯函数 `compareLocalStash(stash, server)` | stash.updatedAt > server.updatedAt 且内容不同 → `promptRestore`；时间更旧或内容相同 → `discard`；无 stash → `none`；stash 损坏（非法 JSON）→ `none` 且不抛错 | SC-AUTOSAVE-07 |
| UT-79 | R | 恢复提示条 | `promptRestore` 时显示"发现未同步的本地内容，是否恢复？"、"本地暂存于 10月10日 14:35，比服务端版本更新。丢弃后无法找回。"及"丢弃本地内容"/"恢复本地内容"；"恢复"→ 用本地内容替换并立即保存；"丢弃"→ 清除 stash | SC-AUTOSAVE-07 |
| UT-80 | S | 不改变发布状态 | 已发布文章自动保存载荷不含 status 字段/不调用 publish | SC-AUTOSAVE-08 |
| UT-81 | S | beforeunload 注册 | `shouldWarnOnLeave` 为 true 时注册 beforeunload，saved 时移除；`disable()`（删除后跳转）后不再提示且不再保存 | SC-AUTOSAVE-09, SC-DELETE-02 |
| UT-82 | S | 卸载清理 | 组件卸载时清除定时器，无挂起的 save 调用 | — |

---

## 8. ImageUpload helpers

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-85 | S | 纯函数 `validateImageFile(file)` 类型 | png / jpeg / webp / gif → ok；svg、pdf、无扩展名、`image/svg+xml` → "仅支持 png、jpg、webp、gif" | SC-IMAGE-06 |
| UT-86 | S | 大小边界 | 50MB−1B、50MB（50×1024×1024）→ ok；50MB+1B、60MB → "图片不能超过 50MB"；0 字节 → 拒绝（以 design-domain 为准） | SC-IMAGE-05 |
| UT-87 | S | 纯函数 `insertPlaceholder(text, cursor)` | 在光标处插入占位 `![上传中…]()`，返回新文本与新光标；任务与占位按出现顺序对应（见 editor 模块规格） | SC-IMAGE-01 |
| UT-88 | S | 纯函数 `replacePlaceholder(text, index, md)` | 替换为 `![image](/img/…/x.png)`；占位前插入了新文字时仍替换正确位置，新文字不变 | SC-IMAGE-01, SC-IMAGE-09 |
| UT-89 | S | 纯函数 `removePlaceholder(text, index)` / 占位改为"上传失败" | 只移除（或改写为 `![上传失败]()`）该占位，其他内容（含其他图片占位）不变；失败占位仍参与按顺序定位（2026-10-16） | SC-IMAGE-07, SC-IMAGE-11 |
| UT-90 | S | 多图顺序 | a、b、c 三张以不同完成顺序 resolve，最终正文按 a、b、c 顺序各一行 | SC-IMAGE-04 |
| UT-91 | S | 文件名→alt | `photo.jpg`→`photo`；剪贴板无名图片→`image`；alt 中 `]`、`[` 被转义 | SC-IMAGE-01, SC-IMAGE-02, SC-IMAGE-03 |
| UT-92 | S | 校验失败不发起上传 | 60MB / svg 文件时 upload mock 调用 0 次，正文不插入内容 | SC-IMAGE-05, SC-IMAGE-06 |
| UT-93 | R | 拖放高亮 | dragenter 显示"松开以上传"，dragleave/drop 隐藏 | SC-IMAGE-02 |
| UT-94 | A | 工具栏"插入图片" | 按钮可访问名称"插入图片"，键盘可触发 file input；错误提示 `role="alert"` | SC-IMAGE-03 |

---

## 9. PublishActions

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-100 | R | 可见性矩阵：draft | 显示主按钮"发布"；不显示"发布更新"与"撤回为草稿" | SC-PUBLISH-08 |
| UT-101 | R | 可见性矩阵：published clean | 显示"发布更新"（disabled）与"撤回为草稿"；不显示"发布" | SC-PUBLISH-08, SC-PUBLISH-04 |
| UT-102 | R | 可见性矩阵：published dirty | "发布更新"可用；"撤回为草稿"显示 | SC-PUBLISH-08 |
| UT-103 | S | 进行中 | `pending='publish'` 时"发布"显示加载并禁用，点击不再触发 `onPublish`；`pending='update'` 同理 | SC-PUBLISH-08 |
| UT-104 | S | 纯函数 `getMissingRequired(post)` | 标题为空/纯空白/"无标题" → 含"标题"；slug 空 → "slug"；正文空/纯空白 → "正文"；输出文案"发布前请填写：标题、slug、正文"（只列缺失项，顺序固定） | SC-PUBLISH-03 |
| UT-105 | S | 发布前先保存 | 状态为 dirty 时点击"发布"：先 await `saveNow()`，resolve 后再调用 `onPublish`；saveNow reject 时不调用 `onPublish` | SC-PUBLISH-09 |
| UT-106 | R | 失败提示 | `onPublish` reject → 显示"发布失败，请重试"，按钮恢复可用，状态 props 未变 | SC-PUBLISH-10 |
| UT-107 | S | 撤回需确认 | 点击"撤回为草稿"先打开 ConfirmDialog（文案"撤回后读者将无法访问此文章"），确认后才调用 `onUnpublish`，取消不调用 | SC-PUBLISH-05 |
| UT-108 | A | 按钮语义 | 禁用"发布更新"有说明（`aria-disabled` + 描述"没有未发布的修改"）；加载中 `aria-busy="true"` | SC-PUBLISH-08 |

---

## 10. ConfirmDialog

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-110 | R | 删除文案 | `title="Old Post"` 渲染标题"删除《Old Post》？"、说明"删除后无法恢复。已发布的文章读者将无法再访问。"；标题含 `<img onerror>` 时作为文本渲染 | SC-DELETE-01 |
| UT-111 | S | 确认 / 取消回调 | "确认删除"调用 `onConfirm` 1 次；"取消"调用 `onCancel`，不调用 `onConfirm` | SC-DELETE-01, SC-DELETE-03 |
| UT-112 | S | Esc 关闭 | 按 Esc 调用 `onCancel` | SC-DELETE-03, SC-PUBLISH-05 |
| UT-113 | S | 确认进行中 | `onConfirm` 返回 pending Promise 时确认按钮禁用并显示加载（`aria-busy`），重复点击不再调用；"取消"禁用，Esc / 遮罩不关闭 | SC-DELETE-01 |
| UT-114 | A | 语义 | `role="alertdialog"`、`aria-modal="true"`、`aria-labelledby`/`aria-describedby` 指向标题与说明 | SC-DELETE-01 |
| UT-115 | A | 焦点陷阱 | 打开时焦点在"取消"（安全默认，以 design-ui 为准）；Tab/Shift+Tab 在对话框内循环，不跑到背景 | SC-DELETE-03 |
| UT-116 | A | 焦点还原 | 关闭后焦点回到触发元素（写文章页"删除文章"按钮） | SC-DELETE-03, SC-PUBLISH-05 |

---

## 11. EditorToolbar + Tooltip（fake timers）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-117 | S | 纯函数 `applyFormat` 行内命令 | 输入输出同 TC-US10-01 矩阵（包裹、取消包裹、空选区插入成对标记、链接选中 `url`） | SC-TOOLBAR-01, SC-TOOLBAR-02 |
| UT-118 | S | 纯函数 `applyFormat` 行级命令 | 输入输出同 TC-US10-02 矩阵（单行、多行、混合、替换前缀） | SC-TOOLBAR-03 |
| UT-119 | S | 快捷键映射 `matchShortcut(event, isMac)` | Mac 下 `metaKey+b` → `bold`、`ctrlKey+b` → `null`；其他平台相反；`shift+Digit8` → `list`、`shift+Period` → `quote`（按 `code` 判断，`key` 为 `*` / `>` 也能命中）；`isComposing` 为真 → `null` | SC-TOOLBAR-04, SC-TOOLBAR-05 |
| UT-120 | R | 键帽文案 `formatShortcut(['Mod','B'], isMac)` | Mac → `⌘B`；其他 → `Ctrl B`；`['Mod','Shift','8']` → `⇧⌘8` / `Ctrl Shift 8` | SC-TOOLBAR-07 |
| UT-121 | S | 冷启动延迟 | 悬停"加粗"推进 399ms 无 `role="tooltip"`；推进到 400ms 出现，含"加粗"与 `kbd` | SC-TOOLBAR-07 |
| UT-122 | S | 提示组预热 | 提示打开时悬停"斜体"，不推进计时器即只有 1 个 `role="tooltip"`，含"斜体"；关闭后 299ms 内悬停其他按钮立即出现，300ms 后需重新等待 | SC-TOOLBAR-08 |
| UT-123 | R | 无快捷键的按钮 | "二级标题""任务列表""插入图片"提示不含 `kbd`；`touch` 尺寸（手机）工具栏的提示一律不含 `kbd` | SC-TOOLBAR-07, SC-TOOLBAR-10 |
| UT-124 | A | 可访问名称与描述 | 每个工具栏按钮 `aria-label` 与提示文字一致；提示打开时按钮 `aria-describedby` 指向 `role="tooltip"` 元素，关闭后恢复原值；有快捷键的按钮带 `aria-keyshortcuts`（如 `Meta+B` / `Control+B`） | SC-TOOLBAR-09 |
| UT-125 | A | 键盘 | `:focus-visible` 聚焦立即显示；Esc 关闭且焦点不变；鼠标点击获得焦点时不显示 | SC-TOOLBAR-09 |

## 12. renderMarkdown 图片插件（纯函数，Node 环境）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-126 | S | 文件名解析 `parseImageKey(url)` | `/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg` → `{ w: 1600, h: 900, rgb: '556677' }`；外链、`bad-name.jpg`、宽或高为 0 → `null` | SC-LAYOUT-01, SC-LAYOUT-10 |
| UT-127 | S | 片段解析 `parseMarks(url)` | `#wide` → `{wide}`；`#live,wide` → `{live, wide}`；`#WIDE`、`#foo` → `{}`；`#wide,foo` → `{wide}` | SC-LAYOUT-01, SC-LAYOUT-10 |
| UT-128 | S | 单图输出结构 | `figure[data-article-image]` 带 `data-src`、`data-w`、`data-h`、`data-rgb`；有 `#wide` 时加 `data-wide`；有 title 时生成 `figcaption`；`alt` 保留 | SC-LAYOUT-01, SC-LAYOUT-06 |
| UT-129 | S | 组图判定矩阵 | 段落中只有图片（换行或空格分隔）且 ≥ 2 张 → `data-gallery="grid"`；混有文字或空行分隔 → 不成组；1 张 → 单图 | SC-LAYOUT-02, SC-LAYOUT-05 |
| UT-130 | S | 手风琴区间 | 首张带 `#accordion`：2 → grid、3 → accordion、7 → accordion、8 → grid；`#accordion` 出现在非首张时忽略 | SC-LAYOUT-03, SC-LAYOUT-04 |
| UT-131 | S | 网格超过 9 张 | 10 张 → 一个 9 张的 grid + 1 张单图；18 张 → 两个 9 张的 grid | SC-LAYOUT-04 |
| UT-132 | S | sanitize 顺序 | `onerror`、`javascript:`、title 中的 HTML 都被过滤；图片插件只输出白名单中的 `data-*` 属性 | SC-LAYOUT-10 |
| UT-133 | S | 源码位置 | 每个 `figure` 和 `[data-gallery]` 都带 `data-source-start` / `data-source-end`（源码字符偏移），供菜单定位 | SC-LAYOUT-11 |

## 13. 图片菜单与源码改写（纯函数 + 组件）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-134 | S | `toggleMark(source, range, 'wide')` | 标记合并矩阵与 TC-US12-10 一致；只改 `range` 内的那个 URL；没有剩余标记时连 `#` 一起去掉 | SC-LAYOUT-07 |
| UT-135 | S | `setGalleryMode(source, range, 'accordion' \| 'grid' \| 'split')` | accordion：首张加 `#accordion`；grid：去掉；split：图片之间插入空行；其他文本不变 | SC-LAYOUT-08 |
| UT-136 | S | 定位校验 | `range` 内的文本与渲染时记录的 URL 不一致时，返回 `null`，不改写 | SC-LAYOUT-11 |
| UT-137 | R | `ImageMenu` 单图 / 组图 | 单图：`menuitemcheckbox` "宽图"；组图：`menuitemradio` "网格 / 手风琴" + `menuitem` "拆成单图"；张数不在 3–7 时"手风琴"带 `aria-disabled` | SC-LAYOUT-07, SC-LAYOUT-08 |
| UT-138 | A | 菜单键盘 | Enter 打开、焦点落在第一项；↑ / ↓ 循环移动；Esc 关闭，焦点回到触发按钮 | SC-LAYOUT-07, SC-LAYOUT-08 |
| UT-139 | R | 写法帮助 | 内容包含 5 个示例（不含 iPhone 导出说明，2026-10-15）；`role="dialog"`，有可访问名称"图片写法" | SC-LAYOUT-12 |
| UT-140 | S | 预览挂载复用 `reconcileIslands(prev, next)` | 两次渲染中 `src` 和标记都相同的图片复用原实例；`src` 变化的重新挂载；被删除的卸载（已实现：`tests/unit/editor/reconcile-islands.test.ts`） | SC-LAYOUT-13 |

## 14. 照片预处理（纯函数 / 浏览器 API mock）

> 编号不重排：2026-10-15 去掉苹果相关后，UT-141、UT-143 标为已删除（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)）；UT-152 为同日新增，接在本节末尾。

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-141 | — | ~~`pairFiles(files)` 同名配对~~ | 已删除（2026-10-15） | — |
| UT-142 | S | `extractMotionPhoto(bytes)` | MotionPhoto（`Item:Length`）与 MicroVideoOffset 两种格式都能切出以 `ftyp` 开头的 mp4，静态图部分等于剩余字节；`Item:Length` 覆盖副视频与私有尾部时（OPPO）按 MP4 顶层 box 截到主视频 `mdat` 结束；没有 XMP 或 `ftyp` 校验失败 → `null` | SC-LIVE-03 |
| UT-143 | — | ~~`decodeHeic` 分支~~ | 已删除（2026-10-15） | — |
| UT-144 | S | `processVideo` 分支 | avc 编码可用 → 转码；不可用（或源编码无法解码）→ 只转封装，并返回 `warning: 'HEVC_KEPT'`；源已是无音轨的 H.264 mp4 → 原样返回；结果 10,485,760 B 保留、+1 → 返回 `{ dropVideo: true }` | SC-LIVE-06, SC-LIVE-09 |
| UT-145 | S | `dominantColor(bitmap)` | 纯色图返回该颜色；黑白各半的图片避开极暗和极亮像素后返回中性色；输出为 6 位小写 hex | SC-LIVE-01, SC-LIVE-05 |
| UT-146 | S | 占位阶段 | 占位文本的状态机：`processing` → `uploading` → 替换为引用；失败 → `failed`（`![上传失败]()`），重试回到 `processing`，移除则删掉占位；实况照片任一步失败时整项失败（2026-10-16） | SC-LIVE-05, SC-LIVE-08 |
| UT-147 | R | `LiveBadge` 与播放 | 悬停时 `play()`，离开时 `pause()` 并把 `currentTime` 设为 0；`video` 触发 `error` 后隐藏 badge，悬停不再播放 | SC-LIVE-10, SC-LIVE-11 |
| UT-152 | S | `uploadItem` 实况项（`processVideo`、上传 mock） | `{ kind: 'live' }` 的静态图与视频在同一请求中（`file` + `video`），引用追加 `#live`；`dropVideo` → 请求不含 `video`、引用不带 `#live`、`Toast/Warning`"实况视频超过 10MB…"；`HEVC_KEPT` → 带 `video` 与 `#live`、`Toast/Warning`；上传失败 → 任务进入失败态（带失败原因），不弹 `Toast/Error`（2026-10-16）；`liveEnabled: false` → 不调用 `processVideo`、请求不含 `video`、引用不带 `#live` | SC-LIVE-06, SC-LIVE-08, SC-LIVE-09, SC-LIVE-14 |

## 15. 列表删除的延迟提交 `createPendingDelete`（fake timers）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-148 | S | 6 秒到期提交 | `schedule(B)` 后推进 5999ms 未提交；推进至 6000ms 调用 commit(B) 1 次 | SC-DELETE-07 |
| UT-149 | S | 撤销与暂停 | 3 秒时 `undo()` 返回 B，之后推进任意时间不提交；再 `schedule(B)`、`hold(true)` 10 秒不提交，`hold(false)` 后剩余时间到期提交 1 次 | SC-DELETE-07 |
| UT-150 | S | 连续删除 | `schedule(A)` 2 秒后 `schedule(B)`：立即 commit(A)，B 在其后 6 秒提交；每条只提交 1 次 | SC-DELETE-08 |
| UT-151 | S | 页面卸载 | 撤销期内派发 `pagehide` → 立即 commit；`dispose()` 立即提交并移除监听，之后 `pagehide` 不再提交 | SC-DELETE-08 |

## 16. 上传体验：压缩、进度卡片、实况开关（2026-10-16，[media-upload-experience](../../../../backlog/media-upload-experience.md)）

> 函数 / 组件名为暂定，以 design-ui（组件）与 design-domain（media-upload module-spec）为准。

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-153 | S | 纯函数 `planCompression({ format, size, width, height })` | 决策表同 TC-US05-33（9 行） | SC-IMAGE-13, SC-IMAGE-15, SC-IMAGE-16 |
| UT-154 | S | `fitLongEdge(w, h, 2560)` | 4000×3000 → 2560×1920；3000×4000 → 1920×2560；2561×1440 → 2560×1439；2560×1440 / 100×100 → 不变（不放大） | SC-IMAGE-13, SC-IMAGE-15 |
| UT-155 | S | `compressImage(file)` 输出格式（canvas / `createImageBitmap` mock） | JPEG / WebP 源 → 先请求 `image/webp` 0.82；mock `toBlob` 返回 `image/png` 类型时改请求 `image/jpeg` 0.85；PNG 源 → 请求 `image/png`；结果 `size >= file.size` → 返回原文件；`createImageBitmap` 抛错或 `getContext` 返回 null → 返回原文件，不抛错；解码参数含 `imageOrientation: 'from-image'` | SC-IMAGE-13, SC-IMAGE-14, SC-IMAGE-17, SC-IMAGE-18 |
| UT-156 | S | 文件名随格式变化 | `photo.jpg` 压缩为 WebP → 上传文件名 `photo.webp`、alt 仍为 `photo`；降级 JPEG → `photo.jpg` | SC-IMAGE-13, SC-IMAGE-14 |
| UT-157 | S | 进度映射 `stageProgress(stage, ratio, { live })` | 压缩 0–15；实况视频 15–40；上传：live 时 40–100，否则 15–100；`ratio` 越界被夹紧；总进度单调不减（阶段切换不倒退） | SC-IMAGE-12, SC-LIVE-05 |
| UT-158 | S | `uploadImage` 用 XHR（fake XHR） | `upload.onprogress` 的 `loaded / total` 逐次回调；`onerror` → `{ reason: 'network' }`（"网络中断"）；`ontimeout` → "上传超时，请重试"；5xx → "上传失败，请重试"；4xx 带 `{ error }` → 使用服务端文案；`abort()` 后不再回调 | SC-IMAGE-07, SC-IMAGE-12 |
| UT-159 | R | `UploadCard` 各状态 | `waiting`："等待中…"；`compressing` / `processing-live` / `uploading`：缩略图 `img[src^="blob:"]`、`role="progressbar"` 的 `aria-valuenow`、阶段文案；`processing-live` 且有 `onStillOnly` 时显示"仅转为静态图"；`error`：红框、原因文案、"重试""移除"；`interrupted`（无任务的孤立占位）："上传已中断"、只有"移除"、无缩略图和进度条；带 `data-testid="upload-card"`、`data-state` | SC-IMAGE-01, SC-IMAGE-07, SC-IMAGE-10, SC-IMAGE-11, SC-IMAGE-19, SC-LIVE-16 |
| UT-160 | S | 缩略图 URL 生命周期 | 任务创建时 `URL.createObjectURL` 1 次；成功、移除、组件卸载时 `revokeObjectURL` 同一个 URL 各 1 次；重试不重复创建 | SC-IMAGE-01 |
| UT-161 | S | `useImageUploads` 重试 / 移除 / 仅静态图 | 失败任务 `retry(id)` 从压缩重新开始，占位位置不变；`remove(id)` 删占位并移出任务列表，其余任务仍按顺序对应；`stillOnly(id)` 中止本项视频处理（`AbortSignal`），本项按静态图继续，其他项不受影响 | SC-IMAGE-10, SC-IMAGE-11, SC-LIVE-16 |
| UT-162 | S | 实况开关存储 `readLivePref()` / `writeLivePref(v)` | 无值 → `false`；写入 `true` 后读回 `true`；`getItem` / `setItem` 抛错 → 读 `false`、写静默失败 | SC-LIVE-14, SC-LIVE-15 |
| UT-163 | R/A | `EditorToolbar` 实况开关 | `role="switch"`、可访问名称"实况照片"、`aria-checked` 随点击切换；键盘 Space / Enter 可切换；有悬停提示 | SC-LIVE-15 |
| UT-164 | S | `toggleMark(source, range, 'live')` | `#wide,live` 去 live → `#wide`；`#live` 去 live → 无片段；`#wide` 加 live → `#wide,live`；`#accordion` 首张加 live → `#accordion,live`；只改 `range` 内的 URL（即 TC-US12-21） | SC-LAYOUT-14 |
| UT-165 | R | `ImageMenu` 实况项 | `hasLiveVideo` 为 `true` 时显示 `menuitemcheckbox`"实况"，`aria-checked` 与 URL 中 `live` 一致；`false` / 检查中 → 不显示；同一 key 的检查函数在一次会话内只调用 1 次（缓存） | SC-LAYOUT-14, SC-LAYOUT-15 |

## 17. Afilmory 外链照片（2026-10-19，[afilmory-photo-embed](../../../../backlog/afilmory-photo-embed.md)）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-166 | S | `parseExternalPhoto(url, storage)` | 登记前缀 + `#ext=3072x4096x8a7b6c,mp=3337665+14749941,live` → `{ w, h, rgb, thumb, mp: { offset, size } }`；只有 ext → 无 mp；`ext=0x600x112233`、`ext=800x600`、`ext=800x600xZZZZZZ`、`ext=20001x1x000000` → null；`mp=0+10`、`mp=10`、`mp=a+b` → 忽略 mp；其他前缀（`…/main.evil/…`、`…/main/../x`）→ null | SC-AFIL-08, SC-AFIL-11 |
| UT-167 | S | `thumbnailFor(url, storage)` | `{storage}18369.jpg` → `{storage}.afilmory/thumbnails/18369.jpg`；子目录 `{storage}%E6%89%8B%E5%8A%9E/wf2026/23473.jpg` → `{storage}.afilmory/thumbnails/23473.jpg`；`.png` 原图 → `….jpg`；不在前缀下 → null | SC-AFIL-07, SC-AFIL-08 |
| UT-168 | S | `renderMarkdown` 外链照片 | figure 带 `data-src`（原图）、`data-w` / `data-h` / `data-rgb`、`data-thumb`、`data-mp`；`img[src]` = 缩略图、带宽高；`live` 只在有 mp 时输出 `data-live`；`wide` 照常；未登记前缀同写法 → 普通外链；`ImageRef` 带 `thumb` / `mp`；组图中同样输出 | SC-AFIL-08, SC-AFIL-11 |
| UT-169 | S | `parseAfilmoryPaste(text, site)` | 单张代码 → `{ kind: 'photos', ids: ['18369'] }`；多张 `"23473, 23514 ,,18382"` → 3 个；照片页链接（前后空白、末尾 `/`、带查询串）→ 1 个；tag 代码 → `{ kind: 'tag' }`；其他站点代码、站点首页、`https://example.com/photos/1`、夹带文字、非法 id、空 ids → null | SC-AFIL-01 ~ 04 |
| UT-170 | S | `afilmoryMarkdown(info, { storage, live })` | 18369 + live → `![](url#ext=3072x4096x8a7b6c,mp=3337665+14749941,live)`；live 关 → 无 live；无 video → 无 mp 且忽略 live；thumbnail 不符或 url 不在前缀 → `![](url)` + warning | SC-AFIL-01, SC-AFIL-06, SC-AFIL-07 |
| UT-171 | S | `collectArticleImages` 外链字段 | `data-thumb` / `data-mp` → `external: { thumb, mainBytes: offset }`、`live: { videoSrc: 原图, range, codec: 'hevc' }`（仅 `data-live`）；无 mp → `external: { thumb }`、无 live | SC-AFIL-08 ~ 10 |
| UT-172 | S | `loadMainImage` / `loadVideoRange`（fetch mock） | 主图 `Range: bytes=0-{mainBytes-1}`，206 / 200 → `blob:` URL；同一地址复用同一个 Promise；网络错误 / 4xx / 5xx → reject 且下次可重试；无 mainBytes → 不 fetch，预加载原图后 resolve 原图地址；视频 `bytes={offset}-{offset+size-1}`，只接受 206，Blob 类型 `video/mp4` | SC-AFIL-08, 09, 10, 12 |
| UT-173 | R | `ArticleImage` 外链（IntersectionObserver / 读取 mock） | 初始 `img[src]` = 缩略图；进入视口前不读取；进入后读取一次，resolve 后 `src` = 主图、`[data-status]` 保持 complete；reject → 仍为缩略图、不显示失败 | SC-AFIL-08, SC-AFIL-12 |
| UT-174 | R | `LivePhotoLayer` 外链视频 | `codec: 'hevc'` 且 `canPlayType('video/mp4; codecs="hvc1"')` 为空 → 不渲染；支持时初始 `video` 无 `src`；触发播放时调用 `loadVideoRange` 一次，resolve 后设置 `src` 并 `play()`；reject → 隐藏 | SC-AFIL-10 |
| UT-175 | S | `useImageUploads.insertAfilmoryPhotos(ids)`（接口 mock） | 一次插入 n 行占位；卡片 `state: 'fetching'`、`name` 为"Afilmory {id}"、无缩略图；乱序完成按占位顺序替换；502 / 404 → `error` 为接口文案、占位"上传失败"；`retry` 重新请求；401 → `onUnauthenticated`；warning 经 `onWarning` | SC-AFIL-01, 02, 05, 07 |
| UT-176 | S | `normalizeSiteConfig` 的 `afilmory` | 缺省 → undefined；`site` 非 https 或带路径 → 构建失败（末尾 `/` 去掉）；`storage` 非 https 或不以 `/` 结尾 → 构建失败 | SC-AFIL-11, SC-AFIL-13 |

---

## 覆盖说明

本文件为组件隔离层补充，不承担 SC-ID 全覆盖（全覆盖由 acceptance/ 保证）。与 UI 相关的 SC-ID 均至少有一条 UT 对应：

| Story | 关联 UT 的 SC-ID |
|------|------|
| US-01 登录 | SC-LOGIN-01, 04, 05, 06, 10, 11 |
| US-03 文章信息 | SC-POSTINFO-01, 03 ~ 10 |
| US-04 预览 | SC-PREVIEW-01 ~ 08 |
| US-05 图片 | SC-IMAGE-01 ~ 07, 09 ~ 18 |
| US-06 自动保存 | SC-AUTOSAVE-01, 02, 04 ~ 11 |
| US-07 列表 | SC-POSTLIST-01 ~ 02, 04 ~ 09 |
| US-08 发布 | SC-PUBLISH-03 ~ 05, 08 ~ 10 |
| US-09 删除 | SC-DELETE-01 ~ 03, 07, 08 |
| US-10 工具栏 | SC-TOOLBAR-01 ~ 05, 07 ~ 10 |
| US-11 实况照片 | SC-LIVE-01, 03 ~ 06, 08 ~ 11, 14 ~ 16（02、07、13 已删除） |
| US-12 图片排版 | SC-LAYOUT-01 ~ 08, 10 ~ 15 |
| US-13 Afilmory 照片 | SC-AFIL-01 ~ 12（13 为服务端，见 media domain-model MEDIA-UT-11 ~ 14） |

未在单元层覆盖（纯服务端 / 跨系统，由 acceptance 覆盖）：SC-LOGIN-02/03/07/08/09、SC-LOGOUT-*、SC-POSTINFO-02/11、SC-IMAGE-08、SC-AUTOSAVE-03、SC-POSTLIST-03、SC-PUBLISH-01/02/06/07、SC-DELETE-04 ~ 06、SC-TOOLBAR-06（原生撤销栈）、SC-TOOLBAR-11（页面级接线）、SC-LIVE-12（文件选择器接线）、SC-LAYOUT-09（触屏手势）。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-10 | v1.1 | 按钮名"更新"改为"发布更新"；UT-108 禁用说明以 design-ui 为准落定 | miraclehifi |
| 2026-10-12 | v1.2 | 新增 §11 EditorToolbar + Tooltip（UT-117 ~ UT-125，US-10） | miraclehifi |
| 2026-10-13 | v1.3 | 新增 §12 图片插件、§13 图片菜单、§14 照片预处理（UT-126 ~ UT-147，US-11、US-12） | miraclehifi |
| 2026-10-14 | v1.4 | 新增 §15 列表删除的延迟提交（UT-148 ~ UT-151，US-09 撤销） | miraclehifi |
| 2026-10-14 | v1.9 | UT-63 改为跳登录页（作者确认）；UT-77 补充同步暂存 | miraclehifi |
| 2026-10-15 | v1.10 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)）：UT-141 `pairFiles`、UT-143 `decodeHeic` 删除；UT-139、142、144、146 改写；新增 UT-152 `uploadItem` 实况项 | miraclehifi |
| 2026-10-16 | v1.11 | 上传体验升级（[media-upload-experience](../../../../backlog/media-upload-experience.md)）：新增 §16（UT-153 ~ UT-165：压缩、进度、XHR、UploadCard、重试 / 移除 / 仅静态图、实况开关、菜单实况项）；UT-89、146、152 失败处理改为失败卡片 | miraclehifi |
| 2026-10-14 | v1.8 | UT-76 暂存时机与 key；UT-79 横幅文案按设计稿 | miraclehifi |
| 2026-10-14 | v1.7 | UT-53 由按标题映射改为按 `data-line` 行映射（editor module-spec §3，作者确认） | miraclehifi |
| 2026-10-14 | v1.6 | UT-52 补充默认视图与存储；UT-55 宽屏视图切换按设计稿改为单选组 | miraclehifi |
| 2026-10-14 | v1.5 | UT-110 文案按设计稿改为"删除《标题》？"；UT-113 补充进行中不可取消；UT-116 触发元素改为"删除文章"按钮 | miraclehifi |
| 2026-10-19 | v1.x | 新增 §17 Afilmory 外链照片（UT-166 ~ UT-176，US-13） | miraclehifi |
