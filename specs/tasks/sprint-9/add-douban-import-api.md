# add-douban-import-api: 豆瓣批量导入与增量同步接口（数据 + 领域 + 接口）

**Sprint**: Sprint 9
**序号**: 19
**状态**: pending
**类别**: API
**架构层级**: 数据 + 领域 + 接口（`src/db/migrations/`、`src/domains/shelf/`、`src/domains/shelf/douban/`、`src/pages/api/admin/shelf/import*`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [douban-bulk-import](../../backlog/douban-bulk-import.md)

## 意图声明

- **改动意图**:
  - 范围：影视、书、游戏三个大类，6 个类别（电影、剧集、书、漫画、游戏、桌游）一次全部支持
  - `douban/import.ts`（新建，纯函数）：`isValidDoubanUid`、`isDoubanTimestamp`、`IMPORT_STEPS`、`KIND_TYPES`、`importPlan`、`IMPORT_PAGE_SIZE`、`parseInterestPage`、`mapInterest`（domain-model §2.4：影视 / 书 / 游戏三个分支，含漫画、桌游判定与游戏平台映射）；作者去国籍、导演连接、桌游 / 漫画推断复用 `map.ts`（必要时抽成共用函数，`mapSubject` 行为不变）
  - `douban/client.ts`：`fetchInterests`；`DoubanUserNotFoundError`、`DoubanForbiddenError`
  - 迁移 `0006_shelf_import_state.sql`（[data-model](../../engineering/backend/domains/shelf/data-model.md)"shelf_import_state"）；追加到 [ddl-changes.md](../../deploy/ddl-changes.md)（⏳ 待执行，先于代码部署）
  - `repo.ts`：`findByDoubanIds`；`import-state-repo.ts`（新建）：`ImportStateRepo`（`get`、`lastUid`、`touch`、`complete`）
  - `service.ts`：`importPage`（domain-model §5.1：`types` 类别过滤（不在 `types` 的标记跳过、不下载封面、不计数）、`mode` 全量 / 增量、`head` 回传、按勾选类别中最早水位截断（含同一秒）、一步完整结束才对 `types` 中各类别 `complete` 前移水位、25 秒时限、外部并发 ≤ 5、合并覆盖规则、封面直接 `CoverStore.put`、单条失败进 `failed[]`、不触发钩子）、`importState`、`finishImport`
  - 路由 `src/pages/api/admin/shelf/import.ts`、`import/finish.ts`、`import/state.ts`：JSON 解析与读完请求体、错误码映射（404 / 403 / 502 / 400）、`finish` 用 `createDeployHookHooks`
  - 夹具 `tests/fixtures/douban/interests-*.json`：由 `scripts/spike/douban-rexxar.py` 增加 `interests` 子命令录制（作者账号 189806038，每份裁剪 ≤ 5 条，补构造的 `status: mark`、无标题、`total: 45` 分页样本，以及增量用的 `interests-movie-done-incr`、`interests-movie-done-doing2done`，类别过滤用的 `interests-movie-done-mixed`、`interests-book-done-manga`），README 登记来源
- **影响范围**: 新增三个接口与一张表；`map.ts` 若抽取共用函数，`recognize` 的映射结果不能变（原有 `douban-map`、`douban-fixtures`、`recognize` 测试回归）
- **不变量**: 外发主机仍只有 `m.douban.com` 与 `*.doubanio.com`，全部 `redirect: 'manual'`；游戏不下载豆瓣封面；已有条目的 `hidden`、封面不动；导入接口不触发重建
- **不在本任务**: 前端弹窗（任务 20）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04](../../product/features/F-005-书影音/stories/media-shelf/US-04-douban-import/story.md) AC2–AC13；BH-03–11、13、14、16–30 |
| 设计依据 | [ADR-014](../../engineering/features/F-005-书影音/architecture/adr/ADR-014-douban-bulk-import.md) · [shelf domain-model](../../engineering/backend/domains/shelf/domain-model.md) §2.2、§2.4、§3、§4、§5.1 · [api-contract](../../engineering/backend/domains/shelf/api-contract.md)"导入" · [data-model](../../engineering/backend/domains/shelf/data-model.md)"查询" |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | SHELF-UT-16 `isValidDoubanUid`、SHELF-UT-17 `mapInterest` / `parseInterestPage`（`tests/unit/shelf/douban-import.test.ts`） | 单元 |
| 2 | SHELF-UT-18 `importPage`、SHELF-UT-19 `finishImport`、SHELF-UT-20 增量与水位、SHELF-UT-21 `importState`、SHELF-UT-22 类别过滤与类别水位（替身 client / repo / stateRepo / store / hooks，假计时器）——`tests/unit/shelf/import-service.test.ts` | 单元 |
| 3 | TC-US04-01–09、24（workers：真实 D1 / R2，`fetch` 打桩返回 `interests-*` 夹具）——`tests/integration/shelf/import-api.test.ts` | 集成 |
| 4 | TC-US04-18–22、25 增量截断、水位前移、无水位按全量、在看改看过、状态接口与换 ID、类别 × 状态水位（workers：真实 D1 含迁移 0006）——`tests/integration/shelf/import-incremental.test.ts` | 集成 |
| 5 | TC-US04-10–13（参数校验不发请求、豆瓣错误映射、401 / 403、请求主机与数量）——`tests/integration/shelf/import-security.test.ts` | 集成 |

## DoD（完成定义）

- [ ] 测试清单全部由红变绿；影响范围：`tests/unit/shelf/*`、`tests/integration/shelf/*` 原有用例通过
- [ ] 用作者真实账号手工调一次本地接口（`npm run dev:local`，登录后 `POST /api/admin/shelf/import` 影视·看过第 1 页），核对 20 条映射结果；再调一次 `mode: incremental` 确认第 1 页即到达水位，记入 validation
- [ ] `ddl-changes.md` 有 0006 条目（⏳ 待执行，注明必须先于代码部署）；`tests/integration/migration.test.ts` 补 0006（表与 CHECK）
- [ ] `npm run lint`、`npm run check` 通过

## 依赖

12（游戏 `platform` 字段与迁移 0005）、3（`douban/` 防腐层）

## 影响的文件

- `src/domains/shelf/douban/{import,client,map}.ts`、`src/domains/shelf/{service,repo,errors}.ts`
- `src/db/migrations/0006_shelf_import_state.sql`、`src/domains/shelf/import-state-repo.ts`（新建）
- `src/pages/api/admin/shelf/import.ts`、`src/pages/api/admin/shelf/import/{finish,state}.ts`（新建）
- `scripts/spike/douban-rexxar.py`（加录制子命令）、`tests/fixtures/douban/interests-*.json`、`tests/fixtures/douban/README.md`
- `tests/unit/shelf/{douban-import,import-service}.test.ts`、`tests/integration/shelf/{import-api,import-incremental,import-security}.test.ts`（新建）、`tests/integration/migration.test.ts`（改）

## 回滚策略

删除新文件与三个路由、迁移 0006；`map.ts` 抽取的共用函数 git 还原；本地 D1 需重建（若已执行 0006）。

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| shelf api-contract | 导入接口标注已实现（任务 19） |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
