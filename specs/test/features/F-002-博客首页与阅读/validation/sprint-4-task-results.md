# Sprint 4 任务测试结果

> 按 2026-10-15 作者要求：任务内只跑本任务测试清单；影响范围回归、webkit、lint、check 在 Sprint 4 全部任务完成后统一执行。

| 日期 | 任务 | 测试 | 红 | 绿 | 备注 |
|------|------|------|----|----|------|
| 2026-10-15 | spike-reader-prerender | spike 手动验证：`READER_FIXTURE=spike` 构建 + `astro preview` 逐项探测（6 项假设 + 尾斜杠），结论见 ADR-007"验证结果"；自动化并入 check-reader-build-output | 编码后的标签参数（含 `%2F`）构建失败；目录格式下 `/x` 先 307 | ①②③⑤⑥ 通过；④ 走退路（URL 安全 tagSlug）后通过；`build.format: "file"` 后 `/x` 直接 200 | 临时页面与 spike 夹具已删除；`readerData()` 保留最小版（夹具），正式实现在 build-reader-data-source |
| 2026-10-15 | build-reader-data-source | `tests/unit/reader/data-source.test.ts`（READER-UT-09：翻页 + 详情、TC-US03-08 500 报错含地址与状态、非 JSON、READER_BOOTSTRAP、夹具不存在 / 字段不合法、未配置）；`sort.test.ts`（READER-UT-01）；`fixture.test.ts`（夹具基准值） | 找不到 loadReaderData、sortPublished、夹具文件 | 单元 13/13 | 夹具复用 E2E 种子图片 a–j，不新增种子；playwright webServer 注入 READER_FIXTURE=reader-fixture；README 补读者数据变量 |
| 2026-10-15 | add-reader-layout | `tests/e2e/reader-shell.spec.ts`（TC-US01-01 顶栏与外链、TC-US01-05 手机图标化 44px、TC-US01-06 404 页 cd ..、TC-US01-07 + 08 未知路径 404 与无后台入口）；`tests/unit/reader/site-config.test.ts`（READER-UT-08，normalizeSiteConfig 提前在本任务实现） | 无 normalizeSiteConfig；未知路径为 Astro 默认 404 | 单元 3/3；E2E chromium 4/4 | 首页 / 列表 / 详情未实现：顶栏当前项高亮与各页 cd .. 断言随 add-post-list-page、add-article-page 补跑 |
