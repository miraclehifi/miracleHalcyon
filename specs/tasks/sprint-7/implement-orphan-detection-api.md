# implement-orphan-detection-api: 检测接口

**Sprint**: Sprint 7
**序号**: 1
**状态**: completed
**类别**: API
**架构层级**: 领域 + 数据 + 接口
**所属 Feature**: [F-006 媒体存储清理](../../product/features/F-006-媒体存储清理/feature-scope.md)
**来源 PBI**: [media-orphan-cleanup](../../backlog/media-orphan-cleanup.md)

## 意图声明

- **改动意图**：实现 `GET /api/admin/storage/orphans`。登录后调用该接口，返回未引用图片、未引用视频与保护期内项的统计
- **可演示**：本地造数据后调用接口，返回的 `summary` 与 TC-US01-04 的数字一致
- **影响范围**：新增文件为主；`src/domains/media/repo.ts` 只新增 `listAll` 方法
- **不变量**：不改 `posts` 写路径；`media` 不读 `posts` 表（ADR-009 第 1 点）

## 设计来源

- post [domain-model](../../engineering/backend/domains/post/domain-model.md) §6.1：`ImageReferenceQuery`、`keyStem`、SQL
- media [domain-model](../../engineering/backend/domains/media/domain-model.md) §9：`classifyOrphans`、`summarize`、`detectOrphans`；§6：`ImageRepo.listAll`
- media [api-contract](../../engineering/backend/domains/media/api-contract.md)：`GET /api/admin/storage/orphans`
- [ADR-009](../../engineering/features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)

## 实现步骤

1. `src/domains/post/image-reference-query.ts`：`keyStem`、`D1ImageReferenceQuery.classify`（一条 SQL，JSON 参数；空数组不查询）
2. `src/domains/media/repo.ts`：`ImageRepo.listAll()`
3. `src/domains/media/storage.ts`：`PROTECTION_MS`、`classifyOrphans`、`summarize`、`createStorageService({ imageRepo, mediaStore, references })`（本任务只实现 `detectOrphans`）
4. `src/pages/api/admin/storage/orphans.ts`：`GET` → `detectOrphans(new Date())` → `{ summary, checkedAt }`；异常 → 500 `INTERNAL_ERROR`（沿用 `src/lib/api/errors.ts`）

⚠️ 前置确认项：D1 / miniflare 是否支持 `->>`。不支持时改用 `json_extract`（post §6.1 已注明）。

## 测试清单

| # | 文件 | 覆盖 | 层 |
|---|------|------|----|
| 1 | `tests/unit/media/storage-classify.test.ts` | MEDIA-UT-09（决策表 + 保护期边界 ±1ms + 体积合计） | 单元 |
| 2 | `tests/integration/post/image-reference-query.test.ts` | POST-UT-15、16；TC-US01-02、03、05（含 #5、#6、#8 保守判定）、07（含 `_` 不作通配） | 集成（D1） |
| 3 | `tests/integration/media/storage-orphans.test.ts` | TC-US01-04、06、08（401） | 集成（API） |
| 4 | `tests/integration/media/storage-orphans-perf.test.ts` | TC-US01-11（300 篇 / 3,000 张 < 2s） | 性能 |

先写第 4 项（验证 ADR-009 的假设），超时则停下回到设计。

## DoD

实现类：
- [x] 上述 4 个源文件存在，`GET /api/admin/storage/orphans` 返回契约中的全部字段
- [x] media 层没有出现 `posts` 表名（`rg "posts" src/domains/media` 无结果）

测试类：
- [x] 测试清单 4 个文件由红变绿
- [x] 影响范围回归：`tests/integration` 中 media 与 post 现有测试通过；`npm run lint`、`npm run check` 无报错

## 实现记录

- `->>` 未使用：方案改为 C2 后不再需要 JSON 参数（引用查询不传候选，Worker 按主干查集合）
- 结果与偏离见 [sprint-7-task-results](../../test/features/F-006-媒体存储清理/validation/sprint-7-task-results.md)

## 回滚

删除新增的 4 个源文件与测试文件；`repo.ts` 去掉 `listAll`。

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| media / post domain-model | 标注"已实现"及实际 SQL 写法（`->>` 或 `json_extract`） |
| ADR-009 | 记录性能实测值 |
| [sprint-7/_index.md](_index.md) | 状态 → completed |
