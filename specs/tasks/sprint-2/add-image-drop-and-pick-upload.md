# add-image-drop-and-pick-upload: 拖入与"插入图片"上传

**Sprint**: Sprint 2
**序号**: 5
**状态**: pending
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
- [ ] 拖放高亮层；图片插入到放置位置（TC-US05-02）
- [ ] ⚠️ 前置确认项：设计文档未写 textarea 内"放置位置"如何换算为源码偏移，实现时确认方案（及不支持时的退路）
- [ ] "插入图片"连接 `<input type="file" multiple accept>`；批量占位一次插入、并发 2

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

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
