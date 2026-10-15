# 验证报告：F-001 文章写作

**验证日期**: 2026-10-15 首次；2026-10-16 Sprint 5 后重新验证
**范围**: Sprint 1–3（72 + 18 + 14 个任务）、Sprint 5（P0 验收测试补齐，4 个任务），连同 Sprint 4 对 F-001 的增量（封面、Deploy Hook），与 F-002 一起验证
**环境**: 本地（Windows 11，Node 24.21，Astro 7.3 + `@astrojs/cloudflare` 14，workerd 本地运行）；未做本地前端联调（作者决定）

## 摘要

| 项 | 结果 |
|----|------|
| 验收用例 | 256 个（另有 5 个随去掉 HEIC / iPhone 删除）：已覆盖 189（73%）、部分覆盖 49（19%）、无测试 10（3%，无 P0）、线上 / 人工 8（3%），见 [traceability](traceability.md) |
| 全量回归（Sprint 5 后） | lint 0、check 0；`npm test` 121 个文件 / 331 个用例全过 |
| E2E（Sprint 5 后） | 315 通过 / 6 失败（全为 WebKit 负载超时，2 个 worker 重跑 6 / 6）/ 5 跳过；计时 4 / 4 |
| playwright-skill UI 脚本 | 登录 7 / 7、编辑器 6 / 6、文章列表 8 / 8 |
| 结论 | **通过（带已知风险）**：P0 用例全部有测试并通过；剩余缺口按作者决定记为已知风险 |

## 首次验证（2026-10-15）

现有测试全部通过，但追溯发现 18 个用例无测试（4 个 P0：TC-US01-31、TC-US01-33、TC-US03-22、TC-US06-26）、54 个部分覆盖，部分验收期望值在 design-domain 后没有同步。作者决定：只补 P0 并同步验收文档，其余记为已知风险后发布。由此开 [Sprint 5](../../../../tasks/sprint-5/_index.md)（[f001-p0-test-gaps](../../../../backlog/f001-p0-test-gaps.md)）。

首次验证时还漏跑了 Sprint 1 生成、任务记录写明"verify 阶段运行"的 3 个 playwright-skill 脚本（`../e2e/playwright-test-{login,editor,post-list}-ui.js`），导致 TC-US01-29～34、TC-US03-17～26、TC-US07-12～20 中多条被误记为无测试或部分覆盖。

## Sprint 5 后重新验证（2026-10-16）

### 补齐的 P0 用例

| 用例 | 测试 | 结果 |
|------|------|------|
| TC-US01-31 提交中按钮禁用、连击只发 1 次请求 | `tests/e2e/login.spec.ts` | chromium + webkit 通过 |
| TC-US01-33 密码错误：提示、清空密码、保留账号、按钮回到禁用 | `tests/e2e/login.spec.ts` | 通过 |
| TC-US03-22 非法 slug 行内提示、不被保存、改回后提示消失 | `tests/e2e/editor-slug-conflict.spec.ts` | 通过 |
| TC-US06-26 未保存 / 保存中离开触发 `beforeunload`，取消后内容保留（关闭、后退、保存中关闭三种） | `tests/e2e/editor-autosave.spec.ts` | 通过 |

4 项行为原本都已实现，补测试时没有发现缺陷。

### playwright-skill 脚本补跑

脚本写于 Sprint 1，补跑时有两处过时，已修正：请求体缺 F-002 新增的必填字段 `cover`（PUT 缺字段返回 400，造数据静默失败）；Sprint 2 起列表行是 `role="listitem"` 的 `div`，不再是 `<li>`。修正后 21 / 21 通过。

### 验收文档同步

US-01、03、06、07、08 共 5 份验收文档中过时的期望值已改为现行契约（登录失败文案、空标题存为"无标题"、标题 200 / slug 80 上限、slugify 先 NFKD、发布缺字段 422 `MISSING_FIELDS`、PUT 提交整份工作稿、标签包含匹配、保存中有新编辑则完成后立即再存、列表条目不含 slug 等），详见 [sync-f001-acceptance-expectations](../../../../tasks/sprint-5/sync-f001-acceptance-expectations.md)。

## 全量回归、跨 Feature 集成、E2E

首次验证的全量结果、跨 Feature 链路（发布触发重建、写作到读者可见、封面、引用署名、首屏主题）见 [F-002 验证报告](../../F-002-博客首页与阅读/validation/validation-report.md)。Sprint 5 后的回归结果见上方摘要。

## NFR

| 要求 | 验证 | 结论 |
|------|------|------|
| 密码不可逆哈希、Secrets 注入 | `password.test.ts`（PBKDF2 加盐格式）；仓库与 Secrets 需人工核对（TC-US01-37） | 自动化部分通过 |
| 会话 Cookie `HttpOnly` / `SameSite=Lax` / 线上 `Secure` | `login.spec.ts`、`login-endpoint.test.ts` | 通过（HTTPS 跳转属部署配置） |
| 写接口校验会话与 Origin | `middleware.test.ts`（24 种组合） | 通过；部分变体缺测，见已知风险 |
| 登录限流 5 次 / 15 分钟，并发不绕过 | `throttle*.test.ts`（含 code-review 新增的并发用例） | 通过 |
| 预览 300ms 内更新 | TC-US04-09 计时用例 | 通过 |
| 写作接口 P95 < 500ms | 需线上 Cloudflare 日志（TC-US03-16、TC-US06-21、TC-US08-16 等） | 上线后看 |

## 已知风险（作者决定发布前不补）

### 无测试（10 个，均为 P1 / P2）

| 用例 | 说明 |
|------|------|
| TC-US01-09 | 超长账号 / 密码：已实现截断（64 / 256，超长直接 401 不哈希），没有测试 |
| TC-US04-08、TC-US04-11 | 长文连续输入不卡顿；空正文预览占位 |
| TC-US06-03、06、10、29 | 持续输入重置防抖；双标签页后写覆盖；空白新建页离开不产生草稿；防抖中 Ctrl+S 只保存 1 次 |
| TC-US08-11、12、18 | 发布 / 更新 / 撤回失败时状态不变并提示；发布进行中按钮禁用、防重复提交 |

### 部分覆盖（49 个）

主要结果都有测试，缺少用例里列出的部分边界或变体，集中在：开放重定向与 Origin 的变体、篡改 Cookie、注入类输入、分页与筛选的组合、"失败后读回原值"。逐条见 [traceability](traceability.md)"缺口明细"。

### 线上 / 人工（8 个）

性能 P95（需线上日志）、伪造 `X-Forwarded-For`（需经 Cloudflare 边缘）、Secrets 与仓库人工核对、发布到读者可见 ≤ 5 分钟（需线上重建）。

## 建议

可以与 F-002 一起发布。上线后补测：写作接口 P95、发布到可见时长、TC-US01-37 人工核对。已知风险里的 P1 用例（尤其是发布失败与防重复提交 TC-US08-11、18）建议放进下一个 Sprint。
