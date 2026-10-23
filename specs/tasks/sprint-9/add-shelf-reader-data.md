# add-shelf-reader-data: 书影音读者构建数据

**Sprint**: Sprint 9
**序号**: 7
**状态**: completed
**类别**: API
**架构层级**: 接口 + 构建（`src/pages/api/shelf.ts`、`src/domains/shelf/service.ts`、`src/integrations/reader-data.ts`、`src/lib/reader/shelf.ts`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: `ShelfService.listPublic` + 路由 `GET /api/shelf`（只含显示中、按 id 降序、`Cache-Control: no-store`）；`readerData()` 插件增加 `virtual:shelf-data`（夹具 `{name}.shelf.json` 不存在 → 空；HTTP 404 → 空 + 警告；校验）；`src/env.d.ts` 类型；`src/lib/reader/shelf.ts`（`groupShelf`、`shelfPath`、`markedMonth`、`emptyIcon`）；构建夹具 `tests/fixtures/reader/reader-fixture.shelf.json`（US-03 测试数据表）
- **影响范围**: `readerData()` 插件（所有读者页构建）
- **不变量**: `virtual:reader-data` 行为不变；`reader-fixture-empty` 等无 `.shelf.json` 的夹具构建正常
- **不在本任务**: 页面（任务 8）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) AC3、AC7、AC11；BH-04、BH-10、BH-18 |
| 设计依据 | [ADR-012 §1–§3](../../engineering/features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md) · [reader module-spec §1.3](../../engineering/frontend/modules/reader/module-spec.md) · [shelf domain-model §6](../../engineering/backend/domains/shelf/domain-model.md) · api-contract `GET /api/shelf` |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | SHELF-UT-11 + UT-01、02、03、05（`tests/unit/reader/shelf.test.ts`） | 单元 |
| 2 | `virtual:shelf-data` 取数（Node，`fetch` 替身）：200、404 → 空 + 警告、500 报错含 URL、非 JSON、`READER_BOOTSTRAP=1` 不可达、夹具缺失 → 空、字段非法报错含标题（扩展 `tests/unit/reader/reader-data.test.ts`） | 单元 |
| 3 | `GET /api/shelf`：隐藏不返回、字段最小集（无 id / doubanId / hidden / 时间戳）、id 降序、未登录可访问（`tests/integration/shelf/public-api.test.ts`） | 集成 |

## DoD（完成定义）

- [x] 公开响应字段与 api-contract `ShelfPublicEntry` 逐字段一致
- [x] 测试清单全部由红变绿；影响范围：`tests/unit/reader/reader-data.test.ts` 原有用例、`npm run test:build`（现有读者页产物不变）通过

## 依赖

2

## 影响的文件

- `src/pages/api/shelf.ts`（新建）、`src/domains/shelf/service.ts`
- `src/integrations/reader-data.ts`、`src/env.d.ts`
- `src/lib/reader/shelf.ts`（新建）
- `tests/fixtures/reader/reader-fixture.shelf.json`（新建）、`tests/unit/reader/shelf.test.ts`（新建）、`tests/unit/reader/reader-data.test.ts`、`tests/integration/shelf/public-api.test.ts`（新建）

## 回滚策略

删除新文件；插件与 `env.d.ts` git 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader module-spec §1.3、shelf api-contract `GET /api/shelf` | 标注已实现 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
