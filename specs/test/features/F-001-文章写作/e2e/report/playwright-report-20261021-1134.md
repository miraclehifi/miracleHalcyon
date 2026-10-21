## Playwright 测试报告

- **脚本**：specs/test/features/F-001-文章写作/e2e/playwright-test-afilmory-live.js（`bash playwright-test-afilmory-live.sh`）
- **执行时间**：2026-10-21 11:34（首次 11:31，见"错误信息"）
- **环境**：http://localhost:4321（`CLOUDFLARE_ENV=e2e` 构建 + `astro preview`）；完整版 Chromium（channel `chromium`，`canPlayType` Main 10 = probably）；**不打桩**——照片信息接口真实请求 miraclehalcyon.afilmory.art，浏览器真实按 Range 读取 GitHub raw
- **状态**：✅ 成功（6 / 6）
- **耗时**：约 44s

### 控制台输出

```
canPlayType(hvc1 Main 10) = "probably"
✅ [TC-US13-01][TC-US13-07] 实况开关开启时粘贴真实单张分享代码 → 带 live 的外链引用
✅ [TC-US13-08] 预览先显示缩略图，进入视口后按 Range 读主图（3072 宽）
   视频：{"src":"blob:","time":0.541297,"w":2880,"h":3840}
✅ [TC-US13-10/11] 真实 HEVC：显示 LIVE，悬停读取视频范围并播放
✅ [TC-US13-03] 粘贴真实多张分享代码 → 三行、子目录地址编码、网格组图
✅ [TC-US13-04] 粘贴按标签的分享代码 → 提示、不插入
✅ [ADR-010] 动态照片原图从不整体下载（只按 Range 读主图与视频）

GitHub raw 请求：
  (无 Range)  .afilmory/thumbnails/18369.jpg
  bytes=0-3337664  18369.jpg
  bytes=3337665-18087605  18369.jpg
  (无 Range)  .afilmory/thumbnails/23473.jpg
  (无 Range)  .afilmory/thumbnails/9332.jpg
  (无 Range)  手办/wf2026/23473.jpg
  (无 Range)  .afilmory/thumbnails/18382.jpg
  (无 Range)  18382.jpg
  (无 Range)  9332.jpg

结果：6 / 6 通过
```

### 截图

- `specs/test/features/F-001-文章写作/validation/screenshots/us13-live-main.png`（主图替换完成）
- `specs/test/features/F-001-文章写作/validation/screenshots/us13-live-playing.png`（外链实况播放中：放大 + 进度条）
- `specs/test/features/F-001-文章写作/validation/screenshots/us13-grid.png`（多张成网格组图）

### 错误信息

首次执行（11:31）5 项中 4 项通过：
- TC-US13-03 失败为脚本问题（粘贴文本里的前导换行随整段粘贴被拦截，多张照片接在上一张后面）→ 改为先插入空行再粘贴
- 请求记录里出现一次**不带 Range 的 `18369.jpg`**（整个 18MB 原图）：粘贴过程中照片与占位同段，成为行内图片，而行内图片用的是原图地址 → 实现缺陷，回到 implement 修复（行内外链照片也用缩略图），并在脚本中新增"原图从不整体下载"检查
