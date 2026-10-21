# editor 模块（写文章页客户端逻辑）

**最后更新**: 2026-10-16
**状态**: self-checked
**来源**: [ADR-004](../../../features/F-001-文章写作/architecture/adr/ADR-004-textarea-editor.md) · feature-architecture §3.2、§6 · [admin-post-editor.md](../../../../ui/pages/admin-post-editor.md)
**位置**: `src/lib/editor/`、`src/lib/autosave/`、`src/components/admin/editor/`

---

## 1. 源码写入（`format-commands.ts`）

所有改写源码的操作（格式工具栏、图片占位与替换、图片菜单）都走同一个入口，保证能被原生撤销：

```ts
type Edit = { from: number; to: number; insert: string; select?: [number, number] };
function applyEdit(textarea: HTMLTextAreaElement, e: Edit): void;
// 实现：setSelectionRange(from, to) → execCommand('insertText', false, insert)；
// 返回 false 时 setRangeText(insert, from, to, 'end')（失去原生撤销）；最后按 select 设置选区并派发 input 事件
```

| 纯函数 | 用途 | 测试 |
|--------|------|------|
| `applyFormat(text, sel, cmd): Edit` | 行内包裹 / 行级前缀切换 | UT-117、UT-118 |
| `matchShortcut(event, isMac): Cmd \| null` | 快捷键映射 | UT-119 |
| `toggleMark(text, range, mark): Edit \| null` | 图片菜单：宽图、实况（`live` 加在片段末尾，去掉时保留其他标记） | UT-134、UT-164 |
| `setGalleryMode(text, range, mode): Edit \| null` | 图片菜单：网格 / 手风琴 / 拆分 | UT-135 |
| `insertPlaceholder` / `replacePlaceholder` / `removePlaceholder` / `setPlaceholderState` | 上传占位（按出现顺序定位，不依赖偏移；状态改写 `处理中…` / `上传中…` / `上传失败`） | UT-87 – UT-89 |

> 已实现（Sprint 2，build-format-toolbar）：`applyEdit`、`applyFormat`（`src/lib/editor/format-commands.ts`）、`matchShortcut`（`src/lib/editor/shortcuts.ts`）、`EditorToolbar.tsx`。上传占位函数与 `src/lib/upload/use-image-uploads.ts`（Sprint 2，add-image-paste-upload；函数名为 `insertPlaceholders(cursor, count)`，一批一次插入）。

占位文本就是 `![处理中…]()` / `![上传中…]()` / `![上传失败]()`（与验收用例一致，不夹带 token）。编辑器在内存中维护**占位槽位**有序列表，与源码中的占位按出现顺序一一对应；每个槽位要么绑定一个上传任务，要么为空（孤立占位）。

- 页面加载时，源码中已有的占位全部是空槽位（任务在内存中，刷新后已不存在）→ 预览显示"上传已中断"
- 插入一批占位：按插入点前的占位个数算出位置，插入对应数量的绑定槽位
- 作者编辑导致占位数变化：按这次编辑的区间（纯删除 / 纯插入按光标定位，否则取新旧文本的公共前后缀之间）判断哪些槽位被删除、哪些占位是新出现的（例如撤销"移除"、手动粘贴占位文本）→ 删除对应槽位（绑定的任务完成后不再插入引用）、为新占位插入空槽位
- 判断不了（槽位数与占位数对不上）时：不改写任何占位，所有槽位转为空槽位（进行中的任务完成后不写回源码），避免把引用写错位置
- 任务完成 → 槽位移除、占位替换为引用；"移除" → 槽位与占位一起删除

> 已实现（Sprint 6）：识别函数 `placeholderEdit(prev, next, caret)`（`src/lib/editor/format-commands.ts`：纯删除 / 纯插入按光标，否则先取公共后缀再取前缀，区间边界落在占位中间时扩到整个占位）；槽位在 `src/lib/upload/use-image-uploads.ts`。槽位的 input 监听挂在 window 上分两步：捕获阶段（React 处理之前）只更新槽位 ref，冒泡阶段（React 处理完受控 textarea 的 onChange 之后）再通知卡片列表——先于 React 触发重渲染会把值写回旧值、吞掉撤销；只在冒泡阶段更新槽位又会被 React 同步渲染里的"渲染后核对"抢先重置（TC-US05-39）。源码被受控赋值改变时，每次渲染后按占位数核对一次（本 hook 自身写入期间跳过）。

**粘贴 Afilmory 照片**（US-13，[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)）：`MarkdownEditor` 的粘贴处理在剪贴板没有文件时，用 `parseAfilmoryPaste(text, site.afilmory.site)`（`src/lib/afilmory/paste.ts`）判断整段文本：`photos` → `preventDefault`，交给 `useImageUploads.insertAfilmoryPhotos(ids)`（与文件上传共用占位槽位与卡片）；`tag` → `preventDefault` + Toast/Error；null → 照常粘贴。图片菜单的"实况"项：外链照片按 `ImageRef.mp` 判断，不发请求。已实现（Sprint 8 任务 4、5）：`MarkdownEditor.tsx`、`MarkdownPreview.tsx`。

markdown 模块在预览模式下把空 URL 且 alt 为"处理中…"/"上传中…"/"上传失败"的图片输出为挂载点（见 markdown module-spec §2.1"上传占位"），`MarkdownPreview` 按槽位序号挂载 `UploadCard`：绑定槽位按任务状态显示，空槽位显示 `interrupted`。

## 2. 自动保存（`useAutosave`）

**状态机**

```
idle ──编辑──▶ dirty ──2s 无输入──▶ saving ──200──▶ saved
                ▲                     │
                └────编辑─────────────┤（保存中又编辑：完成后立即再排一次）
                                      ├──网络错误/5xx──▶ failed ──退避重试（2s,4s,8s…上限 60s；online 事件立即重试）
                                      ├──401──▶ 本地暂存 → 跳转 /admin/login?next=当前地址
                                      └──409 SLUG_TAKEN──▶ failed（不重试，打开设置抽屉，字段错误）
```

| 规则 | 说明 |
|------|------|
| 显示 | `idle`（新建未保存）不显示；`dirty` → "未保存"；`saving` → "保存中…"；`saved` → "已保存 · HH:mm"（取响应 `updatedAt`）；`failed` → "保存失败，将自动重试"（409 时不显示该文案，显示字段错误） |
| 请求 | 首次 `POST /api/admin/posts` → `history.replaceState` 到 `/admin/posts/{id}`；之后 `PUT`；同一时间最多一个在途请求 |
| 本地暂存 | 每次编辑（节流 500ms）写 `localStorage['mh:draft:{id\|new}'] = { savedAt, content }`；服务端保存成功且内容与暂存一致时删除 |
| 恢复判断 | 加载时暂存存在且 `savedAt > post.updatedAt` 且内容不同 → 显示 `RestoreBanner`；新建页的 `mh:draft:new` 同理。横幅未处理期间旧暂存是唯一副本：自动保存照常，但本地暂存不写、不清、不迁移（`createLocalDraftStash(held)`）；新建页在此期间已创建文章时，选"恢复"把暂存从 `new` 迁到新 id |
| 离开拦截 | `dirty`/`saving`/`failed` 时注册 `beforeunload` |
| 发布前 | 点击发布 / 发布更新时先 flush（立即保存并等待），再调用 `/publish` |

> 已实现（Sprint 1）：`src/lib/autosave/controller.ts`（状态机）+ `useAutosave.ts`。已实现（Sprint 2）：本地暂存与恢复判断——`src/lib/autosave/local-draft.ts`（写入节流 500ms、写入时才读取内容；新建 new → id；控制器 `stash` 选项）、`RestoreBanner`；删除期间 `disable` / `enable`。401：控制器同步写入暂存后通知页面，页面（含发布 401）跳 `/admin/login?next=当前路径`、放行离开确认（已实现，`src/lib/dom/navigate.ts` 便于测试替换）。

## 3. 预览（`MarkdownPreview`）

| 项 | 规则 |
|----|------|
| 渲染触发 | 源码变化即发给 Web Worker（不 debounce）；渲染中又有输入时只保留最后一次，上一次完成后再发，只采用最新 seq 的结果（长文连续输入不排队）。已实现：`src/components/admin/editor/MarkdownPreview.tsx` |
| 注入 | `innerHTML` 替换正文容器，然后按 `ImageRef` 挂载：`[data-article-image]` → `ArticleImage`、`[data-gallery]` → `ImageGallery`、`[data-upload-placeholder]` → `UploadCard`（按 `data-placeholder-index` 取槽位；同一槽位跨渲染复用实例，进度动画不重置） |
| 图片菜单实况项 | 打开单图菜单时，`marks.live` 或图片为站内 key 才调用 `hasLiveVideo(src)`；检查中不显示"实况"，结果为 true 时显示，勾选状态 = `marks.live` |
| 复用 | `reconcileIslands`：以 `src + marks` 为键复用已挂载的 React root（保持加载状态），新增的挂载、消失的 `unmount`（UT-140） |
| 同步滚动 | 源码 textarea 用隐藏镜像元素（`src/lib/editor/textarea-mirror.ts`，拖放落点换算已在用）算出每行的 `offsetTop`；预览按 `data-line` 建立映射；两侧滚动按行插值；防回声：记下写给另一侧的 scrollTop，那一侧下一次滚动事件落在该值上即忽略（不用定时锁，避免吞掉作者对另一侧的真实滚动）。已实现：`src/lib/editor/scroll-sync.ts`（`lineTops` 在 `textarea-mirror.ts`），仅并排视图启用 |
| 图片菜单 | `ImageMenu` 收到 `ImageRef.sourceStart/End` 与 `src`；执行前核对 `text.slice(start, end)` 中包含该 `src`，否则放弃（UT-136） |

## 4. 设置与发布

| 项 | 规则 |
|----|------|
| slug 跟随 | 页面内存中的 `slugTouched` 标记，不持久化：用户编辑过 slug 输入框后为 true；打开已有文章时，`slug !== slugify(title)` 即视为改过（US-03-3） |
| 标签补全 | 输入 debounce 200ms → `GET /api/admin/tags?q=` |
| 封面（F-002 US-06，已实现） | `CoverField`：选择 / 拖入单个文件 → `validateFile` → `fileToItem`（动态照片只取 `still`，丢弃视频）→ `measureImage`（宽高、主色）→ `uploadImage`（无视频字段）→ `onChange(url)`；上传失败保留原值并显示错误；移除 `onChange(null)`。`cover` 是工作稿字段之一：进入自动保存请求体与本地暂存；旧版本地暂存缺 `cover` 时按 `null` 补齐 |
| 发布结果 | 200 → 更新徽标与主按钮，`Toast/Success`；422 → 打开抽屉、聚焦首个缺失字段、`Toast/Error` 列出缺失项；409 → slug 字段错误。已实现：`src/components/admin/editor/PublishActions.tsx`（发布、发布更新及置灰；`UnpublishAction` 撤回为草稿） |

## 5. 单元测试

见 [frontend-unit-tests.md](../../../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) §4 – §7、§9 – §13。新增：

| UT-ID | 用例 | 预期 |
|-------|------|------|
| ED-UT-01 | `applyEdit` 在 jsdom 中 `execCommand` 返回 false | 退回 `setRangeText`，文本与选区正确，派发一次 `input` |
| ED-UT-02 | 自动保存状态机（fake timers + fetch mock）：保存中再编辑；401；409；连续失败退避 | 状态序列与 §2 一致；401 时写入本地暂存并调用跳转；409 不重试 |
| ED-UT-03 | 占位按顺序定位：3 个占位，在第 1 个之前插入 1000 字后，第 2 个任务先完成 | 只替换第 2 个占位，其他内容不变 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-14 | 1.3 | 401 跳转已实现 | miraclehifi |
| 2026-10-14 | 1.2 | §2 本地暂存、恢复判断已实现 | miraclehifi |
| 2026-10-14 | 1.1 | §3 同步滚动已实现；防回声由 50ms 锁改为按写入值识别 | miraclehifi |
| 2026-10-15 | — | F-002：设置抽屉封面 `CoverField`；`cover` 进入自动保存与本地暂存 | miraclehifi |
| 2026-10-16 | 1.4 | 上传占位改为槽位模型（绑定 / 空槽位，支持"上传失败"占位与刷新后的孤立占位）；预览挂载 `UploadCard`；`toggleMark` 支持 `live`；菜单实况项检查（[media-upload-experience](../../../../backlog/media-upload-experience.md)） | miraclehifi |
| 2026-10-19 | 1.x | 粘贴 Afilmory 照片；外链照片的菜单实况项（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | miraclehifi |
