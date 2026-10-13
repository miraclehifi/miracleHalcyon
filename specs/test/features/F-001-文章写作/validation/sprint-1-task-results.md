# Sprint 1 任务测试结果

**Feature**: F-001 文章写作
**最后更新**: 2026-10-13

> implement 阶段每完成一个任务追加一行；verify 阶段的系统级结果另行记录。

| 日期 | 任务 | 变更点测试 | 红 | 绿 | 影响范围回归 | Lint / 类型检查 |
|------|------|-----------|----|----|-------------|----------------|
| 2026-10-13 | scaffold-project-skeleton | `tests/e2e/smoke.spec.ts`（chromium、webkit） | 404 ≠ 200（2 失败） | 2/2 通过 | 无（新建代码） | lint 0；astro check 0 错误 |
| 2026-10-13 | setup-workers-test-pool | `tests/integration/pool.test.ts`（workerd：D1 SELECT 1、R2 put/get） | 找不到 `cloudflare:workers`（未在 workerd 中运行） | 1/1 通过 | e2e 冒烟 2/2 通过 | lint 0；astro check 0 错误 |
| 2026-10-13 | spike-markdown-workers-runtime | `tests/spike/markdown-workers.test.ts`（workerd：`.expressive-code` 结构 + 着色 span + 热渲染 < 50ms） | 找不到 `src/lib/markdown/render` | 1/1 通过（热 1–2ms）；另以 `astro build` + `astro preview` 实测通过，合并包 gzip 2,299 KiB | pool.test.ts 1/1 通过 | lint 0；astro check 0 错误 |
| 2026-10-13 | spike-markdown-browser-worker | `tests/spike/markdown-browser.spec.ts`（Playwright chromium + `astro dev`：万字 10 代码块 20 次往返 P95 < 200ms） | 测试页不存在（等待超时） | 1/1 通过（P50 21ms，P95 25–30ms；冷 ~850ms） | `npm test` 2/2；e2e 冒烟 2/2；生产构建不含测试页 | lint 0；astro check 0 错误 |
| 2026-10-13 | create-d1-init-migration | `tests/integration/migration.test.ts`（workerd：4 表 + 6 索引 + 4 触发器；UPDATE 后 `db_update_time` 刷新） | `no such table: posts` | 1/1 通过；`npm run db:migrate:local` 本地应用成功 | `npm test` 3/3 | lint 0；astro check 0 错误 |
| 2026-10-13 | define-design-token-styles | `tests/unit/tokens.test.ts`（jsdom：design-tokens.md 30 个令牌亮 / 暗取值 ↔ tokens.css） | 找不到 `src/styles/tokens.css` | 1/1 通过；改错一个值时测试失败（已确认非空过） | `npm test` 4/4；e2e 冒烟 2/2 | lint 0；astro check 0 错误 |
