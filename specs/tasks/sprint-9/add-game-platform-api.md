# add-game-platform-api: 游戏平台与 IGDB 封面（数据 + 领域 + 接口）

**Sprint**: Sprint 9
**序号**: 12
**状态**: completed（2026-10-27）
**类别**: API
**架构层级**: 数据 + 领域 + 接口（`src/db/migrations/`、`src/domains/shelf/`、`src/pages/api/admin/shelf/`、`src/pages/api/shelf.ts`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [game-case-shelf](../../backlog/game-case-shelf.md)

## 意图声明

- **改动意图**:
  - 迁移 `0005_shelf_game_platform_cover.sql`：加 `platform`、`cover_url`、`cover_width`、`cover_height`，已有游戏补 `platform = 'ps5'`、`cover_key` 置空（[data-model](../../engineering/backend/domains/shelf/data-model.md)"迁移 0005"）；追加到 [ddl-changes.md](../../deploy/ddl-changes.md)（⏳ 待执行）
  - `entry.ts`：`SHELF_PLATFORMS`、`isShelfPlatform`、`platformLabel`、`platformIcon`、`normalizeIgdbCoverUrl`、`readImageSize`；`normalizeEntryInput` 加 `platform`（游戏必填、非游戏置空）与 `coverUrl`（游戏可选、规范化，非游戏置空）
  - `igdb.ts`：`IgdbImageClient`（只请求规范地址，`redirect: 'manual'`，8 秒，读至多 65,536 字节）；路由层用全局 `fetch` 注入
  - `service.ts`：游戏不接受上传封面（`BAD_REQUEST`）；`coverUrl` 变化才 `readSize`，失败 `COVER_LINK_UNREACHABLE`（422）；改为游戏时更新成功后删旧 R2 对象；改为非游戏时清空平台与 IGDB 封面；`listPublic` 游戏的 `cover` 为 IGDB 地址并带 `platform`、宽高；`recognize` 识别为游戏时不下载封面
  - 仓储 SQL 与视图映射加 4 个字段
- **影响范围**: 条目写接口、`GET /api/shelf` 输出、识别接口（游戏分支）；书、电影等非游戏条目行为不变
- **不变量**: 非游戏封面仍只认上传文件；识别不写库；除 `images.igdb.com` 外不新增出站主机
- **不在本任务**: 后台表单（任务 13）；读者页（任务 14）；IGDB API 搜索 / 识别

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md) AC11；BH-23、24、25 · [US-02](../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/story.md) AC9 |
| 设计依据 | [ADR-013](../../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md) · [shelf domain-model](../../engineering/backend/domains/shelf/domain-model.md) §1、§3、§4、§5 · [api-contract](../../engineering/backend/domains/shelf/api-contract.md) · [data-model](../../engineering/backend/domains/shelf/data-model.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | SHELF-UT-12 `normalizeIgdbCoverUrl`、SHELF-UT-13 `readImageSize`（`tests/unit/shelf/igdb.test.ts`，夹具图片头放 `tests/fixtures/igdb/`） | 单元 |
| 2 | SHELF-UT-14 `ShelfService` 游戏写操作（替身 repo / store / igdb）、SHELF-UT-15 `recognize` 游戏分支——扩展 `tests/unit/shelf/service.test.ts`、`tests/unit/shelf/recognize.test.ts` | 单元 |
| 3 | TC-US01-26、TC-US01-28（workers：真实 D1 / R2，`igdbStub`）——`tests/integration/shelf/game-entry.test.ts` | 集成 |
| 4 | TC-US01-27 防 SSRF 与链接校验（`igdbStub` 记录主机）——同文件 | 集成 |
| 5 | 迁移：`tests/integration/migration.test.ts` 增加 0005（列存在、游戏行补 `ps5`、CHECK 拒绝非法平台与非规范地址） | 集成 |

## DoD（完成定义）

- [x] 测试清单全部由红变绿；影响范围：`tests/integration/shelf/*`、`tests/unit/shelf/*` 原有用例通过
- [x] `ddl-changes.md` 有 0005 条目（⏳ 待执行，注明必须先于代码部署）
- [x] `npm run lint`、`npm run check` 通过

## 实现记录（2026-10-27）

- 测试：`tests/unit/shelf/igdb.test.ts`（31，含 `IgdbImageClient` 读取上限 / 跳转 / 非图片）、`service.test.ts` + 5（SHELF-UT-14）、`recognize.test.ts` + 1（SHELF-UT-15）、`tests/integration/shelf/game-entry.test.ts`（4，TC-US01-26–28）、`migration.test.ts` + 1（0005）；夹具 `tests/fixtures/igdb/`（逐字节构造的图片头，见 README）
- **偏离 data-model**：D1 限制 GLOB / LIKE 模式 ≤ 50 字符，`cover_url` 的 CHECK 改为 `instr(…, 'https://images.igdb.com/igdb/image/upload/t_1080p/') = 1 AND substr(cover_url, -4) = '.jpg' AND length BETWEEN 55 AND 120`（含义不变），data-model 已同步
- `normalizeIgdbCoverUrl` 在 URL 解析前拒绝含 `..` 或 `\` 的原文（`new URL` 会消去 `../`、把 `\` 当 `/`，否则 TC-US01-27 #4 路径穿越会被"修正"后通过）
- `IgdbImageClient` 每读一块就尝试解析，读到宽高立即取消；宽或高超过 20,000 视为失败（data-model 列上限）
- 读取失败与 8 秒超时都在服务层归为 `COVER_LINK_UNREACHABLE`；游戏带上传封面为 `GameCoverUploadError`（400 `BAD_REQUEST`"游戏封面请粘贴 IGDB 图片链接，不接受上传文件"）
- 影响范围补改：`reader-data.ts` 的构建数据校验原先只认 `/covers/` 封面，存入游戏 IGDB 封面后重建会失败——改为接受规范 IGDB 地址、校验 `platform` / 宽高，旧数据缺字段补 `null`（`tests/unit/reader/shelf.test.ts` + 2）；`entries-api` 全字段用例的游戏补 `platform`（游戏平台改为必填）；`public-api`、读者端两个单元测试夹具补新字段
- 本地 D1 已执行 0005

## 依赖

2（条目接口、迁移 0004）、3（识别接口）、11（分类枚举）

## 影响的文件

- `src/db/migrations/0005_shelf_game_platform_cover.sql`（新建）
- `src/domains/shelf/{entry,service,repo,errors}.ts`（改）、`src/domains/shelf/igdb.ts`（新建）
- `src/pages/api/admin/shelf/entries/*`、`src/pages/api/shelf.ts`（改：注入 `IgdbImageClient`、422 映射）
- `tests/unit/shelf/igdb.test.ts`（新建）、`tests/unit/shelf/{service,recognize,entry}.test.ts`、`tests/integration/shelf/game-entry.test.ts`（新建）、`tests/integration/migration.test.ts`、`tests/fixtures/igdb/*`（新建）

## 回滚策略

删除 0005 迁移与新文件，领域与路由改动 git 还原；本地 D1 需重建（`npm run db:migrate:local` 前删除本地状态）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| shelf domain-model / data-model / api-contract、ADR-013 | 标注已实现 |
| [ddl-changes.md](../../deploy/ddl-changes.md) | 0005 条目 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
