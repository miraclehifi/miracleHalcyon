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
| 2026-10-13 | implement-password-hashing | `tests/unit/auth/password.test.ts`（[AUTH-UT-01] 往返 / 错误密码 / 篡改 salt / iterations 非数字） | 找不到 `src/domains/auth/password` | 1/1 通过 | `npm test` 5/5 | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-login-throttle-rules | `tests/unit/auth/throttle.test.ts`（[AUTH-UT-02] 1–5 次失败 / 锁定中 / 过期后 / 成功） | 找不到 `src/domains/auth/throttle` | 1/1 通过 | `npm test` 6/6 | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-sanitize-next | `tests/unit/auth/next.test.ts`（[AUTH-UT-03] 规格 7 个输入 + `/adminx`） | 找不到 `src/domains/auth/next` | 1/1 通过 | `npm test` 7/7 | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-session-repo | `tests/integration/auth/session-repo.test.ts`（workerd：insert 命中 / 过期 1ms 删除 / delete 后 null） | 找不到 `src/domains/auth/session-repo` | 1/1 通过 | `npm test` 8/8 | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-throttle-repo | `tests/integration/auth/throttle-repo.test.ts`（workerd：upsert 两次取最新 / delete 后 null） | 找不到 `src/domains/auth/throttle-repo` | 1/1 通过 | `npm test` 9/9 | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-auth-login-service | `tests/unit/auth/login-service.test.ts`（[AUTH-UT-04] 内存仓储：正确凭据 / 错误密码 / 错误账号 / 锁定中正确密码） | 找不到 `src/domains/auth/service` | 1/1 通过 | `npm test` 10/10 | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-auth-session-check | `tests/unit/auth/session-check.test.ts`（[AUTH-UT-05] 有效 / 过期 1ms 删除 / 未知 / undefined） | `getSession is not a function` | 1/1 通过 | `npm test` 11/11（login 测试改用共享内存仓储后仍通过） | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-auth-middleware | `tests/integration/auth/middleware.test.ts`（[AUTH-UT-07] workerd：4 类请求 × 有 / 无会话 × Origin 同源 / 异源 / 缺失 = 24 组合） | 找不到 `src/middleware` | 1/1 通过 | `npm test` 12/12；e2e 冒烟 2/2；`test:spike` 通过（路由改为 `/_spike/markdown`） | lint 0；astro check 0 错误 |
| 2026-10-13 | implement-login-endpoint | `tests/integration/auth/login-endpoint.test.ts`（workerd 表驱动：204 + Cookie（https / http）、400 ×3、401、429 + Retry-After、500） | 找不到 `src/pages/api/admin/login` | 1/1 通过 | `npm test` 13/13；e2e 冒烟 2/2 | lint 0；astro check 0 错误 |
| 2026-10-13 | add-hash-password-script | `tests/unit/scripts/hash-password.test.ts`（脚本输出可被 `verifyPassword` 校验） | 找不到 `scripts/hash-password` | 1/1 通过；另实测管道输入 → 哈希 → verify 为 true | `npm test` 14/14 | lint 0；astro check 0 错误 |
| 2026-10-13 | build-button-component | `tests/unit/ui/button.test.tsx`（jsdom：6 变体同一样式 / icon / 无 WebGL 时 `data-specular=off` 底边线 / disabled 与 aria-disabled） | 找不到 `src/components/ui/Button` | 1/1 通过；另在 chromium（dev）中实测 WebGL 流光、亮暗主题切换、按下态 | `npm test` 15/15；构建通过 | lint 0；astro check 0 错误 |
| 2026-10-13 | build-icon-button-component | `tests/unit/ui/icon-button.test.tsx`（缺 aria-label：`@ts-expect-error` + 运行时 warn；sm `size-7` / touch `size-11`；图标 16px） | 找不到 `src/components/ui/IconButton` | 1/1 通过；把 aria-label 改成可选时 astro check 报 ts(2578)（已确认类型断言有效） | `npm test` 16/16 | lint 0；astro check 0 错误 |
| 2026-10-13 | build-field-component | `tests/unit/ui/field.test.tsx`（label ↔ input；error → aria-invalid + describedby 错误文本；无 error → describedby hint） | 找不到 `src/components/ui/Field` | 1/1 通过 | `npm test` 17/17 | lint 0；astro check 0 错误 |
| 2026-10-13 | build-alert-component | `tests/unit/ui/alert.test.tsx`（tone=error：role=alert、`bg-danger-soft`、`text-danger`、circle-alert 图标） | 找不到 `src/components/ui/Alert` | 1/1 通过 | `npm test` 18/18 | lint 0；astro check 0 错误 |
