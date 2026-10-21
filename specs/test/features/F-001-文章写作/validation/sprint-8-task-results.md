# Sprint 8 任务测试结果

**Feature**: F-001 文章写作（增量 [afilmory-photo-embed](../../../../backlog/afilmory-photo-embed.md)，US-13）
**最后更新**: 2026-10-21

> 任务内只跑本任务测试（E2E chromium）；webkit 补跑、lint、check、全量 `npm test` / `npm run test:e2e` / `npm run test:build` 在 6 个任务完成后统一跑（[`.claude/rules/tasks.md`](../../../../../.claude/rules/tasks.md)"测试执行"）。外部服务全部打桩：照片存储 `tests/e2e/support/afilmory.ts`（按 Range 切片返回 206），照片信息接口 `page.route` / 替换 `fetch`。

| 日期 | 任务 | 变更点测试 | 结果 |
|------|------|-----------|------|
| 2026-10-19 | add-afilmory-photo-api | `tests/unit/reader/site-config.test.ts`（UT-176）、`tests/unit/media/afilmory.test.ts`（MEDIA-UT-11 ~ 13，夹具 `tests/fixtures/afilmory/photo-page.html`）、`tests/integration/media/afilmory-route.test.ts`（TC-US13-13 / MEDIA-UT-14） | 3 个文件 15/15 |
| 2026-10-21 | render-external-photos | `tests/unit/markdown/external-photo.test.ts`（UT-166 ~ 168）；`tests/build/reader-output.test.ts`（TC-US13-12，reader 夹具 filler-23） | markdown 单元 8 个文件全过（已有快照不变）；test:build 该项通过 |
| 2026-10-21 | add-external-photo-loading | `tests/unit/reader/article-images.test.ts`（UT-171）、`tests/unit/components/external-media.test.ts`（UT-172）、`article-image-external.test.tsx`（UT-173）；E2E `afilmory-photos.spec.ts` TC-US13-08 ×2 | 单元通过；E2E chromium 2/2 |
| 2026-10-21 | add-afilmory-paste | `tests/unit/afilmory/paste-markdown.test.ts`（UT-169、170、TC-US13-14）、`tests/unit/upload/afilmory-uploads.test.tsx`（UT-175）；E2E TC-US13-01 ~ 07 | 单元 + 上传回归 14 个文件 58/58；E2E 首跑 3 个失败，均为用例期望值问题（行尾插入与文字同段为行内图片；"移除"删整行；多张时序）→ 修正后 chromium 通过 |
| 2026-10-21 | add-external-live-playback | `tests/unit/components/live-photo-external.test.tsx`（UT-174）；E2E TC-US13-10（chromium）、TC-US13-11（webkit） | 单元通过；TC-US13-11 首跑失败：Windows 版 Playwright WebKit 不能播放 `blob:` 地址的视频（NotSupportedError，http 地址可以）→ 按验收数据策略改为断言"读一次、失败后退回静态图"，播放流程由 UT-174 覆盖 |
| 2026-10-21 | add-lightbox-external-main | E2E TC-US13-09（读者页 filler-23） | chromium 通过 |
| 2026-10-21 | Sprint 8 统一测试 | `npm run lint` 0（修 1 处：`useInView` 在 effect 中同步 setState → 改为返回值推导）；`npm run check` 0 错误；`npm test` 147 个文件 463/463；`npm run test:build` 7/7；全量 `npm run test:e2e` 386 通过、21 失败（全为 WebKit）、9 跳过、4 未运行（计时项目依赖失败）→ 失败文件 WebKit 单 worker 重跑 64 通过、2 失败：TC-US13-01（WebKit 预览渲染慢于 1s 打桩延迟，卡片出现前已替换 → 改为扣住接口、看到卡片再放行，TC-US13-03 同改）；TC-US06-07（既有不稳定用例，重跑 2 次 1 过 1 失败，Sprint 6 记录中同样出现，封面上传不经过本 Sprint 改动的路径）。修正后 `afilmory-photos.spec.ts` chromium + webkit 22 通过、2 跳过（按浏览器限定的 TC-10 / 11） | 见左 |
| 2026-10-21 | 自查修复 | 主图读到但解码失败时显示坏图（BH-12 要求退回缩略图）→ `useMainFallback`；`article-image-external.test.tsx` 新增用例 | 组件单元 12 个文件 50/50；lint 0；`afilmory-photos` + `reader-images` + `image-layout` chromium 21 通过 |
| 2026-10-21 | 轻量审查修复（见 [sprint-8 审查修复](../../../../tasks/sprint-8/_index.md)） | `external-media.test.ts`（不同 mainBytes 分别读取）、`live-photo-external.test.tsx`（只改字节范围时换新 video 并按新范围读取） | 组件单元 12 个文件 52/52；lint 0；check 0；`afilmory-photos` + `live-photo-playback` + `reader-images` + `reader-lightbox` chromium 27 通过、1 跳过 |
| 2026-10-21 | 全面审查 MUST-FIX（见 [code-review 增量审查](../reviews/code-review.md)） | `live-photo-external.test.tsx`（简写 hvc1 为空、带 profile 为 probably 时仍判定支持） | 红 → 绿；单元 26 个文件 111/111；lint 0；check 0；`afilmory-photos` + `live-photo-playback` chromium + webkit 26 通过、3 跳过、1 失败（TC-US11-23 WebKit 负载失败，单 worker 连跑 2 次通过） |
| 2026-10-21 | verify 发现的缺陷：行内外链照片用原图地址（见 [validation-report](validation-report.md)"Sprint 8 增量验证"） | `external-photo.test.ts`（与文字同段的外链照片用缩略图）；TC-US13-01 断言改为缩略图；真实链路脚本 `../e2e/playwright-test-afilmory-live.js` | 红 → 绿；`npm test` 147 个文件 468/468；`afilmory-photos` + `image-layout` chromium + webkit 35 通过、2 跳过、1 失败（TC-US13-06 WebKit 并行偶发，单 worker 连跑 3 次通过）；真实链路 6/6 |

另：2026-10-21 用服务端解析模块直接请求真实站点 `miraclehalcyon.afilmory.art`，18369（动态照片）、23473（子目录）、18382 解析结果与夹具一致，缩略图位置符合推导规则。
