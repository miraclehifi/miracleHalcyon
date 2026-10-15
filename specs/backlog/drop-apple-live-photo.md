# 实况照片去掉苹果相关部分（HEIC、HEIC + MOV、iPhone 流程）

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | 范围调整 |
| 优先级 | P1-High |
| 来源 | 作者决定（2026-10-14 spike 时"iPhone 暂不考虑"；2026-10-15 明确"不考虑 iPhone，不考虑苹果系统"） |
| 日期 | 2026-10-15 |
| 创建者 | miraclehifi |

## 描述

F-001 US-11（实况照片上传）原本覆盖三种来源：iPhone 实况照片（同名 HEIC + MOV）、单张 HEIC、安卓动态照片（一个 JPEG 内嵌 mp4）。作者决定不考虑 iPhone / 苹果系统，只保留安卓动态照片；同名"图片 + 视频"配对也不做（安卓动态照片本身就是一个文件，用不到配对）。

Sprint 3 的任务 5–7 保持三个任务，只删苹果部分：

| 任务 | 去掉 | 保留 |
|------|------|------|
| 5 add-heic-upload | HEIC / HEIF 解码（`heic-to`）、接受 heic / heif 扩展名 | 每张图计算主色随上传上报；"处理中…"→"上传中…"占位阶段 |
| 6 add-live-photo-pair-upload | `pairFiles` 同名配对、接受 mov / mp4 文件、拖放文案"或实况照片" | `processVideo`（支持 H.264 时转码去音轨，否则只转封装并警示，> 10MB 丢弃并警示）；图片和视频同一请求上传，任一步失败不留半对 |
| 7 add-motion-photo-detection | — | 安卓动态照片识别切视频（OPPO 样本 `tests/fixtures/live/`），走任务 6 的视频处理与上传 |

## 目标与验收

**目标**: 规格、测试规格、任务计划里不再有苹果相关的需求和待办，任务 5–7 按新范围可直接开工。

**验收条件**:
- [x] US-11 story / behaviors / 验收用例删除或改写 HEIC、HEIC + MOV、iPhone / iOS 相关的 AC、BH、TC，覆盖矩阵同步
- [x] 前端单元规格删除 `pairFiles`、`decodeHeic` 相关用例，其余编号不变
- [x] media-upload 模块规格、ADR-006、feature-scope / feature-architecture / nfr 中的苹果相关内容同步
- [x] US-12 与 admin-post-editor"图片写法"删除"从 iPhone 上传实况照片"一节，components.md `ImageSyntaxHelp` 同步
- [x] Sprint 3 索引、任务 5–7 文件按新范围改写；前置确认项中"等 iPhone 样本"一行关闭
- [x] [ios-live-photo-shortcut](ios-live-photo-shortcut.md) 标为 discarded
- [x] 服务端上传接口不变（视频只收 mp4 类 brand，`qt` 本来就拒绝）

## 影响分析

- **规格**: 见验收条件；历史记录（conversation-log、已完成任务、验证记录）不改
- **代码**: 只影响尚未开始的任务 5–7；已完成的上传接口（任务 3）、预览播放（任务 9）不变
- **不变**: 预览中的实况照片播放、`#live` 写法、`.live.mp4` 命名

## 路由

SDD-Lite（范围收窄，无新领域、无架构变更）：先同步规格，再按 Sprint 3 任务 5 → 6 → 7 实现。

## 估算

- **规模**: S（规格同步）
