# Sprint 9 任务测试结果（F-005 书影音）

> 任务内只跑本任务测试文件 + 直接波及的已有测试（[tasks.md](../../../../../.claude/rules/tasks.md)"测试执行"）；全量在 Sprint 末。

| 日期 | 任务 | 命令 | 结果 |
|------|------|------|------|
| 2026-10-21 | 1 spike-douban-rexxar | `npx vitest run tests/unit/shelf/douban-fixtures.test.ts` | 11 / 11 通过；边缘验证见任务文件"结论" |
| 2026-10-21 | 2 add-shelf-entry-api | `npx vitest run tests/unit/shelf/entry.test.ts tests/unit/shelf/service.test.ts` | 44 / 44 通过 |
| 2026-10-21 | 2 add-shelf-entry-api | `npx vitest run tests/integration/shelf` | 16 / 16 通过（entries-api 9、covers 5、entries-security 2） |
| 2026-10-21 | 2 add-shelf-entry-api（影响范围） | `npx vitest run tests/integration/migration.test.ts tests/integration/media` | 42 / 42 通过（migration 期望表结构补 shelf 三项后） |
| 2026-10-21 | 2 add-shelf-entry-api | `npm run check` | 0 errors |
| 2026-10-22 | 3 add-douban-recognize-api | `npx vitest run tests/unit/shelf tests/integration/shelf` | 123 / 123 通过（新增 douban-link 23、douban-map 17、recognize 8、recognize-api 9；鉴权矩阵加识别接口） |
| 2026-10-22 | 3 add-douban-recognize-api | `npm run check`、`npx eslint src tests` | 0 errors、0 problems |
| 2026-10-21 | 2 add-shelf-entry-api | `npm run lint` | 1 error，为既有问题：`specs/test/features/F-001-文章写作/e2e/playwright-test-afilmory-live.js:40` 空 catch 块（Sprint 8 提交 c098a7f 引入），与本任务无关，未修改 |
| 2026-10-22 | 4 add-admin-media-list | `npx vitest run tests/unit/components/admin-header.test.tsx tests/unit/admin/media-entry-row.test.tsx tests/unit/components/media-type-tabs.test.tsx tests/unit/admin/media-entry-list.test.tsx` | 15 / 15 通过（新增 media-entry-list：标题区说明行在标题下方 + 读者页地址、删除确认框取消后焦点回到触发按钮） |
| 2026-10-22 | 4 add-admin-media-list | `npx playwright test tests/e2e/admin-media-list.spec.ts --project chromium` / `--project webkit` | 5 / 5、5 / 5 通过。webkit 首跑 TC-US01-23 失败：WebKit 点击不聚焦按钮，确认框关闭后焦点落到 body → `ConfirmDialog` 新增 `returnFocus`，列表传入触发按钮后通过；两项目同时跑时 chromium TC-US01-01 偶发失败（共用本地 D1），单独重跑通过 |
| 2026-10-22 | 4 add-admin-media-list（影响范围：`PageHeader`、`ConfirmDialog` 为共享组件） | `npm test` | 606 / 606 通过（首跑令牌一致性用例失败：design-tokens.md 已登记 `flip-surface` / `flip-ink`，`tokens.css` 补齐后通过） |
| 2026-10-22 | 4 add-admin-media-list | `npm run lint`、`npm run check` | 0 problems（修 GooeyNav 两处 `react-hooks/refs` 按 vendor 惯例加注释、修上一行记录的既有空 catch 块）、0 errors |
| 2026-10-22 | 4 add-admin-media-list（设计稿对照） | 1440 / 390 截图对照 admin.pen 10 / 10m | 标题区改为说明行在标题下方（`PageHeader stacked`）后一致；差异两处均有归属：评分仍为 ★ 字符（表情星随任务 5 `StarRating`）、分类仍为 7 个含"动画"（随 [drop-anime-type](../../../../backlog/drop-anime-type.md) 任务） |
| 2026-10-22 | 11 drop-anime-type | `npx vitest run tests/unit/shelf tests/integration/shelf tests/unit/components/media-type-tabs.test.tsx tests/integration/migration.test.ts` | 红：5 个新 / 改用例失败（分类枚举、显示名、`anime` 校验、`tv-anime` 映射、接口与库约束）；绿：133 / 133 通过 |
| 2026-10-22 | 11 drop-anime-type | `npx playwright test tests/e2e/admin-media-list.spec.ts`（chromium / webkit） | 5 / 5、5 / 5 通过（本地 D1 重建 `shelf_entries`；删除用例改用"游戏"，避免与空分类用例争用"桌游"） |
| 2026-10-22 | 11 drop-anime-type | `npm run lint`、`npm run check` | 0 problems、0 errors |
| 2026-10-22 | 5 add-admin-media-form | `npx vitest run tests/unit/components/star-rating.test.tsx tests/unit/admin/shelf-form.test.ts tests/unit/admin/media-entry-form.test.tsx tests/unit/admin/media-entry-row.test.tsx tests/unit/admin/media-entry-list.test.tsx tests/unit/ui/field.test.tsx` | 全部通过（StarRating 7、表单逻辑 10、表单组件 4、列表行 5、列表 4、Field 2） |
| 2026-10-22 | 5 add-admin-media-form | `npx playwright test tests/e2e/admin-media-form.spec.ts`（chromium / webkit） | 8 / 8、8 / 8 通过（TC-US01-16、18、19、20、21、24、25，编辑与删除，离开确认）；首跑 3 个定位器问题（"封面"与"移除封面"同名、空分类时两个"新增条目"），改测试后通过 |
| 2026-10-22 | 5 add-admin-media-form（影响范围：`Field`、`SegmentedControl` 共享组件） | `npm test`；`npx playwright test admin-media-list login editor-slug-conflict editor-cover --project chromium` | 633 / 633；23 / 23（含表单 8） |
| 2026-10-22 | 5 add-admin-media-form | `npm run lint`、`npm run check` | 0 problems（表单聚焦改为按 `aria-invalid` 查找，去掉渲染期 ref 回调；StarRating 键盘处理去掉无用赋值）、0 errors |
| 2026-10-22 | 5 add-admin-media-form（设计稿对照） | 1440 / 390 截图对照 admin.pen 11 / 11m | 卡片版式、封面列、两列字段、状态分段控件、表情星、短评计数、手机底部固定栏一致；识别框与结果卡属任务 6；"取消 / 上传"为深色，因项目 `Button` 各变体统一用 SpecularButton 质感（非本任务偏差） |
| 2026-10-22 | 6 add-recognize-box | `npx vitest run tests/unit/admin/recognize-box.test.tsx tests/unit/admin/media-entry-form.test.tsx` | 9 / 9 通过（UT-09、10、11；表单识别接入） |
| 2026-10-22 | 6 add-recognize-box | `npx playwright test tests/e2e/admin-media-recognize.spec.ts`（chromium / webkit） | 8 / 8、8 / 8 通过（TC-US02-14–22；TC-US02-22 全程无 douban / doubanio 请求） |
| 2026-10-22 | 6 add-recognize-box（影响范围：`Field`、`MediaEntryForm`） | `npm test`；`npx playwright test admin-media-form admin-media-list --project chromium` | 638 / 638；13 / 13 |
| 2026-10-22 | 6 add-recognize-box | `npm run lint`、`npm run check` | 0 problems、0 errors |
| 2026-10-22 | 6 add-recognize-box（设计稿对照） | 截图对照 admin.pen 11 / 11b | 识别框、可识别类型卡片、结果卡（成功 / 重复 / 失败）、填入高亮与缺失警告一致 |
| 2026-10-22 | 7 add-shelf-reader-data | `npx vitest run tests/unit/reader/shelf.test.ts tests/unit/reader/data-source.test.ts tests/integration/shelf/public-api.test.ts` | 红：6 个失败（`loadShelfData`、`parseShelfData`、`createPublicShelfHandler` 不存在）；绿：20 / 20 通过（SHELF-UT-11、UT-01、02、03、05；取数 6 项；公开接口 1 项） |
| 2026-10-22 | 7 add-shelf-reader-data（影响范围：`readerData()` 插件） | `npx vitest run tests/integration/shelf tests/unit/reader`；`npm run test:build` | 96 / 96；7 / 7（现有读者页产物不变） |
| 2026-10-22 | 8 add-media-reader-page | `npm run test:build` | 红：新增 10 项失败（书影音页不存在）；绿：18 / 18 通过（TC-US03-03、04、05、06、07、08、10、11、13、16 产物部分；无书影音夹具时各分类为空状态） |
| 2026-10-22 | 8 add-media-reader-page | `npx playwright test tests/e2e/reader-media.spec.ts`（chromium / webkit） | 9 / 9、9 / 9 通过（TC-US03-01、02、06 对齐、09、10、15、16、17、18）。E2E 在页面写好后才补，没有先跑出红色；封面夹具由 `e2e:seed` 写入本地 R2（"无名片"故意不写，用于加载失败占位）。TC-US03-17 按 gooey-media-tabs 口径改为"标签换行全部可见"，TC-US03-16 的标签按链接定位 |
| 2026-10-22 | 8 add-media-reader-page（影响范围：读者端 spec） | `npx playwright test reader- --project chromium` | 首跑 59 / 60：`reader-shell` TC-US01-07 仍断言 `/media` 为 404（F-002 时书影音未上线）→ 改用 `/media/music`，F-002 US-01-tests.md 同步；重跑通过 |
| 2026-10-22 | 8 add-media-reader-page（设计稿对照） | 1440 / 390 截图对照 admin.pen 09 / 09m / 09c | 首版封面被 `MediaCover` 自带的 `relative` 覆盖，落到卡片下方 → 定位交给调用方后一致；卡片底部日期按 TC-US03-05 / reader-media.md 用 `yyyy-MM`（设计稿与 components.md 示例写的 `2026-08-14`，以验收口径为准） |
| 2026-10-22 | 10 add-media-poster-wall | `npx vitest run tests/unit/reader/shelf-time.test.ts tests/unit/reader/media-poster-wall.test.tsx` | 红：模块不存在；绿：5 / 5（UT-15）、5 / 5（UT-16；首跑 3 项为测试自身问题：标题含"在看"、未装 jest-dom 匹配器、jsdom matchMedia 恒为手机槽）。测试文件放在 `tests/unit/reader/`（任务文件写的是 `tests/unit/`，与现有目录结构对齐） |
| 2026-10-22 | 10 add-media-poster-wall | `npm run test:build` | 红：TC-US03-11、04 改口径后 2 项失败；绿：18 / 18 |
| 2026-10-22 | 10 add-media-poster-wall | `npx playwright test tests/e2e/reader-media.spec.ts`（chromium / webkit） | 12 / 12、12 / 12（新增 TC-US03-19 ×2、20；TC-02、15 电影部分改为海报墙）。过程中修了 3 个实现问题：① vendor FlipCard `flip()` 用当前角度取整判断朝向，被动翻回动画未结束时点击 / Enter 无效 → 改按目标角度；② GooeyNav 画布外扩 72px 在 390 宽撑出横向滚动（书页同样存在，原 TC-US03-17 在画布就绪前量宽所以没发现）→ 书影音页 `<main>` 加 `overflow-x: clip`，TC-17 改为水合后量；③ 分段标题的 GradualBlur 未吸顶时也盖住第一排海报顶部 → 只在吸顶时显示（`data-stuck`） |
| 2026-10-22 | 10 add-media-poster-wall（设计稿对照） | 1440 / 390、亮 / 暗、无 JS 截图对照 admin.pen 09e / 09d / 09dm、`MediaPoster/Back` | 背面版式、6 列 / 2 列、按钮位置一致；无 JS 时封面 404 显示浏览器破图（禁用 JS 时任何 onerror 都不执行，可接受的降级） |
| 2026-10-22 | Sprint 末 | `npm run lint`、`npm run check`、`npm ls @hugeicons/react` | 0 problems（vendor Masonry 按惯例文件级关闭 react-hooks 规则并注明原因）、0 errors、empty |
| 2026-10-22 | Sprint 末 | `npm test` | 661 / 662：`markdown/isomorphic` 快照用例全量并发下失败，单独重跑通过（本 Sprint 未改 markdown 代码） |
| 2026-10-22 | Sprint 末 | `npm run test:build` | 18 / 18 |
| 2026-10-22 ~ 23 | Sprint 末 | `npm run test:e2e` | 394 通过 / 72 失败：chromium 全部通过；失败为 webkit 71 条（散布在编辑器、灯箱等，多为 30s 超时）+ chromium-media TC-US11-07（视频转封装 60s 超时）。复核：webkit 单独 4 worker 重跑 228 / 233（中途机器休眠），剩余 reader-lightbox / toc / typography 用 2 worker 重跑 17 / 18，reader-toc 串行 3 次全过；TC-US11-07 单独重跑通过——均为并发负载下的超时，与本 Sprint 改动无关 |
| 2026-10-23 | code-review 修复 | `npx vitest run tests/unit/admin/media-entry-form.test.tsx tests/unit/components/media-type-tabs.test.tsx tests/integration/shelf`；`npm run test:build` | 红：新增 4 项 + 构建断言 1 项失败；绿：42 / 42、18 / 18（详见 [code-review](../reviews/code-review.md)） |
| 2026-10-23 | code-review 回归 | `npm run lint`、`npm run check`、`npx vitest run tests/unit`、`npx playwright test reader-media admin-media reader-shell --project chromium` | 0 problems、0 errors、547 / 547、37 / 37 |
| 2026-10-27 | 12 add-game-platform-api | `npx vitest run tests/unit/shelf/igdb.test.ts` | 红：`igdb.ts` 不存在；绿：31 / 31（SHELF-UT-12、13，`IgdbImageClient` 跳转 / 404 / 非图片 / 读取上限） |
| 2026-10-27 | 12 add-game-platform-api | `npx vitest run tests/unit/shelf/service.test.ts tests/unit/shelf/recognize.test.ts` | 红：6 项失败；绿：21 / 21（SHELF-UT-14 TC-US01-26 #1–8、27 #5 #7（假计时器 8 秒）、28；SHELF-UT-15 TC-US02-23）。影响范围：`entry.test.ts` 最小字段用例补 4 个新字段 |
| 2026-10-27 | 12 add-game-platform-api | `npx vitest run tests/integration/shelf tests/integration/migration.test.ts` | 红：5 项失败；首绿时 D1 报"LIKE or GLOB pattern too complex"（D1 模式上限 50 字符）→ 0005 的 `cover_url` CHECK 改用 `instr` / `substr`；绿：game-entry 4 / 4（TC-US01-26、27、28，`igdbStub` 记录的主机只有 `images.igdb.com`）、迁移 0005 1 / 1。影响范围：`entries-api` 全字段游戏补 `platform`，`public-api` 补新字段 |
| 2026-10-27 | 12 add-game-platform-api（影响范围：`ShelfPublicEntry`、`reader-data` 构建校验） | `npx vitest run tests/unit/reader tests/unit/shelf tests/integration/shelf tests/integration/migration.test.ts`；`npm run test:build` | 254 / 254（含 `parseShelfData` 游戏字段 2 项）；18 / 18 |
| 2026-10-27 | 12 add-game-platform-api | `npm run lint`、`npm run check`、`npm run db:migrate:local` | 0 problems、0 errors；本地 0005 已应用 |
| 2026-10-27 | 13 add-game-form-fields | `npx vitest run tests/unit/admin/media-entry-form.test.tsx tests/unit/admin/recognize-box.test.tsx tests/unit/admin/media-entry-row.test.tsx` | 红：UT-19 5 项、UT-10 1 项、行游戏封面 1 项失败；绿：全部通过。影响范围：`tests/unit/admin` 80 / 80（`shelf-form` 两项完整对象断言补 `platform`、`coverUrl`） |
| 2026-10-27 | 13 add-game-form-fields | `npx playwright test tests/e2e/admin-media-form.spec.ts -g TC-US01-29`（chromium / webkit） | 1 / 1、1 / 1（实现后补写，未先跑红） |
| 2026-10-27 | 13 add-game-form-fields（影响范围：admin / reader 书影音 E2E） | `npx playwright test admin-media reader-media --project chromium` | 首跑 21 / 22：TC-US01-23 建游戏未带 `platform`（任务 12 契约变更）→ 补字段后 22 / 22；reader-media 12 / 12 |
| 2026-10-27 | 13 add-game-form-fields | `npm run lint`、`npm run check` | 0 problems、0 errors |
| 2026-10-27 | 14 add-game-poster-wall | `npx vitest run tests/unit/reader/shelf.test.ts tests/unit/reader/shelf-time.test.ts tests/unit/reader/media-poster-wall.test.tsx` | 红：UT-17 `posterAspect` 2 项、UT-15 游戏"在玩"1 项失败，UT-18 文件因 `PlatformBadge` 不存在无法加载；绿：29 / 29（含 UT-18 PlatformBadge 5 平台、游戏模式 4 项、电影模式无徽标） |
| 2026-10-27 | 14 add-game-poster-wall | `npm run test:build` | 19 / 19（新增 TC-US03-21；TC-US03-03、05、06、10、11、13、16 按新夹具改口径） |
| 2026-10-27 | 14 add-game-poster-wall | `npx playwright test tests/e2e/reader-media.spec.ts`（chromium / webkit） | chromium 15 / 15（新增 TC-US03-22 ×2、23；TC-06、10、16、17 改口径；首跑悬停徽标位置用 boundingBox 受倾斜影响失败，改断言计算样式）；webkit 首跑 4 项因页面 / worker 崩溃失败（负载型），`--workers 4` 重跑 14 / 14 + 1 跳过（触屏用例，WebKit 不支持 `isMobile`） |
| 2026-10-27 | 14 add-game-poster-wall | `npm run lint`、`npm run check`、`git diff package.json` | 0 problems、0 errors、无新依赖 |
