# implement-publish-action: 实现"发布"操作

**Sprint**: Sprint 1
**序号**: 67
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现"发布"操作
- **影响范围**: `src/components/admin/editor/PublishActions.tsx`, `src/components/admin/editor/EditorTopBar.tsx`, `tests/e2e/editor-publish.spec.ts`
- **不变量**: 不改变依赖任务（wire-autosave-to-editor、implement-publish-endpoint、build-toast-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

[TC-US08 发布草稿](../../test/features/F-001-文章写作/acceptance/post-management/US-08-tests.md)：草稿点"发布"→ 先保存再发布 → 徽标变"已发布"、提示"已发布，几分钟后读者可见"；`GET /api/posts/:slug` 返回 200

## DoD（完成定义）

### 实现类
- [x] 主按钮"发布"（加载中禁用）；发布前 flush 自动保存
- [x] 422 → 打开抽屉、聚焦首个缺失字段、常驻错误"发布前请填写：…"

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `PublishActions`：点击先 `flush()` 自动保存再 `POST /publish`；请求中 `disabled` + `aria-busy` + 旋转 loader 图标，重复点击无效
- 200 → 更新徽标与主按钮（"发布更新"），轻提示"已发布，几分钟后读者可见"（发布更新为"已发布更新"）
- 422 → 常驻错误"发布前请填写：…"；标题 / slug / 正文输入框 `aria-invalid`（slug 显示"请填写 slug"并打开抽屉），聚焦第一个缺少的字段；改了对应字段后清除。新建且从未保存（无 id）时按三项全缺处理
- 409 SLUG_TAKEN → slug 字段错误并打开抽屉；flush 失败或其他错误 → "发布失败，请重试"；401 跳转在 Sprint 2
- `PostEditorPage` 包一层 `ToastProvider`；标题 / 正文 / slug 输入框加 id（`post-title` / `post-body` / `post-slug`）供聚焦
- 422 路径另用临时 E2E 核对（chromium + webkit 通过），正式用例 TC-US08-19 未纳入本 Sprint

## 依赖

[wire-autosave-to-editor](wire-autosave-to-editor.md), [implement-publish-endpoint](implement-publish-endpoint.md), [build-toast-component](build-toast-component.md)

## 影响的文件

- `src/components/admin/editor/PublishActions.tsx`
- `src/components/admin/editor/EditorTopBar.tsx`
- `tests/e2e/editor-publish.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
