# add-motion-photo-detection: 安卓动态照片识别

**Sprint**: Sprint 3
**序号**: 7
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: JPEG 带 Motion Photo XMP（`Item:Semantic=MotionPhoto` + `Item:Length`，或旧版 `MicroVideoOffset`）时，`extractMotionPhoto` 从文件末尾切出 mp4（校验 `ftyp`），`pairFiles` 产出的 `motion` 项在运行时展开为 `live`，走实况照片上传。完成后作者拖入一张 Pixel 动态照片即得到 `#live` 引用
- **影响范围**: `src/lib/upload/extract-motion-photo.ts`（新建）、`uploadItem`（`motion` 展开）
- **不变量**: 普通 JPEG（无 XMP 或 `ftyp` 校验失败）按普通图片上传，行为不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC3；behaviors BH-03 |
| 设计依据 | [media-upload module-spec §2](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 第 1 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-142](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `extractMotionPhoto`：两种格式切出 mp4、静态图为剩余字节；无 XMP / `ftyp` 失败 → `null` | 单元 |
| 2 | [TC-US11-05](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md) + TC-US11-06：`PXL_0001.MP.jpg`、`MVIMG_0002.jpg` 识别为实况照片，引用带 `#live`，R2 有 `.live.mp4` | E2E |

## DoD（完成定义）

### 实现类
- [ ] 切出的视频同样经 `processVideo`（大小与编码规则一致）
- [ ] 上传的静态图不含内嵌视频字节

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/unit/upload/*`、`tests/e2e/live-photo-upload.spec.ts` 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-live-photo-pair-upload](add-live-photo-pair-upload.md)

## 影响的文件

- `src/lib/upload/extract-motion-photo.ts`（新建）、`src/lib/upload/` 中 `uploadItem` 所在文件
- `tests/unit/upload/extract-motion-photo.test.ts`（新建）、`tests/e2e/live-photo-upload.spec.ts`

## 回滚策略

删除 `extract-motion-photo.ts`，`motion` 项退回为普通图片

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `extractMotionPhoto` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
