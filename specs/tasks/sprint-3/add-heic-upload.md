# add-heic-upload: HEIC 转换、主色与"处理中"占位

**Sprint**: Sprint 3
**序号**: 5
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/` + 编辑器）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 上传链路加入预处理阶段：占位先插入 `![处理中…]()`，HEIC / HEIF 经 `decodeHeic`（原生 → 动态 import `heic-to` → 抛 `HEIC_DECODE_FAILED`）转为 JPEG 0.9（> 5MB 时 0.8、0.7 重试），所有图片用 `dominantColor` 计算主色随请求上报，开始上传后占位改为 `![上传中…]()`。完成后作者拖入单张 HEIC 在 Chrome 也能插入普通 JPEG 引用，key 带真实主色
- **影响范围**: `src/lib/upload/`（新增 `decode-heic.ts`、`dominant-color.ts`、占位阶段状态机）、`validate-file.ts`（接受 heic / heif 扩展名与 MIME）、`use-image-uploads.ts`、`upload-client.ts`（`rgb`、`width`、`height` 字段）
- **不变量**: png / jpg / webp / gif 的占位、大小、类型、失败处理沿用 US-05（`tests/unit/upload/*`、US-05 E2E 保持通过）
- **不在本任务**: 视频配对与处理（add-live-photo-pair-upload）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC2、AC4；behaviors BH-02、BH-05、BH-13 |
| 设计依据 | [media-upload module-spec §1–§3](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 第 2、4 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [admin-post-editor"上传占位"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-143](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `decodeHeic` 三个分支 | 单元 |
| 2 | UT-145 `dominantColor`：纯色、黑白各半避开极值、6 位小写 hex | 单元 |
| 3 | UT-146 占位阶段状态机：`processing` → `uploading` → 替换 / 移除 | 单元 |
| 4 | [TC-US11-03](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md)（chromium）+ TC-US11-04（webkit 原生解码）：上传的是 JPEG，引用不带 `#live` | E2E |
| 5 | TC-US11-18 + TC-US11-22：损坏 HEIC 移除占位、提示"无法读取 broken.heic，请换一张图片"、不发请求；首次加载组件时"处理中…"→"上传中…"与预览占位块 | E2E |

## DoD（完成定义）

### 实现类
- [ ] `heic-to` 只在遇到 HEIC 时动态 import
- [ ] 主色对所有图片计算（此前服务端缺省 `808080`）
- [ ] 占位块文案"图片处理中… 文件名"沿用 `upload-placeholder.ts`

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/unit/upload/*`、US-05 上传 E2E 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[spike-browser-media-processing](spike-browser-media-processing.md)

## 影响的文件

- `src/lib/upload/decode-heic.ts`、`dominant-color.ts`（新建）、`validate-file.ts`、`use-image-uploads.ts`、`upload-client.ts`
- `tests/unit/upload/decode-heic.test.ts`、`dominant-color.test.ts`、`placeholder-phase.test.ts`（新建）、`tests/e2e/live-photo-upload.spec.ts`（新建）

## 回滚策略

回退 `src/lib/upload/` 的预处理阶段，恢复为直接上传；`validate-file.ts` 恢复只接受四种格式

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `decodeHeic`、`dominantColor` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
