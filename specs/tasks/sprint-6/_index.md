# Sprint 6：图片上传体验升级

**状态**: completed
**创建**: 2026-10-16
**Feature**: F-001 文章写作（[Backlog: media-upload-experience](../../backlog/media-upload-experience.md)）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：大图上传有缩略图进度卡片、失败可重试；静态图在浏览器压缩为 WebP（长边 2560）；实况照片由工具栏开关决定（默认关闭），上传后可在图片菜单取消 / 恢复；读者页不再显示上传占位。
> 粒度按 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)（功能点粒度，可跨层，测试清单 2–5 项）。测试执行：任务内只跑本任务测试文件（E2E chromium，完成前补跑 webkit）；Sprint 末跑全量 `npm test`、`npm run test:e2e`、`npm run test:build`。
> 并行注意：[media-orphan-cleanup](../../backlog/media-orphan-cleanup.md)（F-006）由另一会话并行推进，可能改动 `MarkdownPreview` 以外的后台页面与 media 后端；本 Sprint 不改服务端。

## 任务索引

| # | Task | 名称 | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|------|---------|----|------|---------|---------|------|
| 1 | [add-image-compression](add-image-compression.md) | 浏览器端图片压缩（WebP / JPEG） | FRONTEND | 表现层 | US-05 | — | 2 | 高 | completed |
| 2 | [strip-reader-upload-placeholders](strip-reader-upload-placeholders.md) | 读者页不渲染上传占位 | FRONTEND | 表现层 | US-05 | — | 1 | 低 | completed |
| 3 | [add-upload-progress-card](add-upload-progress-card.md) | 上传进度卡片（缩略图 + 阶段 + 真实上传进度） | FRONTEND | 表现层 | US-05 | 1、2 | 1 | 中 | completed |
| 4 | [add-upload-failure-actions](add-upload-failure-actions.md) | 上传失败卡片：重试与移除 | FRONTEND | 表现层 | US-05、US-11 | 3 | 2 | 中 | completed |
| 5 | [handle-interrupted-placeholders](handle-interrupted-placeholders.md) | 孤立占位：上传已中断 | FRONTEND | 表现层 | US-05 | 4 | 0 | 中 | completed |
| 6 | [handle-compression-fallbacks](handle-compression-fallbacks.md) | 压缩兜底与原样上传 | FRONTEND | 表现层 | US-05 | 1 | 0 | 中 | completed |
| 7 | [add-live-photo-toggle](add-live-photo-toggle.md) | 工具栏"实况照片"开关（默认关闭） | FRONTEND | 表现层 | US-11 | 4 | 1 | 中 | completed |
| 8 | [add-still-only-action](add-still-only-action.md) | "仅转为静态图"：单张放弃实况视频 | FRONTEND | 表现层 | US-11 | 7 | 0 | 中 | completed |
| 9 | [add-image-menu-live-toggle](add-image-menu-live-toggle.md) | 图片菜单"实况"勾选项 | FRONTEND | 表现层 | US-12 | — | 0 | 低 | completed |

共 9 个任务。任务 1 不确定性高（WebKit canvas 导出 WebP 能力、大图解码内存、夹具生成），排在最前；任务 2、9 无依赖。

## 依赖图

```
1 add-image-compression ──┬─→ 3 add-upload-progress-card → 4 add-upload-failure-actions ─┬─→ 5 handle-interrupted-placeholders
2 strip-reader-…  ────────┘                                                            └─→ 7 add-live-photo-toggle → 8 add-still-only-action
1 ─→ 6 handle-compression-fallbacks
9 add-image-menu-live-toggle（独立）
```

## 覆盖检查

| 设计元素 | 任务 |
|---------|------|
| US-05 AC1、AC6（进度卡片） | 3 |
| US-05 AC5（失败卡片、重试 / 移除） | 4 |
| US-05 AC7、AC8（压缩） | 1、6 |
| US-05 AC9（已中断） | 5 |
| US-05 AC10（读者页不渲染占位，影响 F-002） | 2 |
| US-11 AC4、AC7、AC9（阶段、失败、开关） | 7 |
| US-11 AC10（仅转为静态图） | 8 |
| US-12 AC4（菜单实况项） | 9 |
| components.md：`UploadCard`、`IconButton` checked、`ImageMenu` 实况项 | 3–5、7、8、9 |

## 审查修复（2026-10-19 轻量审查）

作者选择只做轻量审查（6 个风险点：401、资源回收、竞态、测试阶段的时序修复、设计偏离、手机内存），不出完整报告。

| # | 问题 | 处理 |
|---|------|------|
| 1 | 上传返回 401 没走会话过期流程（module-spec"上传"已规定） | 修复：`useImageUploads` 的 `onUnauthenticated` → 写文章页 `onSessionExpired`；TC-US05-40 |
| 2 | 回归：上传中作者退格删一个占位，其余任务不再替换（测试阶段把监听挪到 window 冒泡后，"渲染后核对"抢先重置槽位） | 修复：槽位在 window 捕获阶段更新、冒泡阶段通知；TC-US05-39 |
| 3 | module-spec 上传超时仍写 120 秒 | 文档改为按大小计算 |
| 4 | 大图按原尺寸解码，手机上可能压缩失败（退回原图，不中断） | 记入 Backlog [compress-decode-downscale](../../backlog/compress-decode-downscale.md) |
| — | 资源回收、"仅转为静态图"与视频完成的时序 | 未发现问题（后者窗口极小，结果为带实况，可接受） |

## DoD（Sprint 级）

- [x] 所有任务 completed
- [x] `npm run lint`、`npm run check`、`npm test`、`npm run test:e2e`、`npm run test:build` 通过（WebKit 负载超时单独重跑通过即可；结果见 [sprint-6-task-results](../../test/features/F-001-文章写作/validation/sprint-6-task-results.md)）
- [ ] Backlog 验收条件逐条勾选；code-review → verify
