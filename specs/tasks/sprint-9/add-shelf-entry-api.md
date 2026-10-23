# add-shelf-entry-api: 书影音条目接口

**Sprint**: Sprint 9
**序号**: 2
**状态**: completed
**类别**: API
**架构层级**: 数据 + 领域 + 接口（`src/db/migrations/`、`src/domains/shelf/`、`src/pages/api/admin/shelf/`、`src/pages/covers/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: 迁移 `0004_shelf_entries.sql`；`entry.ts`（`normalizeEntryInput`、`sortEntries`、`statusLabel`、`creatorLabel`、`countLabel`、`canonicalDoubanUrl`、`detectCoverType`、`newCoverKey`、`isCoverKey`）；`repo.ts`（`ShelfRepo`）；`cover-store.ts`；`hooks.ts`；`service.ts`（`list` / `get` / `create` / `update` / `setHidden` / `remove`）；路由 `entries/index.ts`（GET、POST）、`entries/[id].ts`（GET、PUT、DELETE）、`entries/[id]/hide.ts`、`unhide.ts`；`src/pages/covers/[...key].ts`；重建钩子用 `createDeployHookHooks` 适配
- **影响范围**: 新增文件；`ddl-changes.md` 追加 0004；middleware 已覆盖 `/api/admin/**`，不改
- **不变量**: 封面只写 R2 `covers/`、不写 `images`（F-006 不受影响）；`douban_id` 唯一；`img/` 与 `/img/*` 行为不变
- **不在本任务**: 识别（任务 3）、公开 `GET /api/shelf`（任务 7）、页面

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md) AC3–AC10；BH-05–BH-15、BH-19、BH-20、BH-22 |
| 设计依据 | [shelf domain-model §1、§3、§4](../../engineering/backend/domains/shelf/domain-model.md) · [api-contract](../../engineering/backend/domains/shelf/api-contract.md) · [data-model](../../engineering/backend/domains/shelf/data-model.md) · [ADR-012 §4、§5](../../engineering/features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | SHELF-UT-01–05：校验、排序、文案、文件头、封面 key（`tests/unit/shelf/entry.test.ts`） | 单元 |
| 2 | SHELF-UT-10：服务写操作（替身：封面回滚、旧封面删除失败、钩子次数、豆瓣字段只能保留或清除）（`tests/unit/shelf/service.test.ts`） | 单元 |
| 3 | TC-US01-02、03、04、06、08、09、10、11、12、15（`tests/integration/shelf/entries-api.test.ts`，workers：D1 + R2 + 钩子替身） | 集成 |
| 4 | TC-US01-05、07 + `/covers/*` 读取（200 头部、非法 key 404、不存在 404）+ 封面不写 `images`（`tests/integration/shelf/covers.test.ts`） | 集成 |
| 5 | TC-US01-13、TC-US02-08 附加（同 `doubanId` 二次保存 409）（`tests/integration/shelf/entries-security.test.ts`） | 集成 |

## DoD（完成定义）

- [x] 迁移 0004 本地应用成功（`npm run db:migrate:local`），DDL 与 data-model 一致（含部分唯一索引、触发器、STRICT）
- [x] `ddl-changes.md` 追加 0004 条目，状态 ⏳ 待执行，注明"必须先于代码部署"
- [x] 接口请求 / 响应 / 错误码与 api-contract 一致（multipart `fields` + `cover`、`coverAction`、`counts`）
- [x] 测试清单全部由红变绿；影响范围：`tests/integration/media/` 存储清理相关测试通过（共用 R2 绑定）；`tests/integration/migration.test.ts` 的期望表结构补 shelf 三项

## 依赖

无（`createDeployHookHooks` 已存在）

## 影响的文件

- `src/db/migrations/0004_shelf_entries.sql`（新建）
- `src/domains/shelf/{entry,repo,cover-store,hooks,service}.ts`（新建）
- `src/pages/api/admin/shelf/entries/index.ts`、`[id].ts`、`[id]/hide.ts`、`[id]/unhide.ts`（新建）；`src/pages/covers/[...key].ts`（新建）
- `tests/unit/shelf/`、`tests/integration/shelf/`（新建）
- `specs/deploy/ddl-changes.md`

## 实现记录（2026-10-21）

- 新增 `src/lib/api/shelf-http.ts`（multipart 解析、条目视图、错误映射）、`src/lib/rebuild/shelf-hooks.ts`（`ShelfHooks` → Deploy Hook）
- `cover-store.ts` 自带 `IMMUTABLE_CACHE` 常量，不从 `media` 领域导入（保持领域边界）
- 列表接口 `counts` 由服务按分类计算（`ShelfService.counts`）
- 测试：`tests/unit/shelf/entry.test.ts`（37）、`service.test.ts`（7）、`tests/integration/shelf/entries-api.test.ts`（9）、`covers.test.ts`（5）、`entries-security.test.ts`（2）全部通过；SHELF-UT-01–05 中 `entry.ts` 先写了实现再补测试（未经红阶段），其余按红 → 绿进行

## 回滚策略

删除新文件与迁移（本地 D1 删表 `DROP TABLE shelf_entries`）；`ddl-changes.md` 条目删除

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| shelf api-contract / domain-model / data-model | 标注已实现 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
