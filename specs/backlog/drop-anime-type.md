# 书影音去掉"动画"分类，"剧"改名"剧集"

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Enhancement |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

作者 2026-10-22："识别出类型就可以，书、漫画、电影、剧集、游戏、桌游，前台也去掉动画这个类别"。书影音分类从 7 个减为 6 个：`book` / `comic` / `movie` / `series` / `game` / `boardgame`，去掉 `anime`。动画剧集按剧集（`series`）记，动画电影按电影（`movie`）记。分类 `series` 的显示名由"剧"改为"剧集"（作者 2026-10-22 确认，导航与识别框一致）。

## 目标与验收

**目标**: 读者端、后台、识别结果里都不再出现"动画"分类；`series` 处处显示为"剧集"。

**验收条件**:
- [x] admin.pen：09、09m、09c、10、10m 的分类导航去掉"动画"、"剧"改为"剧集"；识别框可识别类型为 书 / 漫画 / 电影 / 剧集 / 游戏 / 桌游（2026-10-22 已改）
- [x] UI 规格：[admin-media.md](../ui/pages/admin-media.md)、[reader-media.md](../ui/pages/reader-media.md)、[components.md](../ui/components.md)、F-005 feature-ui-coverage（2026-10-22 已改）
- [x] 产品 / 测试规格：F-005 feature-scope、US-01/02/03 story 与 behaviors、US-02/US-03 验收用例、frontend-unit-tests 去掉动画，分类显示名"剧" → "剧集"；`feature-roadmap.md` 分类列表
- [x] 工程规格：shelf `domain-model.md`、`data-model.md`、`shared-field-formats.md`、ADR-011 的分类枚举、显示名与豆瓣映射（`is_tv` 且类型含"动画" → `series`）
- [x] 代码：`SHELF_TYPES` / `TYPE_LABELS`（`series: "剧集"`）/ `VERB_OF`（`src/domains/shelf/entry.ts`）、`inferType`（`douban/map.ts`）、`MediaEntryList.tsx` 图标表、迁移 `0004_shelf_entries.sql` 的 `CHECK`
- [x] 测试：`douban-map.test.ts` 的 `tv-anime` 期望改为 `series`；`entry.test.ts`、`media-type-tabs.test.tsx`（标签"剧" → "剧集"）、`tests/e2e/support/shelf.ts`、`admin-media-list.spec.ts`（删除用例改用其他分类）
- [x] 访问 `/media/anime`、`/admin/media?type=anime`：读者端 404，后台按缺省分类（书）处理

## 影响分析

- **影响范围**: 见验收条件；只涉及 F-005
- **数据**: 迁移 0004 尚未在生产执行（[ddl-changes](../deploy/ddl-changes.md) `⏳ 待执行`），直接改 `CHECK` 即可，不新增迁移；本地 D1 需重建 `shelf_entries`（或删库后重跑本地迁移）
- **设计稿**: 已完成，见验收条件
- **依赖项**: 无
- **决策**（2026-10-22）:
  - 动画剧集归"剧集"、动画电影归"电影"，不另设标记；后台也去掉动画，不只是读者端隐藏（作者 2026-10-22 确认）
  - `series` 显示名改为"剧集"，分类导航、识别框、表单下拉、计数文案统一（作者 2026-10-22 确认）

## 估算

- **规模**: S

## 备注

- 代码部分（任务 2、3 已完成的 shelf 领域与识别接口、任务 4 进行中的列表页）需在 Sprint 9 内新增一个任务完成，plan-tasks 时插在任务 4 之后——已排为 Sprint 9 任务 11 [drop-anime-type](../tasks/sprint-9/drop-anime-type.md)（2026-10-22）
- 2026-10-22 完成：规格（F-005 产品 / 测试 / 工程 17 个文件）与代码（任务 11）；知识去向：分类枚举与映射规则在 shelf `domain-model.md`、ADR-011，测试见 US-01 / US-02 / US-03 验收用例
