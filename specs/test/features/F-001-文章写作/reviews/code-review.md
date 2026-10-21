# 代码审查报告：F-001 文章写作

## 摘要

> 2026-10-21 增量审查（Sprint 8 Afilmory 外链照片）见文末"增量审查"一节。

- 审查日期：2026-10-15
- 审查范围：Sprint 1–3（72 + 18 + 14 个任务），连同 F-002 Sprint 4 对 F-001 的增量（封面、发布后重建钩子）一起审查
- 方式：单人模式结构化自审。审查与修复在一个并行会话中完成，修复当时留在工作区未提交；接手后补记本报告，补齐类型检查与测试替身，并跑完回归
- MUST-FIX：6 项（均已修复）
- CONCERN：3 项（1 项已修复，2 项保留）
- POSITIVE：6 项

## 审查维度

### 1. 安全

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/auth/service.ts`、`throttle-repo.ts` | 登录限流先读状态、比对完再写回：同一 IP 并发发出的请求都会读到"未锁定"，绕过 5 次锁定 | MUST-FIX | 已修复 |
| `src/domains/auth/service.ts` | 账号不论对错都比对一次密码，账号比较用 SHA-256 摘要（耗时与长度无关）；超长凭据不做哈希 | POSITIVE | — |
| `src/domains/auth/session-repo.ts` | 会话只存 token 的哈希，不滑动续期 | POSITIVE | — |
| `src/domains/media/service.ts` | 按文件头判定真实类型，不信任扩展名与 `Content-Type` | POSITIVE | — |

### 2. 边界条件

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/post/repo.ts`、`service.ts` | slug 唯一检查与写入分两步：两个请求同时写同一 slug 都能成功（跨列"工作稿 = 他人快照"没有唯一索引兜底） | MUST-FIX | 已修复 |
| `src/domains/media/service.ts` | 上传时把整个图片和视频复制成 `Uint8Array`：50MB 图片 + 视频时，加上表单解析那一份，内存逼近 Workers 单个 isolate 的 128MB 上限 | MUST-FIX | 已修复 |
| `src/lib/upload/upload-client.ts` | 上传固定 60 秒超时，从发请求时起算，包含上传请求体的时间：慢网络传大文件（手机热点 5 Mbps 传 40MB）会被中途中断 | MUST-FIX | 已修复 |
| `src/lib/autosave/local-draft.ts`、`PostEditorPage.tsx` | 恢复横幅还没处理时继续输入：新暂存覆盖旧暂存，保存成功后又把它清掉，作者点"恢复"时本地版本已经没了 | MUST-FIX | 已修复 |
| `src/lib/upload/use-image-uploads.ts` | 作者删掉中间某个上传占位后，占位数与任务数对不上，其余所有任务完成时都不再替换占位 | MUST-FIX | 已修复 |
| `src/components/admin/editor/TagInput.tsx` | 粘贴"a, b, c"时没有经过逗号键，三个标签合成了一个 | CONCERN | 已修复 |

### 3. API 契约对齐

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/pages/api/admin/posts/*` | 错误码（`SLUG_TAKEN`、`POST_NOT_FOUND`、`VALIDATION_FAILED` 等）与 api-contract 一致；修复后并发冲突同样返回 409 `SLUG_TAKEN` | POSITIVE | — |

### 4. 错误处理

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/post/service.ts` | 条件写入未生效时再查一次 `slugTaken`，区分 `SLUG_TAKEN` 与 `POST_NOT_FOUND`（`writeFailed`），不会把并发冲突误报成 404 | POSITIVE | — |
| `src/domains/media/service.ts` | R2 / D1 任一步失败都回滚已写入的对象 | POSITIVE | — |

### 5. 依赖

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `package.json` | Vitest 锁在 4.1（5.x 配 Cloudflare vitest-plugin 在 Windows 上不可用），原因已记录 | CONCERN | 保留，上游修复后再升 |

### 6. 架构一致性

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/*` | 分层与依赖方向符合 architecture：路由 → service → repo 接口 → D1 / R2 实现；限流与 slug 的并发保证下沉到仓储，服务层只表达规则 | POSITIVE | — |

### 7. 代码质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/lib/editor/format-commands.ts` | 仍用已弃用的 `document.execCommand` 改写 textarea（为了保留原生撤销，目前没有替代 API），`astro check` 报 6 条提示 | CONCERN | 保留，有意为之 |

### 8. 测试质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `tests/unit/post/memory-post-repo.ts` | 内存仓储注释写"行为与 D1PostRepo 一致"，但写入时没有 slug 条件 | MUST-FIX 附带项 | 接手时已对齐 |
| 每项 MUST-FIX | 都补了先红后绿的测试（见下表），并发类用 `Promise.all` 真实打到 D1 | — | — |

## MUST-FIX 修复记录

| # | 维度 | 问题 | 修复方式 | 测试 |
|---|------|------|---------|------|
| 1 | 安全 | 登录限流并发绕过 | `ThrottleRepo.reserve`：比对前先原子计一次失败（D1 `batch` 中 SELECT + UPSERT，SQL 版 `nextThrottleState`），成功时删除；auth domain-model §4、§5 同步 | `tests/integration/auth/throttle-repo.test.ts` |
| 2 | 边界 | slug 并发写入 | `insert` / `updateDraft` / `setPublished` 的语句自带 `NOT EXISTS` 条件，检查与写入原子完成；`insert` 可返回 `null`；post domain-model §5、data-model 同步 | `tests/integration/post/slug-race.test.ts`（TC-US03-09）、`publish-endpoint.test.ts` 调整 |
| 3 | 边界 | 上传内存峰值 | 只读前缀嗅探（JPEG 找不到 SOF 时逐步扩到 1MB、8MB、整个文件），R2 直接收表单里的 `Blob`；media domain-model upload 流程同步 | `tests/integration/media/upload-memory.test.ts` |
| 4 | 边界 | 上传超时过短 | `uploadTimeoutMs(bytes)` = 60 秒 + 按 256 KiB/s 计的传输时间（50MiB 约 4 分 20 秒） | `tests/unit/upload/upload-client.test.ts` |
| 5 | 边界 | 横幅期间丢本地暂存 | `createLocalDraftStash(held)`：横幅未处理时不写、不清、不迁移；新建页期间已建文章时，恢复时把暂存迁到新 id；editor module-spec §2 同步 | `tests/unit/admin/local-draft.test.ts`、E2E TC-US06-13 |
| 6 | 边界 | 删中间占位后其余失效 | `removedPlaceholders` 按删除区间定位被删的任务并移出列表；自身改写不计入；editor module-spec §1 同步 | `tests/unit/upload/upload-queue.test.tsx` |

## 回归结果（2026-10-15）

- `npm run lint`：0 问题；`npm run check`：0 错误 0 警告（6 条 `execCommand` 弃用提示）
- `npm test`：121 个文件 / 331 个用例全过
- `npm run test:e2e`：两个 Feature 一起跑，F-001 相关用例 chromium 全过；WebKit 的 TC-US06-07、TC-US09-02、TC-US10-09、TC-US12-10 / 11 / 12、TC-US11-23、Sprint 1 主干、TC-US09-14 为全量并行负载下超时，单独重跑全部通过（详见 [F-002 审查报告](../../F-002-博客首页与阅读/reviews/code-review.md)"回归结果"）

## 结论

通过。6 项 MUST-FIX 已修复，回归通过。下一步 verify。

---

## 增量审查：Sprint 8 Afilmory 外链照片（2026-10-21）

- 范围：[afilmory-photo-embed](../../../../backlog/afilmory-photo-embed.md)（US-13，[Sprint 8](../../../../tasks/sprint-8/_index.md) 6 个任务）；源码新增 7 个文件、修改 15 个，测试新增 11 个文件（含夹具）、修改 4 个
- 先于本次做过一轮轻量审查（3 项已修，见 Sprint 8"审查修复"），本次按 8 个维度完整复查
- MUST-FIX：1 项（已修复）· CONCERN：6 项 · POSITIVE：6 项

### 1. 安全

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `plugins/external-photo.ts` | 前缀判断基于 `new URL` 规范化后的 href，`..` / `%2e` 点段、前缀子串（`main.evil/`）、带用户名的伪装地址都不通过；`data-*` 值只来自正则解析出的数字、十六进制与推导地址，插件在 sanitize 之后执行 | POSITIVE | — |
| `pages/api/admin/afilmory/photos/[id].ts`、`domains/media/afilmory.ts` | 只请求登记站点 `{site}/photos/{id}`，id 白名单 `^[A-Za-z0-9_-]{1,64}$`，`redirect: "manual"`、10s 超时，不能被当成任意网址的代理；会话由 middleware 覆盖（集成测试验证 401） | POSITIVE | — |
| `lib/afilmory/paste.ts` | 只识别整段文本，夹带文字、其他站点、非 `/share/embed.js` 的 script 一律按普通文本；不执行 embed.js | POSITIVE | — |
| `external-media.ts` | 跨域 `fetch` 默认不带凭据；读者向 GitHub 发请求会带文章页 Referer，与普通外链图片相同 | CONCERN | 接受 |

### 2. 边界条件

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `live-photo.tsx` | **HEVC 判断用 `codecs="hvc1"` 简写：能硬解 HEVC 的 Chromium 对简写返回空串、对带 profile 的字符串返回 probably（WebKit 两者都认）**——Chrome 用户全部看不到外链实况。测试环境掩盖了问题：Playwright WebKit 认简写，自带 Chromium 本来就不支持 HEVC | **MUST-FIX** | 已修复 |
| `use-image-uploads.ts` | 一次粘贴的 id 数量不设上限，每个 id 各发一次请求、服务端各抓一次相册页（整本清单）；只有登录作者能触发 | CONCERN | 接受（作者自用，正常 1–9 张） |
| `external-media.ts` | 服务端忽略 Range 回 200 时，主图会下载整个原图（含视频）；GitHub raw 实测支持 Range | CONCERN | 接受 |
| `ImageGallery.tsx` 手风琴 | 主图解码失败不回退缩略图（第三方组件只收地址，网格与单图已回退） | CONCERN | 接受 |

### 3. API 契约对齐

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `[id].ts` | 200 字段、400 / 404 / 502 / 500 的 code 与 message 与 [media api-contract](../../../../engineering/backend/domains/media/api-contract.md) 一致；地址编码用 `new URL().href`（与契约的 `encodeURI` 等价，且不重复编码） | POSITIVE | — |
| `lib/afilmory/client.ts` | 前端信任 200 响应的结构，未做字段校验（来源是本站接口，服务端已校验） | CONCERN | 接受 |

### 4. 错误处理

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `client.ts` → `use-image-uploads.ts` | 接口错误统一转 `UploadError`，卡片显示接口文案；网络错误"网络中断"；401 走会话过期；主图 / 视频读取失败都退回静态图、不弹错（BH-10、BH-12） | POSITIVE | — |

### 5. 依赖

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `package.json` | 新增 `thumbhash` ^0.1.1（MIT）；构建产物核对：只在服务端路由 chunk，浏览器包没有（客户端只 `import type`） | POSITIVE | — |

### 6. 架构一致性

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| 全部 | 与 ADR-010 一致：扩展片段只在登记前缀下生效、渲染仍为纯函数（同构快照不变）、读者页仍预渲染（构建检查通过）、外链不进 R2 / D1；文件上传与外链照片共用占位槽位与卡片 | — | — |
| `lib/afilmory/markdown.ts` | 前端从 `domains/media/afilmory.ts` 引用 `AfilmoryPhotoInfo` 类型（仅类型，不进包），依赖方向为前端 → 服务端领域模型 | CONCERN | 接受（避免两份定义；若以后拆共享类型再移） |

### 7. 代码质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `use-image-uploads.ts` | 拆出 `start` 时函数体多缩进一层 | — | 已修正（格式） |
| 全部 | 文案为中文硬编码：本项目为单语中文站点，无 i18n 机制，与既有代码一致 | — | 豁免 |

### 8. 测试质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| 单元 / 集成 / E2E | 外部服务全部打桩（照片存储按 Range 切片返回 206、照片信息接口按 id 回放）；夹具取自真实页面；14 条验收用例都有对应测试 | POSITIVE | — |
| `afilmory-photos.spec.ts` TC-US13-11 | Windows 版 Playwright WebKit 不能播放 blob 视频，WebKit 上只验证"读一次、失败后退回"；真实播放只有单元测试覆盖。HEVC 判断的 MUST-FIX 也是测试环境没能暴露的同一类缺口 | CONCERN | 接受；verify 时建议在真实 Chrome / Safari 手动看一次外链实况 |

### MUST-FIX 修复记录

| # | 维度 | 问题 | 修复方式 | 回归结果 |
|---|------|------|---------|---------|
| 1 | 边界条件 | HEVC 判断用简写 `hvc1`，Chrome 返回空串 | 先加单元用例（模拟"简写为空、带 profile 为 probably"，红）→ 改为检查带 profile 的 Main（`hvc1.1.6.L150.90`）/ Main 10（`hvc1.2.4.L180.B0`，样本 18369 实为 Main 10、level 6.0），任一可播即支持 → 绿；完整版 Chromium 实测上述字符串均为 probably | 单元 26 个文件 111/111；lint 0；check 0；`afilmory-photos` + `live-photo-playback` chromium + webkit 26 通过、3 跳过、1 失败（TC-US11-23 WebKit，单 worker 连跑 2 次均通过；同文件 TC-US11-25 为 Sprint 6 已记录的不稳定用例） |

### 结论

通过。1 项 MUST-FIX 已修复并回归；6 项 CONCERN 均为已知取舍或低风险，不阻塞 verify。
