# add-image-paste-upload: 粘贴图片上传并插入引用

**Sprint**: Sprint 2
**序号**: 4
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`、`src/lib/editor/` + 编辑器组件 + markdown 占位渲染）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 在源码区粘贴图片 → 光标处插入占位 `![上传中…]()` → 调用上传接口 → 按出现顺序替换为 `![alt](url)`；预览区先显示占位块，替换后显示图片
- **影响范围**: `src/lib/editor/format-commands.ts`（占位三函数）、`src/lib/upload/`（新建：`upload-client.ts`、alt 生成）、`MarkdownEditor.tsx`、`src/lib/markdown/render.ts`（占位块）
- **不变量**: 普通文本粘贴行为不变；`applyEdit` 保证占位插入与替换可撤销；预览渲染其他内容不变（`tests/unit/markdown/*` 保持通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/behaviors.md) |
| 设计依据 | [editor module-spec §1](../../engineering/frontend/modules/editor/module-spec.md)（占位按出现顺序定位） · [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) · [admin-post-editor](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-87 / 88 / 89](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：`insertPlaceholder` / `replacePlaceholder` / `removePlaceholder` | 单元 |
| 2 | ED-UT-03 + UT-91：3 个占位，第 1 个前插入 1000 字后第 2 个先完成，只替换第 2 个；文件名 → alt 转义 | 单元 |
| 3 | [TC-US05-01](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：粘贴 200KB png 上传并插入引用 | E2E |
| 4 | TC-US05-23：占位文本出现与替换、预览区渲染图片 | E2E |
| 5 | TC-US05-24：上传期间在占位符前继续输入 | E2E |

## DoD（完成定义）

### 实现类
- [x] 占位三函数 + 编辑器内存中的上传任务有序列表；作者删掉占位时该任务完成后不再插入
- [x] markdown 模块把空 URL 且 alt 为"上传中…"/"处理中…"的图片渲染为占位块
- [x] 剪贴板无名图片 alt 为 `image`

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `format-commands.ts`：`insertPlaceholders(cursor, count)`（一批各占一行）、`replacePlaceholder` / `removePlaceholder`（按第 i 个占位定位，越界返回 null）、`countPlaceholders` / `placeholdersBefore`；`applyEdit` 新增 `preserveSelection`（后台写入：作者选区按长度差平移；源码区不在焦点时走 `setRangeText`，不抢焦点）
- `src/lib/upload/upload-client.ts`：`uploadImage`（错误按契约 code / message 抛 `UploadError`）、`altFromFileName`、`imageMarkdown`；`use-image-uploads.ts`：任务有序列表与占位按出现顺序对应，新批次按光标前的占位数插入列表；占位数 ≠ 任务数（作者删了占位）时完成后不插入
- markdown 插件 `plugins/upload-placeholder.ts`（sanitize 之后）：空地址且 alt 为"上传中…"/"处理中…"的图片 → `span[data-upload-placeholder]` 占位块；`MarkdownPreview` 按出现顺序补文件名（"图片上传中… image.png"）
- 本任务的失败处理只移除占位（无提示），提示与前端校验在 handle-image-upload-errors；并发上限 2 在 add-image-drop-and-pick-upload；主色在 Sprint 3（此前服务端记 `808080`）
- E2E 用 `holdUploads` 扣住上传请求再断言上传中状态（固定 2 秒延迟在 WebKit 并行负载下预览渲染赶不上，首轮全量出现 1 次失败）

## 依赖

[build-format-toolbar](build-format-toolbar.md)（`applyEdit`）、[implement-image-upload-api](implement-image-upload-api.md)、[add-image-read-route](add-image-read-route.md)

## 影响的文件

- `src/lib/editor/format-commands.ts`、`src/lib/upload/upload-client.ts`（新建）
- `src/components/admin/editor/MarkdownEditor.tsx`、`src/lib/markdown/render.ts`
- `tests/unit/editor/placeholders.test.ts`、`tests/e2e/editor-image-paste.spec.ts`（新建）

## 回滚策略

回退新增 / 修改的文件（已上传的测试图片按测试清理约定删除）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| editor / media-upload module-spec | 标注"已实现（粘贴）" |
