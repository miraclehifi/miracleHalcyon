# strip-reader-upload-placeholders: 读者页不渲染上传占位

**Sprint**: Sprint 6
**序号**: 2
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/markdown/`，影响 F-002 读者页）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: `renderMarkdown` 增加 `uploadPlaceholders` 选项：预览传 true，占位输出为 `div[data-upload-placeholder][data-placeholder-index]` 挂载点（暂时仍由现有占位块渲染，任务 3 换成 `UploadCard`）；默认（读者页）删除占位，只剩占位的段落一并删除。识别"上传失败"占位
- **影响范围**: `src/lib/markdown/render.ts`、`plugins/upload-placeholder.ts`、预览 Worker 调用处（传 `uploadPlaceholders: true`）
- **不变量**: 预览中处理中 / 上传中占位的显示不变；读者页其他内容输出不变
- **不在本任务**: `UploadCard`（任务 3）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC10；BH-20 |
| 设计依据 | [markdown module-spec §2.1](../../engineering/frontend/modules/markdown/module-spec.md) · [reader module-spec](../../engineering/frontend/modules/reader/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | markdown 单元：三种占位在默认选项下被删除、只剩占位的段落不留空 `p`；`uploadPlaceholders: true` 时输出挂载点与序号 | 单元 |
| 2 | [TC-US05-38](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：构建夹具中 `pub_body` 含占位的已发布文章，构建产物不含任何占位痕迹（`npm run test:build`） | 构建 |
| 3 | TC-US05-23（预览侧回归）：预览中占位仍可见、完成后替换 | E2E |

## DoD（完成定义）

### 实现类
- [x] `RenderOptions.uploadPlaceholders` 已加入并在预览 Worker 中传 true
- [x] 读者页构建、RSS 等其他调用方不传该选项

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

—（无）

## 影响的文件

- `src/lib/markdown/render.ts`、`src/lib/markdown/plugins/upload-placeholder.ts`、`src/lib/markdown/worker.ts`
- `tests/unit/markdown/`（占位相关测试）、`tests/build/` 夹具与断言
- `tests/e2e/editor-image-paste.spec.ts`

## 回滚策略

去掉选项，插件恢复为始终渲染占位块

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [markdown module-spec §2.1](../../engineering/frontend/modules/markdown/module-spec.md) | "现状"段改为"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |

## 执行记录（2026-10-16）

- 单元：`tests/unit/markdown/upload-placeholder.test.ts` 改为 2 项（预览挂载点 / 读者端删除），`tests/unit/markdown/*` 20 / 20
- 构建：`reader-output.test.ts` 新增 TC-US05-38（夹具 `filler-20` 正文追加三种占位，独占段落与行内各一），`npm run test:build` 6 / 6
- E2E 回归：`editor-image-paste`、`editor-scroll-sync`、`editor-preview`（chromium + webkit）8 / 8；TC-US11-22（chromium-media）通过
- 挂载点：独占段落时整段替换为 `div`（保留源码位置，同步滚动的 `data-line` 不丢），行内为 `span`；暂仍填占位文字，任务 3 换成 `UploadCard`
