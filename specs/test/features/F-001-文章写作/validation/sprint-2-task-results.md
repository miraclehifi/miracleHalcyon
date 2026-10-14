# Sprint 2 任务测试结果

**Feature**: F-001 文章写作
**最后更新**: 2026-10-14

> implement 阶段每完成一个任务追加一行；verify 阶段的系统级结果另行记录。Sprint 2 起一个任务带一组测试（测试清单）。

| 日期 | 任务 | 变更点测试 | 红 | 绿 | 影响范围回归 | Lint / 类型检查 |
|------|------|-----------|----|----|-------------|----------------|
| 2026-10-14 | build-format-toolbar | `tests/unit/editor/format-commands.test.ts`（TC-US10-01 / 02 矩阵 = UT-117 / 118；UT-119 `matchShortcut`；ED-UT-01 `applyEdit` 退回 `setRangeText`）；`tests/e2e/editor-toolbar.spec.ts`（chromium + webkit：TC-US10-03 加粗后焦点与选区保留、Mod+Z 还原；TC-US10-04 六个快捷键生效且 `defaultPrevented`，标题框不响应；TC-US10-05 组字期间不触发） | 找不到 `src/lib/editor/format-commands`；E2E 找不到"加粗"按钮、快捷键无效果（TC-US10-05 为反向用例，首次即通过） | 单元 23/23；E2E 6/6 | `npm test` 57 文件全部通过；`npm run test:e2e` 38/38 | lint 0；astro check 0 错误 |
