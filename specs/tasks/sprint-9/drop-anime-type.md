# drop-anime-type: 去掉"动画"分类，"剧"改名"剧集"

**Sprint**: Sprint 9
**序号**: 11
**状态**: completed（2026-10-22）
**类别**: DOMAIN
**架构层级**: 领域 + 数据 + 表现层（`src/domains/shelf/`、迁移 0004、`src/components/admin/media/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [drop-anime-type](../../backlog/drop-anime-type.md)

## 意图声明

- **改动意图**:
  - `SHELF_TYPES` 去掉 `anime`；`TYPE_LABELS.series` → "剧集"；`VERB_OF`、`creatorLabel` 同步（`src/domains/shelf/entry.ts`）
  - 豆瓣映射 `inferType`：`is_tv` 一律 `series`（含"动画"类型）（`douban/map.ts`）
  - 迁移 `0004_shelf_entries.sql` 的 `CHECK` 去掉 `'anime'`（生产未执行，不新增迁移；本地 D1 重建 `shelf_entries`）
  - `MediaEntryList` 图标表去掉 `anime`
  - 规格：F-005 产品 / 测试 / 工程文档里的分类枚举与显示名
- **影响范围**: 条目接口（`type` 校验）、识别接口（分类推断）、后台列表（分类导航 6 项）、构建期读者数据校验；测试辅助 `tests/e2e/support/shelf.ts`
- **不变量**: 其余 6 个分类的行为不变；`/admin/media?type=anime` 按非法参数回到"书"
- **不在本任务**: 读者页（任务 8 直接按 6 个分类实现）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Backlog | [drop-anime-type](../../backlog/drop-anime-type.md) 验收条件 3–7 |
| 设计依据 | [admin-media.md](../../ui/pages/admin-media.md)、[reader-media.md](../../ui/pages/reader-media.md)、[components.md](../../ui/components.md) `MediaTypeTab`（已改）· admin.pen 09 / 09m / 09c / 10 / 10m |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `entry.test.ts`：`SHELF_TYPES` 为 6 个且不含 `anime`；`TYPE_LABELS.series === "剧集"`；`normalizeEntryInput({ type: "anime" })` 报分类非法 | 单元 |
| 2 | `douban-map.test.ts`：`tv-anime` 夹具 → `type: "series"`；`movie-animated` 仍为 `movie` | 单元 |
| 3 | `media-type-tabs.test.tsx`：6 个链接，"剧集"、无"动画" | 单元 |
| 4 | 条目接口集成：`POST` `type: "anime"` → 400（`tests/integration/shelf/entries-api.test.ts`，迁移 `CHECK` 一并验证） | 集成 |
| 5 | `admin-media-list.spec.ts`：删除用例改用 `game`（`boardgame` 留给空分类用例）；`/admin/media?type=anime` 显示"书"分类 | E2E |

## DoD（完成定义）

- [x] 测试清单全部由红变绿（webkit 补跑通过）；影响范围：`tests/unit/shelf`、`tests/integration/shelf`、`tests/integration/migration.test.ts` 通过
- [x] `grep -rnE "\banime\b" src tests/unit tests/integration tests/e2e` 无业务引用（夹具文件名 `tv-anime.json` 保留）
- [x] Backlog 验收条件 3–7 勾选，状态 → done（本地 D1 已重建 `shelf_entries`）

## 依赖

2、3、4

## 影响的文件

- `src/domains/shelf/entry.ts`、`src/domains/shelf/douban/map.ts`、`src/db/migrations/0004_shelf_entries.sql`、`src/components/admin/media/MediaEntryList.tsx`
- `tests/unit/shelf/{entry,douban-map}.test.ts`、`tests/unit/components/media-type-tabs.test.tsx`、`tests/integration/shelf/entries-api.test.ts`、`tests/e2e/admin-media-list.spec.ts`、`tests/e2e/support/shelf.ts`、`tests/fixtures/douban/README.md`

## 回滚策略

git 还原上述文件；本地 D1 重跑迁移

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [drop-anime-type](../../backlog/drop-anime-type.md) | 勾选验收条件，状态 → done |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
