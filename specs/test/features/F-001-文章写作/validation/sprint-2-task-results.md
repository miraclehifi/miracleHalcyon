# Sprint 2 任务测试结果

**Feature**: F-001 文章写作
**最后更新**: 2026-10-14

> implement 阶段每完成一个任务追加一行；verify 阶段的系统级结果另行记录。Sprint 2 起一个任务带一组测试（测试清单）。

| 日期 | 任务 | 变更点测试 | 红 | 绿 | 影响范围回归 | Lint / 类型检查 |
|------|------|-----------|----|----|-------------|----------------|
| 2026-10-14 | build-format-toolbar | `tests/unit/editor/format-commands.test.ts`（TC-US10-01 / 02 矩阵 = UT-117 / 118；UT-119 `matchShortcut`；ED-UT-01 `applyEdit` 退回 `setRangeText`）；`tests/e2e/editor-toolbar.spec.ts`（chromium + webkit：TC-US10-03 加粗后焦点与选区保留、Mod+Z 还原；TC-US10-04 六个快捷键生效且 `defaultPrevented`，标题框不响应；TC-US10-05 组字期间不触发） | 找不到 `src/lib/editor/format-commands`；E2E 找不到"加粗"按钮、快捷键无效果（TC-US10-05 为反向用例，首次即通过） | 单元 23/23；E2E 6/6 | `npm test` 57 文件全部通过；`npm run test:e2e` 38/38 | lint 0；astro check 0 错误 |
| 2026-10-14 | implement-image-upload-api | `tests/unit/media/validate.test.ts`（MEDIA-UT-01 嗅探 8 种合法 + 6 种非法；MEDIA-UT-03 key 与 UTC 月末；MEDIA-UT-04 字段校验；MEDIA-UT-05 5 MiB 边界）；`tests/integration/media/upload-endpoint.test.ts`（workerd：TC-US05-04 + MEDIA-UT-07、TC-US05-08 / 16、TC-US05-14 / 15、MEDIA-UT-04 / 06 回滚、16 MiB 请求体、TC-US05-17 / 18 经 middleware） | 找不到 `src/domains/media/key`；找不到 `src/domains/media/repo` | 单元 11/11；集成 6/6 | `npm test` 59 文件 96 用例全部通过（仅后端，无 UI 改动，未跑 E2E） | lint 0；astro check 0 错误 |
| 2026-10-14 | add-image-read-route | `tests/integration/media/read-route.test.ts`（workerd：MEDIA-UT-08 命中 200 + 长缓存 / nosniff / CSP、ETag 304、6 种不合规路径 404、视频 Range 206；TC-US05-19 同名同内容两次 key 不同；TC-US05-20 路径穿越 / Unicode 文件名不进入 key）；`tests/e2e/image-api.spec.ts`（chromium + webkit：上传后按地址读取字节一致、不存在 404） | 找不到 `src/pages/img/[...key]` | 集成 4/4；E2E 2/2 | `npm test` 60 文件 100 用例全部通过 | lint 0；astro check 0 错误 |
| 2026-10-14 | add-image-paste-upload | `tests/unit/editor/placeholders.test.ts`（UT-87 / 88 / 89、ED-UT-03、UT-91、后台写入保留选区与焦点）；`tests/unit/markdown/upload-placeholder.test.ts`（占位块渲染）；`tests/e2e/editor-image-paste.spec.ts`（chromium + webkit：TC-US05-01 粘贴后插入 `![image](站内地址)`、预览图片 naturalWidth 64、上传 1 次；TC-US05-23 上传中源码为占位、预览"图片上传中… image.png"无 img，完成后替换；TC-US05-24 上传期间在前后输入，引用落在占位处、光标仍在末尾） | 找不到 `src/lib/upload/upload-client`；E2E 粘贴后无上传请求 | 单元 42/42（editor + markdown + admin）；E2E 6/6 | `npm test` 62 文件 108 用例；`npm run test:e2e` 连续 2 轮 46/46（首轮 TC-US05-23 WebKit 因固定延迟失败 1 次，改为扣住请求后稳定） | lint 0；astro check 0 错误 |
