# 代码审查报告：F-001 文章写作

## 摘要

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
