# handle-image-upload-errors: 图片上传的拒绝与失败处理

**Sprint**: Sprint 2
**序号**: 6
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 上传前按扩展名 / MIME 与大小拒绝（"仅支持 png、jpg、webp、gif"、"图片不能超过 5MB"），不发请求、不插占位；断网、500、请求中断时移除对应占位并 `Toast/Error`（带文件名），作者在上传期间输入的文字保留；混合拖入时只插入合法图片
- **影响范围**: `src/lib/upload/validate-file.ts`（新建）、`upload-queue.ts`、`MarkdownEditor.tsx`
- **不变量**: 合法图片的上传路径（任务 5、6）不变

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) |
| 设计依据 | [media-upload module-spec §3](../../engineering/frontend/modules/media-upload/module-spec.md) · [admin-post-editor"弹层与提示"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-85 / 86 / 92](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：`validateImageFile` 类型与大小边界；校验失败不调用上传 | 单元 |
| 2 | [TC-US05-07](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：5MB+1 字节前端拒绝 | E2E |
| 3 | TC-US05-09、TC-US05-10、TC-US05-11：svg、pdf 拒绝；混合拖入只插入合法图片 | E2E |
| 4 | TC-US05-12、TC-US05-13：离线 / 500 / 中断时移除占位并提示 | E2E |
| 5 | TC-US05-25：上传失败时上传期间输入的文字保留 | E2E |

## DoD（完成定义）

### 实现类
- [x] 前端校验按 media-upload module-spec §3（本 Sprint 只接受 png、jpg、jpeg、webp、gif；heic、mov 等在 Sprint 3 US-11 放开）
- [x] 失败只移除该项占位，不影响同批其他项

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `src/lib/upload/validate-file.ts`：`validateImageFile`（有 MIME 按 MIME，无 MIME 看扩展名；只收 png / jpeg / webp / gif，> 5 MiB 拒绝）、`uploadErrorMessage`（服务端 `FILE_TOO_LARGE` / `UNSUPPORTED_TYPE` 沿用前端文案，其余含网络错误、超时、5xx、0 字节被拒统一"上传失败，请重试"）、`withFileName`（一批多张时"文件名：文案"）
- `useImageUploads`：被拒文件不插占位、不上传；失败移除对应占位后提示；`MarkdownEditor` 用 `useToast` 显示常驻错误提示（`role="alert"`）；粘贴 / 拖入不再预先按 `image/*` 过滤，交给校验给出提示
- `uploadImage` 加 60 秒超时（`AbortSignal.timeout`），TC-US05-13 的"超时"一项以此配置为准，E2E 未覆盖（需等 60 秒）
- 0 字节文件：前端规格未定义，前端不拦截，服务端 400 后提示"上传失败，请重试"
- 测试说明：单元测试先红后绿；E2E 在实现完成后才首次运行，首次即全部通过

## 依赖

[add-image-drop-and-pick-upload](add-image-drop-and-pick-upload.md)

## 影响的文件

- `src/lib/upload/validate-file.ts`（新建）、`src/lib/upload/upload-queue.ts`
- `src/components/admin/editor/MarkdownEditor.tsx`
- `tests/unit/upload/validate-file.test.ts`、`tests/e2e/editor-image-errors.spec.ts`（新建）

## 回滚策略

回退新增 / 修改的文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| media-upload module-spec §3 | 标注"已实现（静态图）" |
