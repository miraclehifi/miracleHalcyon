# Sprint 4 任务测试结果

> 按 2026-10-15 作者要求：任务内只跑本任务测试清单；影响范围回归、webkit、lint、check 在 Sprint 4 全部任务完成后统一执行。

| 日期 | 任务 | 测试 | 红 | 绿 | 备注 |
|------|------|------|----|----|------|
| 2026-10-15 | spike-reader-prerender | spike 手动验证：`READER_FIXTURE=spike` 构建 + `astro preview` 逐项探测（6 项假设 + 尾斜杠），结论见 ADR-007"验证结果"；自动化并入 check-reader-build-output | 编码后的标签参数（含 `%2F`）构建失败；目录格式下 `/x` 先 307 | ①②③⑤⑥ 通过；④ 走退路（URL 安全 tagSlug）后通过；`build.format: "file"` 后 `/x` 直接 200 | 临时页面与 spike 夹具已删除；`readerData()` 保留最小版（夹具），正式实现在 build-reader-data-source |
