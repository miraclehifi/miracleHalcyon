# 代码审查报告：F-006 媒体存储清理

## 摘要

- 审查日期：2026-10-27
- 审查范围：Sprint 7 共 4 个任务（孤儿检测接口、孤儿清理接口、`/admin/storage` 页面、清理流程），代码随提交 387d310 合入，按当前 HEAD 审查。约 20 个源码与测试文件
- 方式：单人模式。由子代理只读审查，主会话复核了 MUST-FIX
- MUST-FIX：1 项（规格文档损坏，非 F-006 引入；已修复）
- CONCERN：11 项（记入 [storage-review-followups](../../../../backlog/storage-review-followups.md)）
- POSITIVE：11 项

重点核查的是误删风险，结论是代码里没有误删缺陷：

- 孤儿判定只从 `images` 表出发，不扫描 R2。F-005 书影音封面（`covers/`）和 F-001 Afilmory 外链都不会进入候选。
- 清理接口不读请求体，每次都在服务端重新判定。客户端无法指定要删除哪个 key。

## 审查维度

### 1. 安全

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/media/storage.ts:88` | `cleanupOrphans` 每次都重新执行 `listAll → classify`，接口不接收 key 列表；可删对象只有 `images.key` / `video_key`，都是 `img/` 前缀 | POSITIVE | — |
| `src/middleware.ts:63-74` | POST 要求有会话，且 Origin / Referer 必须等于 `SITE_ORIGIN`；`storage-cleanup-api.test.ts` 覆盖 401、403 | POSITIVE | — |
| `storage.ts:23,29` | 查不到判定结果的图片按"在用"处理 | POSITIVE | — |

### 2. 边界条件

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/domains/post/image-reference-query.ts:20-33` | 判定时扫描 `body`、`pub_body`、`cover`、`pub_cover` 四列，草稿、已发布快照、封面都算引用；按 key 主干匹配，扩展名不同也算引用，偏保守 | POSITIVE | — |
| `storage.ts:91-98` | 先删 R2 再改 D1，中途失败时 D1 记录还在，重跑可以接着删；R2 按 1000 个一批删除，D1 用 `json_each` 单参数批量处理，避开 100 个绑定参数的上限 | POSITIVE | — |
| `storage.ts:32` | `created_at` 解析为 NaN 时被当作已过保护期（当前一律写 `toISOString()`，实际不触发） | CONCERN | 待跟进 |
| 读者页预渲染 | 发布更新删掉旧图后，若在重建完成前清理，线上旧页面会短暂坏图 | CONCERN | 待评估 |
| 本地草稿 | 只存在于浏览器本地草稿 / 撤销栈、超过 24 小时的图片会被判为孤儿（规格已写明清理不可撤销） | CONCERN | 待评估 |
| ADR-009 | 判定和删除不在同一事务中，存在毫秒级竞态窗口，ADR 已认可；"检测后又插回文章的图片不删"有测试 | POSITIVE | — |

### 3. API 契约对齐

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| 两个 storage 接口 | 字段、错误码、"无候选时返回 0/0/0 且不调用 R2"均与 media api-contract、domain-model §9 一致 | POSITIVE | — |
| `specs/engineering/backend/domains/media/api-contract.md` | 第 147 行 Afilmory `id` 正则在 `{1,64}` 处被截断，后面把整份文件从标题起重复了一遍（第 148–286 行），storage 两个接口各出现两次。由 c098a7f 引入：字符串替换时 `` $` `` 被当成"匹配之前的内容"插入 | MUST-FIX | 已修复 |

### 4. 错误处理

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `StoragePage.tsx:65-74` + `ConfirmDialog` | 确认中按钮禁用，Esc / 遮罩关不掉；结束后关闭对话框并自动重新检测；确认框用检测时的数字，结果提示用接口返回值 | POSITIVE | — |
| `storage-client.ts`、`StoragePage.tsx:68` | 会话过期 401 只提示"检测失败 / 清理未完成"，不跳登录页 | CONCERN | 待跟进 |
| `StoragePage.tsx:67` | 重新判定后无可清理项时提示"已清理 0 项，释放 0 B" | CONCERN | 待跟进 |
| `cleanup` 接口 | 部分失败只返回 500 `CLEANUP_FAILED`，看不出已删多少（与契约一致） | CONCERN | 待跟进 |

### 5. 依赖

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| — | 无新增 npm 依赖 | POSITIVE | — |

### 6. 架构一致性

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `storage.ts` | media 只通过 `ImageReferenceQuery` 只读接口判断引用，不直接读文章表，符合 ADR-009；依赖经构造参数注入 | POSITIVE | — |
| `src/pages/api/admin/storage/cleanup.ts:4` | 从另一个路由文件 `orphans.ts` 导入 `storageServiceFor` | CONCERN | 待跟进 |

### 7. 代码质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `storage.ts` | `classifyOrphans`、`summarize` 是纯函数，注释写明设计理由，没有多余代码 | POSITIVE | — |

### 8. 测试质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `tests/integration/media/storage-*`、`tests/unit/media/storage-classify.test.ts` 等 | 覆盖判定决策表、保护期 ±1ms、四列引用与各种写法、重新判定、失败后重入、分批、安全、300 篇文章 / 3000 张图片性能；E2E 对会删数据的接口打桩，避免删掉共享本地存储里的夹具 | POSITIVE | — |
| — | 缺少"图片只出现在 `pub_cover`"的用例 | CONCERN | 待跟进 |
| `storage-fixtures.ts:72-75` | `clearAll` 没有处理 `MEDIA.list` 分页 | CONCERN | 待跟进 |

## MUST-FIX 修复记录

| # | 维度 | 问题 | 修复方式 | 回归结果 |
|---|------|------|---------|---------|
| 1 | API 契约 | media api-contract.md 截断并重复整份文件 | 补全正则为 `^[A-Za-z0-9_-]{1,64}$`，删除第 148–286 行的重复块（与第 1–140 行逐行一致），Afilmory 小节的 200 和错误码表接回原位 | 纯文档，无代码影响；章节结构恢复为 POST images / GET img / orphans / cleanup / afilmory / 变更历史 |

## 结论

通过。代码没有 MUST-FIX；1 项规格文档 MUST-FIX 已修复。CONCERN 不阻塞 verify，已记入 Backlog。F-006 已于 2026-10-19 随版本 31b8f50c 上线，可直接进入 verify。
