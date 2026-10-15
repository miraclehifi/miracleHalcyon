# 验证报告：F-002 博客首页与阅读

**验证日期**: 2026-10-15
**范围**: Sprint 4（21 个任务），与 F-001 一起验证（两个 Feature 共用一套回归）
**环境**: 本地（Windows 11，Node 24.21，Astro 7.3 + `@astrojs/cloudflare` 14，workerd 本地运行）；未做本地前端联调（作者决定，自动化 E2E 已覆盖完整旅程）

## 摘要

| 项 | 结果 |
|----|------|
| 验收用例 | 83 个：已覆盖 82，上线后实测 1（TC-US03-10），见 [traceability](traceability.md) |
| 全量回归 | `npm test` 121 个文件 / 331 个用例通过（全量并行时 markdown 同构快照 1 个已知竞态失败，单独重跑通过） |
| 构建产物检查 | `npm run test:build` 5 / 5 |
| E2E | 296 通过 / 13 失败（全部 WebKit，单独重跑通过）/ 5 跳过；计时项目 4 / 4 |
| NFR | 首页达标；`/posts`、文章页本地 LCP 超标，原因是本地 preview 不压缩，需上线后复测 |
| 结论 | **本 Feature 通过**；上线后补 2 项实测。发布需与 F-001 一起（读者端内容来自 F-001 的后台写作），F-001 尚有测试缺口，见 [F-001 验证报告](../../F-001-文章写作/validation/validation-report.md) |

## 全量回归

- `npm run lint`：0 问题；`npm run check`：0 错误（6 条 `execCommand` 弃用提示）
- `npm test`（Vitest 4.1：unit jsdom + workers workerd / D1 / R2）：首轮 330 / 331，失败的是 `tests/unit/markdown/isomorphic.test.ts`（unit 写快照、workers 同时读的原有竞态，Sprint 4 统一测试时已记录），单独重跑 1 / 1 通过
- `npm run test:build`（真实构建，读者夹具）：5 / 5——静态路由齐全、不含草稿与已撤回文章、Worker 包不含读者数据与 Shiki、首页 / 404 / 无图文章不加载 React、空数据构建

## 跨 Feature 集成

| 链路 | 覆盖测试 | 结果 |
|------|---------|------|
| F-001 发布 / 撤回 / 删除 → 触发读者页重建（Deploy Hook） | `tests/unit/rebuild/deploy-hook.test.ts`、`tests/integration/post/rebuild-hook.test.ts`（发布 / 撤回 / 删除路由） | 通过 |
| F-001 写作 → 发布 → 读者端可见 → 撤回后不可见 | `tests/e2e/mainline-journey.spec.ts`（chromium + webkit） | 通过 |
| F-001 封面字段 → 读者卡片封面 | `tests/integration/post/cover.test.ts`、`tests/e2e/reader-post-card.spec.ts` | 通过 |
| F-001 markdown 引用署名 → 预览与读者页一致 | `tests/unit/markdown/quote-attribution.test.ts`、`reader-typography.spec.ts` | 通过 |
| F-001 `BaseLayout` 首屏主题脚本 → 编辑器与读者页主题一致 | `tests/e2e/reader-theme.spec.ts` | 通过 |

## 前后端集成

未做本地前端联调（2026-10-15 作者决定）。接口层由 workers 集成测试覆盖（真实 D1 / R2 绑定），E2E 在 `astro preview`（workerd）上跑。

## E2E（Playwright，chromium + webkit）

`npm run test:e2e` 全量：296 通过 / 13 失败 / 5 跳过 / 4 未运行（计时项目因依赖失败未运行）。

| 处理 | 用例 | 结果 |
|------|------|------|
| 失败重跑（webkit，2 个 worker） | TC-US06-07、TC-US09-02 / 12 / 新建不显示删除、TC-US06-18、TC-US12-10 / 12、TC-US11-23、Sprint 1 主干、灯箱 TC-US10-03 / 04 / 05+06 / 07 | 20 / 21 通过；TC-US06-07 首次冷启动超时，单独连跑 3 次 2 次通过（Sprint 4 统一测试时已记录为负载超时） |
| 计时项目单独跑（`--no-deps`） | TC-US04-09、TC-US09-16（两个浏览器） | 4 / 4 |

本 Feature 的 UI 交互用例都通过真实点击、键盘、触屏操作执行，没有用 `force` 或 JS click。灯箱是模态对话框：遮罩、Esc 关闭、焦点陷阱、关闭后焦点回原图都有断言（TC-US10-07、TC-US10-09）。目录抽屉用原生 `<dialog>`（TC-US08-07）。

## NFR

Lighthouse 13.5，移动端模拟（慢速 4G + 4× CPU），本地 `astro preview`（读者夹具数据）：

| 页面 | Performance | LCP | CLS | TBT | 目标 | 结论 |
|------|------------|-----|-----|-----|------|------|
| `/` | 91 | 1.5 s | 0 | 0 ms | ≥ 90、< 2.5 s | 通过 |
| `/posts` | 92 | 3.3 s | 0 | 0 ms | 同上 | LCP 本地超标 |
| `/posts/hello`（12 张图的长文） | 79 | 4.4 s | 0 | 60 ms | 同上 | 本地超标 |

- 两页的 LCP 元素都是文字（卡片摘要、正文首段），唯一的渲染阻塞资源是 `ReaderLayout.css`：本地 preview 不压缩，传输 88KB；gzip 后为 16.7KB，线上 Cloudflare 会自动压缩。本地数字偏悲观，**上线后用线上地址复测**；若仍超标，再评估拆分 CSS 或内联关键样式
- "无交互页面不加载 React"：`test:build` 已验证
- 重建 P95 ≤ 5 分钟（TC-US03-10）：只能在线上发布后实测

## 发现的问题

1. 灯箱懒加载后，首次打开时焦点要晚约 100ms 才移进灯箱（WebKit），这段时间内按 Esc 无效：已在 code-review 阶段修复（MUST-FIX 4）
2. WebKit 在全量并行负载下会出现超时（每轮 6–13 个，单独重跑都能通过），属于测试环境问题；用例本身没有断言错误

## 建议

本 Feature 通过，发布时机跟随 F-001。上线后补测：① TC-US03-10 发布到可见的时长；② 线上地址重跑 Lighthouse（`/posts`、文章页）。
