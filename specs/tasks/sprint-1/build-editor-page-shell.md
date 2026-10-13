# build-editor-page-shell: 实现写文章页框架与加载

**Sprint**: Sprint 1
**序号**: 59
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现写文章页框架与加载
- **影响范围**: `src/pages/admin/posts/new.astro`, `src/pages/admin/posts/[id].astro`, `src/components/admin/editor/PostEditorPage.tsx`, `src/components/admin/editor/EditorTopBar.tsx`, `tests/e2e/editor-load.spec.ts`
- **不变量**: 不改变依赖任务（implement-get-post-endpoint、build-status-badge-component、build-icon-button-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) · [editor](../../engineering/frontend/modules/editor/module-spec.md) |

## 唯一测试（红 → 绿）

[TC-US03 打开已有文章显示最新内容](../../test/features/F-001-文章写作/acceptance/post-editor/US-03-tests.md)：访问 `/admin/posts/:id` 显示该文章标题与正文；不存在的 id 显示"文章不存在或已被删除"

## DoD（完成定义）

### 实现类
- [x] `src/pages/admin/posts/new.astro`、`[id].astro`（SSR 读取文章作为 props）
- [x] `PostEditorPage.tsx` 状态容器 + `EditorTopBar.tsx`（返回、徽标、视图切换占位、设置按钮、主按钮占位）
- [x] 桌面三栏布局（编辑 / 预览 / 设置抽屉）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `src/pages/admin/posts/new.astro`（`initial=null`）与 `[id].astro`（服务端 `getForEdit`；id 非法或不存在 → HTTP 404 + 静态"文章不存在或已被删除 / 返回文章列表"，不加载编辑器）
- `PostEditorPage`：草稿字段状态 + 桌面三栏（编辑 | 预览 | 设置抽屉 340px）；< 1024px 只显示编辑区，抽屉浮层；抽屉默认新建打开、编辑关闭
- `EditorTopBar`："← 文章"（手机为图标"返回文章列表"）、分隔线、状态徽标、保存状态插槽、设置（`aria-pressed`，手机图标"文章设置"）、主按钮插槽
- Sprint 1 不渲染视图切换（US-04 Sprint 2 接入前固定并排，避免不可用的控件）；主按钮"发布 / 发布更新"在 implement-publish-action 接线前禁用；编辑区暂为基础标题输入框 + 源码 textarea，预览暂只显示标题，由后续任务替换
- 目视检查：长标题在单行输入框中被截断（设计稿标题会换行）→ build-markdown-editor-pane 改为自适应高度
- 文档对齐：编辑页路由统一为 `/admin/posts/:id`（10 个 behaviors / 验收文件共 16 处去掉 `/edit`；US-01 登录回跳用例中的 `abc/edit` 只是任意 next 路径，未改）
- 过程记录：一次 E2E 启动时 preview 报 "fetch failed: bad port" 后连接被拒，随后 3 次运行均正常，判断为启动竞态

## 依赖

[implement-get-post-endpoint](implement-get-post-endpoint.md), [build-status-badge-component](build-status-badge-component.md), [build-icon-button-component](build-icon-button-component.md)

## 影响的文件

- `src/pages/admin/posts/new.astro`
- `src/pages/admin/posts/[id].astro`
- `src/components/admin/editor/PostEditorPage.tsx`
- `src/components/admin/editor/EditorTopBar.tsx`
- `tests/e2e/editor-load.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
