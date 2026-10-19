# implement-orphan-cleanup-api: 清理接口

**Sprint**: Sprint 7
**序号**: 2
**状态**: completed
**类别**: API
**架构层级**: 领域 + 数据 + 接口
**所属 Feature**: [F-006 媒体存储清理](../../product/features/F-006-媒体存储清理/feature-scope.md)
**来源 PBI**: [media-orphan-cleanup](../../backlog/media-orphan-cleanup.md)

## 意图声明

- **改动意图**：实现 `POST /api/admin/storage/cleanup`。服务端重新判定后删除未引用图片（连同视频）、只移除未引用视频，返回清理数量与释放字节数
- **可演示**：调用后再查检测接口，结果为 0；R2 中对应对象被删除，被引用的图片仍可访问
- **影响范围**：`src/domains/media/repo.ts`（`removeOrphans`、`MediaStore.deleteMany`）、`storage.ts`（`cleanupOrphans`）
- **不变量**：先删 R2 后改 D1；无候选时不发起任何写入；不接受前端传入的 key

## 设计来源

- media [domain-model](../../engineering/backend/domains/media/domain-model.md) §9.2 cleanupOrphans、§2 不变量 1、§6 仓储
- media [data-model](../../engineering/backend/domains/media/data-model.md)："F-006 查询与写入"、R2 删除
- media [api-contract](../../engineering/backend/domains/media/api-contract.md)：`POST /api/admin/storage/cleanup`

## 实现步骤

1. `MediaCleanupStore.deleteMany(keys)`（`R2MediaStore` 实现；与上传用 `MediaStore` 分开）：按 1,000 个一批调用 `MEDIA.delete(string[])`
2. `ImageCleanupRepo.removeOrphans(imageKeys, videoOnlyKeys)`：`db.batch` 执行 DELETE 与 UPDATE，参数用 `json_each`
3. `StorageService.cleanupOrphans(now)`：按 §9.2 的 5 个步骤实现；出错时抛 `StorageCleanupError`
4. `src/pages/api/admin/storage/cleanup.ts`：只导出 `POST`；`StorageCleanupError` → 500 `CLEANUP_FAILED`

## 测试清单

| # | 文件 | 覆盖 | 层 |
|---|------|------|----|
| 1 | `tests/integration/media/storage-cleanup.test.ts` | MEDIA-UT-10；TC-US02-01、02、03、09 | 集成（D1 + R2） |
| 2 | `tests/integration/media/storage-cleanup-failure.test.ts` | TC-US02-05（R2 抛错、D1 抛错各一轮，重跑幂等）、TC-US02-07（1,000 / 1,001 / 1,200 张分批） | 集成 |
| 3 | `tests/integration/media/storage-cleanup-api.test.ts` | TC-US02-06（401 / 403 / 无 Origin 403 / GET 405） | 集成（API + middleware） |

## DoD

实现类：
- [x] `POST /api/admin/storage/cleanup` 返回 `removedImages`、`removedVideos`、`freedBytes`
- [x] 单次 `MEDIA.delete` 调用的 key 数 ≤ 1,000（测试中对绑定计数断言）

测试类：
- [x] 测试清单 3 个文件由红变绿
- [x] 影响范围回归：任务 1 的测试文件、`tests/integration` 中 media 上传与读取的现有测试通过；`npm run lint`、`npm run check` 无报错

## 回滚

删除 `cleanup.ts` 与测试；`storage.ts` 去掉 `cleanupOrphans`；`repo.ts` 去掉 `removeOrphans`、`deleteMany`。

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| media domain-model §9、api-contract、data-model | 标注已实现 |
| [sprint-7/_index.md](_index.md) | 状态 → completed |
