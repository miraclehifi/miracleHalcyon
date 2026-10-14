# Sprint 3 任务测试结果

**Feature**: F-001 文章写作
**最后更新**: 2026-10-14

> implement 阶段每完成一个任务追加一行；verify 阶段的系统级结果另行记录。任务内只跑受影响的测试，全量在 Sprint 末（[targeted-task-testing](../../../../backlog/targeted-task-testing.md)）。

| 日期 | 任务 | 变更点测试 | 红 | 绿 | 影响范围回归 | Lint / 类型检查 |
|------|------|-----------|----|----|-------------|----------------|
| 2026-10-14 | spike-browser-media-processing | `tests/spike/media-processing.spec.ts`（chromium，`channel: "chromium"`：OPPO 动态照片按 `Item:Length` 定位、按 MP4 顶层 box 截出主视频 16,423,579 B；支持 H.264 时缩到 1920×1440、6 Mbps、去音轨，产出 2,692,784 B 且 brand 通过 `sniffVideo`；不支持 H.264 时只转封装 16,389,677 B，brand 合法但 > 10MB） | spike 页与用例为新建 | 3/3（数据见 ADR-006"验证结果"；本记录据提交 `22480e1` 补写，未重跑） | spike 只在 dev 注入，不影响正式页面；iPhone / HEIC 与构建产物检查延后 | lint 0；astro check 0 错误（据任务文件 DoD） |
| 2026-10-14 | implement-markdown-image-plugins | `tests/unit/markdown/image-plugins.test.ts`（UT-126 `parseImageKey`；UT-127 `parseMarks`；UT-128 单图结构、外链、`live` 仅站内；UT-129 组图判定矩阵、行内图片保持行内；UT-130 手风琴区间；UT-131 9 张切组；UT-132 + TC-US12-08 注入过滤与 data-* 白名单；UT-133 源码偏移与 `ImageRef`）；`tests/unit/markdown/isomorphic.test.ts` + `tests/integration/markdown/isomorphic.test.ts`（MD-UT-06：jsdom 与 workerd 输出同一快照） | 找不到 `plugins/image-key` | 单元 11/11 + 1；workerd 1/1 | `tests/unit/markdown/*`、`scroll-sync` 20/20；workerd markdown spike 2/2；E2E 图片上传与同步滚动（chromium）15/15 | lint 0；astro check 0 错误 |
| 2026-10-14 | implement-live-photo-upload-api | `tests/unit/media/validate.test.ts`（MEDIA-UT-02 `sniffVideo` 9 种 brand 接受、qt / heic / heix / mif1 / msf1 / M4A / HTML / 截断 / 0 字节拒绝；MEDIA-UT-05 视频 10,485,760 / +1 / 0）；`tests/integration/media/upload-endpoint.test.ts`（workerd：TC-US11-02 201 live、`.live.mp4` 类型缓存字节、`video_key` / `video_size`；TC-US11-11 / 13 413 `VIDEO_TOO_LARGE`、只有视频 400、mp4 作 file 400 `UNSUPPORTED_TYPE`、R2 不新增；TC-US11-15 + MEDIA-UT-06 视频写入失败 / D1 失败均 500 且 R2、D1 无残留；TC-US11-19 / 20 伪造视频、带视频的字段校验、尺寸取文件头、经 middleware 401 / 403） | `sniffVideo is not a function`；集成 4 个失败（视频被忽略，201 无 live） | 单元 13/13；集成 15/15 | `tests/unit/media/*`、`tests/integration/media/*` 全部通过；E2E `image-api` + `editor-image-paste`（chromium）4/4 | lint 0；astro check 0 错误 |
