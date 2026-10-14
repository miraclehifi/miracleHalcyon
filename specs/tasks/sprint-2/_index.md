# Sprint 2：写作体验

**状态**: in_progress
**创建**: 2026-10-14
**Feature**: F-001 文章写作（[Backlog: article-writing](../../backlog/article-writing.md)）
**规划方式**: 迭代递进（Sprint 3 见 [tasks/_index.md](../_index.md)）

> 目标：作者能登出；能粘贴 / 拖入 / 选择图片上传；用工具栏和快捷键排版（带悬停提示）；切换视图、同步滚动；断网或会话过期不丢内容；在写文章页和列表删除文章（列表可撤销）；列表有入场动效。
> 粒度按项目规则 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)：一个任务 = 一个可演示的功能点，可跨层，带测试清单（2–5 项）。顺序 = 依赖拓扑排序，同层按（被依赖数 × 不确定性）降序。

## 任务索引

| # | Task | 名称 | 来源 PBI | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|---------|------|---------|----|------|---------|---------|------|
| 1 | [build-format-toolbar](build-format-toolbar.md) | 格式工具栏与快捷键 | article-writing, editor-warm-tooltip | FRONTEND | 表现层 | US-10 | — | 2 | 中 | pending |
| 2 | [implement-image-upload-api](implement-image-upload-api.md) | 图片上传接口（单图） | article-writing | API | 领域 + 数据 + 接口 | US-05 | — | 2 | 中 | pending |
| 3 | [add-image-read-route](add-image-read-route.md) | 图片读取路由 `/img/*` | article-writing | API | 接口层 | US-05 | implement-image-upload-api | 1 | 低 | pending |
| 4 | [add-image-paste-upload](add-image-paste-upload.md) | 粘贴图片上传并插入引用 | article-writing | FRONTEND | 表现层 | US-05 | build-format-toolbar, implement-image-upload-api, add-image-read-route | 1 | 中 | pending |
| 5 | [add-image-drop-and-pick-upload](add-image-drop-and-pick-upload.md) | 拖入与"插入图片"上传 | article-writing | FRONTEND | 表现层 | US-05 | add-image-paste-upload | 1 | 中 | pending |
| 6 | [handle-image-upload-errors](handle-image-upload-errors.md) | 图片上传的拒绝与失败处理 | article-writing | FRONTEND | 表现层 | US-05 | add-image-drop-and-pick-upload | 0 | 低 | pending |
| 7 | [add-icon-button-tooltips](add-icon-button-tooltips.md) | 图标按钮悬停提示 | editor-warm-tooltip | FRONTEND | 表现层 | US-10 | build-format-toolbar | 0 | 中 | pending |
| 8 | [implement-delete-post-api](implement-delete-post-api.md) | 删除文章接口 | article-writing | API | 领域 + 数据 + 接口 | US-09 | — | 2 | 低 | pending |
| 9 | [add-post-list-animated-entry](add-post-list-animated-entry.md) | 列表入场动效与方向键选择 | animated-list | FRONTEND | 表现层 | US-07 | — | 1 | 中 | pending |
| 10 | [add-swipe-row-delete](add-swipe-row-delete.md) | 列表行左滑操作抽屉 | swipe-row-actions | FRONTEND | 表现层 | US-09 | implement-delete-post-api, add-post-list-animated-entry | 1 | 高 | pending |
| 11 | [add-list-delete-undo](add-list-delete-undo.md) | 列表删除撤销与延迟提交 | swipe-row-actions | FRONTEND | 表现层 | US-09 | add-swipe-row-delete | 0 | 中 | pending |
| 12 | [add-editor-delete-action](add-editor-delete-action.md) | 写文章页"删除文章" | article-writing | FRONTEND | 表现层 | US-09 | implement-delete-post-api | 0 | 低 | pending |
| 13 | [add-editor-view-modes](add-editor-view-modes.md) | 视图切换与窄屏 Tab | article-writing | FRONTEND | 表现层 | US-04 | — | 1 | 低 | pending |
| 14 | [add-preview-scroll-sync](add-preview-scroll-sync.md) | 编辑区与预览同步滚动 | article-writing | FRONTEND | 表现层 | US-04 | add-editor-view-modes | 0 | 高 | pending |
| 15 | [add-local-draft-restore](add-local-draft-restore.md) | 本地暂存与恢复横幅 | article-writing | FRONTEND | 表现层 | US-06 | — | 1 | 低 | pending |
| 16 | [handle-session-expired-save](handle-session-expired-save.md) | 保存时会话过期的处理 | article-writing | FRONTEND | 表现层 | US-06 | add-local-draft-restore | 0 | 中 | pending |
| 17 | [implement-logout-endpoint](implement-logout-endpoint.md) | 登出接口 | article-writing | API | 领域 + 接口 | US-02 | — | 1 | 低 | pending |
| 18 | [add-logout-entry](add-logout-entry.md) | 后台"登出"入口 | article-writing | FRONTEND | 表现层 | US-02 | implement-logout-endpoint | 0 | 低 | pending |

共 18 个任务：接口 / 后端 4、前端 14。执行顺序按本表序号。

## 依赖图

```
build-format-toolbar ─┬─▶ add-icon-button-tooltips
                      └─▶ add-image-paste-upload ─▶ add-image-drop-and-pick-upload ─▶ handle-image-upload-errors
implement-image-upload-api ─▶ add-image-read-route ─┘（两者都指向 add-image-paste-upload）
implement-delete-post-api ─┬─▶ add-editor-delete-action
                           └─▶ add-swipe-row-delete ─▶ add-list-delete-undo
add-post-list-animated-entry ─▶ add-swipe-row-delete
add-editor-view-modes ─▶ add-preview-scroll-sync
add-local-draft-restore ─▶ handle-session-expired-save
implement-logout-endpoint ─▶ add-logout-entry
```

## ⚠️ 前置确认项汇总

| 任务 | 事项 |
|------|------|
| handle-session-expired-save | 401 后跳登录页（module-spec、UI 决定 #3）还是新窗口登录（TC-US06-25、UT-63） |
| add-preview-scroll-sync | 按 module-spec 的 `data-line` 逐行插值实现，UT-53（按标题映射）随之改写 |
| implement-logout-endpoint | 无效会话登出：契约 401 vs 验收用例"返回成功" |
| add-logout-entry | 写文章页顶栏"登出"入口的位置 |
| add-image-drop-and-pick-upload | textarea 中放置位置换算为源码偏移的方案 |

## US 覆盖（Sprint 2 范围）

| US | Sprint 2 覆盖 | 留到后续 |
|----|--------------|---------|
| US-02 | 登出接口、登出入口、未保存确认 | — |
| US-04 | 视图切换、窄屏 Tab、同步滚动 | — |
| US-05 | 粘贴 / 拖入 / 选择上传、前端校验、失败处理、上传接口、`/img/*` | — |
| US-06 | 本地暂存与恢复横幅、401 处理 | — |
| US-07 | 入场动效、方向键选择 | — |
| US-09 | 删除接口、写文章页删除、列表左滑删除 + 撤销 | — |
| US-10 | 工具栏、快捷键、悬停提示 | — |
| US-11、US-12 | — | Sprint 3（含上传接口的 `video` 字段） |

## 跨 Feature 影响

| 影响 | 本 Sprint 处理 |
|------|---------------|
| 删除已发布文章需触发读者页重建（F-002） | `implement-delete-post-api` 调用 `onPublicationChanged({ kind: 'deleted' })`，F-001 内为空实现 |
| `/img/*` 供 F-002 读者页使用 | `add-image-read-route` 公开读取，长缓存 |

## Sprint 目标

<!-- Sprint 关闭时根据实际完成的任务生成 -->

## DoD（Sprint 级）

- [ ] 所有任务状态为 completed
- [ ] `npm test` 与 `npm run test:e2e` 全部通过
- [ ] ⚠️ 前置确认项全部有结论，并同步到对应文档
- [ ] 设计文档已反哺"已实现"标记；相关 Backlog 条目（editor-warm-tooltip、swipe-row-actions、animated-list 后台部分）验收项已勾选
