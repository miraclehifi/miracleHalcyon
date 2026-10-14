# add-image-drop-and-pick-upload: 拖入与"插入图片"上传

**Sprint**: Sprint 2
**序号**: 5
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 拖入图片时编辑区高亮"松开以上传"，插入到放置位置；工具栏"插入图片"打开文件选择（可多选）；多张图片并发 2 上传，乱序完成仍按选择顺序插入
- **影响范围**: `MarkdownEditor.tsx`（drag 事件）、`EditorToolbar.tsx`（file input）、`src/lib/upload/`（批量队列）
- **不变量**: 粘贴上传（add-image-paste-upload）行为不变；拖入非文件内容（文本）走浏览器默认行为

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) |
| 设计依据 | [media-upload module-spec §1](../../engineering/frontend/modules/media-upload/module-spec.md)（占位一次确定位置） · [admin-post-editor](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US05-02](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：拖入 photo.jpg 上传并插入到放置位置 | E2E |
| 2 | TC-US05-22 / UT-93：拖放高亮"松开以上传"，dragleave / drop 后隐藏 | 单元 + E2E |
| 3 | TC-US05-03 / UT-94：工具栏选择 diagram.webp 上传；按钮可访问名称"插入图片"、键盘可触发 | 单元 + E2E |
| 4 | TC-US05-05 / UT-90：多张图片乱序完成仍按 a、b、c 顺序插入 | 单元 + E2E |
| 5 | TC-US05-06：恰好 5MB 接受 | E2E |

## DoD（完成定义）

### 实现类
- [x] 拖放高亮层；图片插入到放置位置（TC-US05-02）
- [x] ⚠️ 前置确认项：设计文档未写 textarea 内"放置位置"如何换算为源码偏移 → 已确认：镜像元素测量（见实现记录）
- [x] "插入图片"连接 `<input type="file" multiple accept>`；批量占位一次插入、并发 2

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- **前置确认项结论（2026-10-14 作者选定）**：放置位置用镜像元素测量——`src/lib/editor/textarea-mirror.ts` `offsetFromPoint`：隐藏 div 复刻 textarea 排版（字体、行高、宽度取 `clientWidth` 减左右内边距、`pre-wrap`），对"该偏移处光标是否在落点之前"二分查找，同一行取更近一侧；同步滚动（add-preview-scroll-sync）复用这套镜像
- `MarkdownEditor`：编辑区整体为拖放区（`data-drop-zone`），只响应带文件的拖动；`dragenter` / `dragleave` 计数避免在子元素间移动时闪烁；放在源码区按落点插入，放在标题等处插在光标处；覆盖层文案"松开以上传图片"（页面规格为"…图片或实况照片"，实况照片在 Sprint 3 支持后再改）
- "插入图片"连接隐藏的 `<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif">`，选择后插在光标处
- `src/lib/upload/upload-queue.ts` `createLimiter`：并发 2；`useImageUploads.uploadFiles(files, at?)` 支持指定插入位置
- 测试说明：单元测试先红后绿；E2E 在组件代码完成后才首次运行（未单独跑出红灯），首次运行即全部通过

## 依赖

[add-image-paste-upload](add-image-paste-upload.md)

## 影响的文件

- `src/components/admin/editor/MarkdownEditor.tsx`、`EditorToolbar.tsx`
- `src/lib/upload/upload-queue.ts`（新建）
- `tests/unit/upload/upload-queue.test.ts`、`tests/e2e/editor-image-drop.spec.ts`（新建）

## 回滚策略

回退修改的组件与新增文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| media-upload module-spec | 标注"已实现（拖入 / 选择）" |
