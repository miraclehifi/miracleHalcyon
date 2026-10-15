# add-motion-photo-detection: 安卓动态照片识别与上传

**Sprint**: Sprint 3
**序号**: 7
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

> 2026-10-15 起成为实况照片上传的主线（唯一入口），苹果相关已去掉（[drop-apple-live-photo](../../backlog/drop-apple-live-photo.md)）。

## 意图声明

- **改动意图**: JPEG 带 Motion Photo XMP（`Item:Semantic=MotionPhoto` + `Item:Length`，或旧版 `MicroVideoOffset`）时，`extractMotionPhoto` 从文件末尾定位视频起点（校验 `ftyp`），再按 MP4 顶层 box 截到主视频 `mdat` 结束（OPPO 在主视频后追加副视频与私有尾部），`uploadItem` 把该图片展开为 `live` 项，走任务 6 的视频处理与图片 + 视频上传。完成后作者拖入或用"插入图片"选择一张安卓动态照片即得到 `#live` 引用，降级与失败按规格提示
- **影响范围**: `src/lib/upload/extract-motion-photo.ts`（新建）、`uploadItem`（JPEG 检测后展开为 `live`）
- **不变量**: 普通 JPEG（无 XMP 或 `ftyp` 校验失败）按普通图片上传，行为不变；可接受的文件类型不变
- **不在本任务**: —

## 样本

- 真实样本：OPPO（ColorOS）动态照片 `tests/fixtures/live/IMG20260516172228.jpg`（Motion Photo v1 XMP + `OpCamera:*`；主视频 HEVC 3840×2880 ≈ 16.4MB，结构见 [ADR-006"验证结果"](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)）
- 派生夹具（夹具脚本基于 OPPO 样本生成）：`MVIMG_0002.jpg`（旧版 `MicroVideoOffset`）、`IMG_4000.jpg`（内嵌 HEVC 副视频）、`IMG_2100.jpg` / `IMG_2101.jpg`（内嵌 H.264 视频 10,485,760 B / +1）、`IMG_3000.jpg`（改名）
- Pixel（`PXL_*.MP.jpg`）、旧版 `MVIMG_*.jpg` 按同一 XMP 规则识别，不另备真机样本

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC1、AC3、AC5、AC7、AC8；behaviors BH-01、BH-03、BH-04、BH-06、BH-08、BH-09、BH-12 |
| 设计依据 | [media-upload module-spec §1–§2](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 第 1 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-142](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `extractMotionPhoto`：两种格式切出 mp4、静态图为剩余字节；OPPO 按 box 截到主视频；无 XMP / `ftyp` 失败 → `null` | 单元 |
| 2 | [TC-US11-01](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md) + TC-US11-17：拖入 / "插入图片"选择 OPPO 动态照片，只插入一条 `#live` 引用，R2 有 `.live.mp4` | E2E |
| 3 | TC-US11-05 + TC-US11-06 + TC-US11-07：`Item:Length` 与 `MicroVideoOffset` 两种格式、静态图不含视频字节、普通 JPEG 不误识别；混合批次按顺序、只有动态照片带 `#live` | E2E |
| 4 | TC-US11-09 + TC-US11-10 + TC-US11-16：只转封装后 16.4MB 退回普通图片并警示；10MB 边界；不支持 H.264 时保留 HEVC 并警示（任务 6 的处理，经本任务入口驱动） | E2E |
| 5 | TC-US11-14：上传失败，图片与视频都不保留 | E2E |

## DoD（完成定义）

### 实现类
- [ ] 切出的视频经 `processVideo`（大小与编码规则与任务 6 一致）
- [ ] 上传的静态图不含内嵌视频字节
- [ ] TC-US11-21（性能 < 15s）在 Sprint 末 verify 时跑

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/unit/upload/*`、`tests/e2e/live-photo-upload.spec.ts` 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-live-photo-pair-upload](add-live-photo-pair-upload.md)

## 影响的文件

- `src/lib/upload/extract-motion-photo.ts`（新建）、`src/lib/upload/` 中 `uploadItem` 所在文件
- `tests/unit/upload/extract-motion-photo.test.ts`（新建）、`tests/e2e/live-photo-upload.spec.ts`
- 夹具脚本（生成派生夹具，新建）、`tests/fixtures/live/`

## 回滚策略

删除 `extract-motion-photo.ts`，动态照片退回为普通图片

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `extractMotionPhoto` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
