# add-game-form-fields: 录入表单的游戏平台与 IGDB 封面链接

**Sprint**: Sprint 9
**序号**: 13
**状态**: completed（2026-10-27）
**类别**: FRONTEND
**架构层级**: 表现层（admin：`src/components/admin/media/`、`src/lib/admin/shelf-client.ts`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [game-case-shelf](../../backlog/game-case-shelf.md)

## 意图声明

- **改动意图**:
  - `MediaEntryForm`：分类为 `game` 时显示"平台"原生 `<select>`（开发商与年份之间，默认 PS5）与全宽"封面链接（IGDB）"`Field`；封面左栏隐藏上传 / 更换 / 移除，缩略图按原图比例（`object-fit: contain`，宽 128）、无链接时 3:4 虚线框；输入后 300ms 用前端 `normalizeIgdbCoverUrl` 校验并刷新预览
  - 切换分类时两组值在页面内保留，只提交当前分类适用的字段（`game` 提交 `platform`、`coverUrl`，不带 `cover` 文件）
  - 错误：前端格式错误"请粘贴 images.igdb.com 的封面图片地址"（不发请求）；422 `COVER_LINK_UNREACHABLE` → 链接字段"封面链接打不开，请检查后重试"并聚焦
  - 识别结果为游戏：`missing` 含 `cover` 时提示"未识别：封面，游戏封面请粘贴 IGDB 图片链接"，平台保持当前值
  - `MediaEntryRow` 游戏缩略图用 `coverUrl`，`object-fit: contain`
- **影响范围**: 录入 / 编辑页、后台列表游戏行；其他分类表单行为不变
- **不变量**: 非游戏封面交互不变；识别不覆盖状态、评分、日期、短评
- **不在本任务**: 接口与校验（任务 12）；手机稿另画（按 admin-media.md"响应式"顺序排列字段即可）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md) AC11；BH-23、24、25 · [US-02](../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/story.md) AC9 |
| 设计依据 | [admin-media.md](../../ui/pages/admin-media.md)"游戏专属""切换分类"、校验表 · admin.pen 11g |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-19 条目表单游戏字段（`tests/unit/admin/media-entry-form.test.tsx` 扩展） | 单元 |
| 2 | UT-10 补游戏封面提示文案（`tests/unit/admin/recognize-box.test.tsx` 扩展） | 单元 |
| 3 | TC-US01-29（`page.route` 拦截 images.igdb.com 返回夹具图；打桩保存接口）——`tests/e2e/admin-media-form.spec.ts` | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 11g 一致；手机宽度下字段顺序为 开发商 → 平台 → 年份 → 封面链接（1440 / 390 截图对照 admin-media.md"游戏专属"文字规格；未在 Pencil 中逐像素对照）
- [x] 测试清单全部由红变绿；影响范围：`tests/e2e/admin-media-*.spec.ts`、`tests/unit/admin/media-entry-form.test.tsx`、`tests/unit/admin/recognize-box.test.tsx` 原有用例 chromium 通过，本任务 E2E 补跑 webkit（若 WebKit 图片请求不经 `page.route`，预览比例断言只在 chromium 跑并注明）

## 实现记录（2026-10-27）

- 新建 `IgdbCoverField`（左栏只预览：300ms 后 `normalizeIgdbCoverUrl`，宽 128 `object-contain`，无链接 / 不合规 / 加载失败为 3:4 虚线框）；平台下拉与"封面链接（IGDB）"在 `MediaEntryForm` 字段区
- `shelf-form`：`EntryForm` 加 `platform`（默认 `ps5`）、`coverUrl`；`validateForm` 只在游戏且非空时校验链接；`toEntryFields` 只在游戏时带 `platform`、`coverUrl`；游戏保存不带封面文件
- `recognize.missingTexts`：游戏缺封面 → "未识别：封面，游戏封面请粘贴 IGDB 图片链接"
- `MediaEntryRow`：游戏缩略图 `object-contain`（补单元用例 1 项）
- 测试：UT-19 5 项、UT-10 改游戏文案；`shelf-form`、列表 / 行测试夹具补新字段；TC-US01-29 E2E 在实现之后补写，**没有先跑出红色**，chromium / webkit 各 1 / 1（WebKit 下图片也经 `page.route`，比例断言仍只在 chromium 跑）
- 影响范围补改：`admin-media-list.spec.ts` TC-US01-23 通过接口建游戏未带 `platform`，任务 12 后 400 → 补 `platform`，E2E 辅助 `EntryFields` 加 `platform` / `coverUrl`
- E2E 环境：`SITE_ORIGIN` 固定 `http://localhost:4321`，其他端口的 preview 登录会 403；当时 4321 被一个已损坏的 `astro dev`（500，Vite 预构建缓存失效）占用，经作者同意停掉后在 4321 起 preview 测试，结束后停掉

## 依赖

12（接口字段与错误码）、5（表单）、6（识别框）

## 影响的文件

- `src/components/admin/media/{MediaEntryForm,ShelfCoverField,MediaEntryRow,RecognizeBox}.tsx`（改）、`src/components/admin/media/IgdbCoverField.tsx`（新建，若封面区分支过大）
- `src/lib/admin/shelf-client.ts`（改：提交字段、422 映射）
- `tests/unit/admin/{media-entry-form,recognize-box}.test.tsx`、`tests/e2e/admin-media-form.spec.ts`（改）

## 回滚策略

git 还原表单与列表组件；任务 12 的接口仍兼容（非游戏不受影响）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-media.md | 标注游戏字段已实现 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
