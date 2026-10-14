# Sprint 2 任务测试结果

**Feature**: F-001 文章写作
**最后更新**: 2026-10-14

> implement 阶段每完成一个任务追加一行；verify 阶段的系统级结果另行记录。Sprint 2 起一个任务带一组测试（测试清单）。

| 日期 | 任务 | 变更点测试 | 红 | 绿 | 影响范围回归 | Lint / 类型检查 |
|------|------|-----------|----|----|-------------|----------------|
| 2026-10-14 | build-format-toolbar | `tests/unit/editor/format-commands.test.ts`（TC-US10-01 / 02 矩阵 = UT-117 / 118；UT-119 `matchShortcut`；ED-UT-01 `applyEdit` 退回 `setRangeText`）；`tests/e2e/editor-toolbar.spec.ts`（chromium + webkit：TC-US10-03 加粗后焦点与选区保留、Mod+Z 还原；TC-US10-04 六个快捷键生效且 `defaultPrevented`，标题框不响应；TC-US10-05 组字期间不触发） | 找不到 `src/lib/editor/format-commands`；E2E 找不到"加粗"按钮、快捷键无效果（TC-US10-05 为反向用例，首次即通过） | 单元 23/23；E2E 6/6 | `npm test` 57 文件全部通过；`npm run test:e2e` 38/38 | lint 0；astro check 0 错误 |
| 2026-10-14 | implement-image-upload-api | `tests/unit/media/validate.test.ts`（MEDIA-UT-01 嗅探 8 种合法 + 6 种非法；MEDIA-UT-03 key 与 UTC 月末；MEDIA-UT-04 字段校验；MEDIA-UT-05 5 MiB 边界）；`tests/integration/media/upload-endpoint.test.ts`（workerd：TC-US05-04 + MEDIA-UT-07、TC-US05-08 / 16、TC-US05-14 / 15、MEDIA-UT-04 / 06 回滚、16 MiB 请求体、TC-US05-17 / 18 经 middleware） | 找不到 `src/domains/media/key`；找不到 `src/domains/media/repo` | 单元 11/11；集成 6/6 | `npm test` 59 文件 96 用例全部通过（仅后端，无 UI 改动，未跑 E2E） | lint 0；astro check 0 错误 |
| 2026-10-14 | add-image-read-route | `tests/integration/media/read-route.test.ts`（workerd：MEDIA-UT-08 命中 200 + 长缓存 / nosniff / CSP、ETag 304、6 种不合规路径 404、视频 Range 206；TC-US05-19 同名同内容两次 key 不同；TC-US05-20 路径穿越 / Unicode 文件名不进入 key）；`tests/e2e/image-api.spec.ts`（chromium + webkit：上传后按地址读取字节一致、不存在 404） | 找不到 `src/pages/img/[...key]` | 集成 4/4；E2E 2/2 | `npm test` 60 文件 100 用例全部通过 | lint 0；astro check 0 错误 |
