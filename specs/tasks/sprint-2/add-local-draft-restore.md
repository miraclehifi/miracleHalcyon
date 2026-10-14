# add-local-draft-restore: 本地暂存与恢复横幅

**Sprint**: Sprint 2
**序号**: 15
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/autosave/` + 组件）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 每次编辑（节流 500ms）写 `localStorage['mh:draft:{id|new}']`；服务端保存成功且内容一致时删除；加载时暂存比服务端新且内容不同 → 显示 `RestoreBanner`（"恢复" / "丢弃"）
- **影响范围**: `src/lib/autosave/local-draft.ts`（新建）、`useAutosave.ts`、`controller.ts`、`PostEditorPage.tsx`、`src/components/ui/RestoreBanner.tsx`（新建）
- **不变量**: 自动保存状态机已有转换不变（`tests/unit/admin/autosave.test.ts` 保持通过）；localStorage 不可用时自动保存照常

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-06 自动保存](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [editor module-spec §2"本地暂存""恢复判断"](../../engineering/frontend/modules/editor/module-spec.md) · [components.md `RestoreBanner`](../../ui/components.md) · [admin-post-editor"保存状态"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-76 / UT-78](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：失败时写暂存；`compareLocalStash` 判定（更新 / 更旧 / 相等 / 内容相同） | 单元 |
| 2 | UT-79：恢复提示条文案与"恢复" / "丢弃"回调 | 单元 |
| 3 | [TC-US06-11](../../test/features/F-001-文章写作/acceptance/post-editor/US-06-tests.md)：断网本地暂存，恢复网络后自动重试成功 | E2E |
| 4 | TC-US06-13、TC-US06-14：本地暂存更新 → 提示并恢复 / 丢弃 | E2E |
| 5 | TC-US06-15：本地暂存更旧 / 时间相等不提示 | E2E |

## DoD（完成定义）

### 实现类
- [x] 暂存读写包 try/catch；新建页 `mh:draft:new` 在首次创建成功后迁到 `mh:draft:{id}`
- [x] 恢复后内容进入 `dirty` 并按正常流程保存

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e`（含 `editor-autosave.spec.ts`）全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `src/lib/autosave/local-draft.ts`：`readLocalDraft` / `writeLocalDraft` / `clearLocalDraft`（全部 try/catch，损坏的值读为 null）、`compareLocalStash`（严格更新且内容不同 → `promptRestore`；新建页无服务端版本时非空即提示）、`createLocalDraftStash`（节流 500ms，内容在写入时才读取——页面调用 `edit()` 时新状态尚未提交；`move` new → id；`dispose` 写掉节流中的内容）
- 控制器接 `stash`：每次 `edit()` 都暂存（保存中也是）；保存成功且期间没有再编辑 → 清除；新建创建成功 → `move(null, id)`；新增 `clearStash()`（删除文章成功后调用，取消节流中的写入）
- `RestoreBanner`：文案、按钮与样式按设计稿（标题"发现未同步的本地内容，是否恢复？"，说明"本地暂存于 M月D日 HH:mm，比服务端版本更新。丢弃后无法找回。"，"丢弃本地内容" / "恢复本地内容"）；`section` 以标题命名
- `PostEditorPage`：水合后读一次暂存并判定；`discard` 时清掉过期暂存；恢复 → 替换全部字段（含 slug 跟随状态）、标记 dirty，提交后立即 `flush`（不等 2 秒）；丢弃 → 清暂存。横幅在顶栏下方
- 偏差：
  - 暂存 key 按 module-spec 为 `mh:draft:{id|new}`（TC-US06-11 原写 `draft-stash:{id}`，用例已注明以实现为准）
  - 横幅文案与按钮名按设计稿（TC-US06-13 / 15、UT-79 原写"发现未同步的本地内容（14:35），是否恢复？"与"恢复" / "丢弃"），已同步修改用例
  - TC-US06-13 / 15 无法指定服务端 `updatedAt`，E2E 改为以实际 `updatedAt` 为基准偏移暂存时间
- 已知限制：横幅显示期间作者不做选择直接编辑，暂存会被新的编辑覆盖（原本地版本不再可恢复）
- 测试说明：单元测试先红后绿；E2E 在实现之后编写，未单独跑红灯。全量 E2E 首轮 1 个失败：webkit TC-US04-14 首次预览渲染在并行负载下超过 5 秒（WebKit 冷编译语法规则），该等待放宽到 15 秒
- 测试：`tests/unit/admin/local-draft.test.ts`（UT-76 / 78 与 new → id 迁移）、`tests/unit/ui/restore-banner.test.tsx`（UT-79）；`tests/e2e/editor-local-draft.spec.ts`（TC-US06-11 / 13 / 14 / 15）

## 依赖

无

## 影响的文件

- `src/lib/autosave/local-draft.ts`（新建）、`useAutosave.ts`、`controller.ts`
- `src/components/ui/RestoreBanner.tsx`（新建）、`src/components/admin/editor/PostEditorPage.tsx`
- `tests/unit/admin/local-draft.test.ts`、`tests/e2e/editor-local-draft.spec.ts`（新建）

## 回滚策略

回退新增 / 修改的文件；浏览器残留的 `mh:draft:*` 不影响旧版本

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| editor module-spec §2 | "Sprint 2 接入"注记更新为已实现 |
