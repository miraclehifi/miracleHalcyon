# sync-f001-acceptance-expectations: 验收文档期望值同步现行契约

**Sprint**: Sprint 5
**序号**: 1
**状态**: completed
**类别**: DOC
**架构层级**: 文档
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [f001-p0-test-gaps](../../backlog/f001-p0-test-gaps.md)

## 意图声明

- **改动意图**: 验收用例写在 design-domain 之前，部分期望值后来被设计改掉。把这些用例改为现行契约（以 post api-contract、domain-model、editor module-spec 为准），并在用例的 Change History 中注明
- **影响范围**: `specs/test/features/F-001-文章写作/acceptance/post-editor/US-03-tests.md`、`US-06-tests.md`，`post-management/US-07-tests.md`、`US-08-tests.md`
- **不变量**: 不改代码与测试；不改 BDD（behaviors.md 已与设计一致的不动，若发现不一致一并修正并记录）

## 要同步的用例

| TC | 现文档 | 现行契约 |
|----|--------|---------|
| TC-US03-01、03 | 空标题返回 400；标题上限 120 | 空 / 空白标题存为"无标题"；上限 200 |
| TC-US03-02 | 未提交字段保持原值 | PUT 提交整份工作稿，缺字段返回 400 |
| TC-US03-04 | slugify 决策表 | 先 NFKD（Café → cafe）；上限 80 截断 |
| TC-US03-05、TC-US08-04 | 发布缺字段 400 | 422 `MISSING_FIELDS`（带 `fields`） |
| TC-US03-07 | slug 上限 100 | 上限 80；输入去首尾空白 |
| TC-US03-11 | 标签补全前缀匹配 | 包含匹配 |
| TC-US06-24 | 保存完成后再等 2 秒保存 | 保存中有新编辑：完成后立即再保存 |
| TC-US07-02 | 列表条目含 slug | 契约条目不含 slug |

执行时逐条对照契约原文核实，表中为 verify 追溯时的结论。

## 测试清单

无（文档任务）。完成标准：上表每条用例的期望值与契约一致，Change History 有记录。

## 实现记录

- 改了 5 份文件（US-01、03、06、07、08），改动的用例 Version Tag 升为 v1.1，Change History 追加同步说明
- 表中各条均已对照契约原文同步；另外修正了同样过时的 TC-US01-06 / 07 / 08 / 34（登录失败文案）、TC-US03-06（` hello ` 去空白后通过；接口文案与编辑页行内文案不同）、TC-US03-08 / 09（`SLUG_TAKEN`、原子写入）、TC-US03-20（清空 slug 不恢复跟随）、TC-US03-24（摘要超 200 字不可再输入）、TC-US06-17（整份工作稿）
- US-03 文件头的"约定与建议值"去掉"待 design-domain 确认"，写入定稿值，并约定"PUT 提交 {x}"指以当前工作稿为底整份提交
- POST 创建时字段可选（只有 PUT 要求七字段），TC-US03-01 按此表述
- 未改、措辞仍旧但不矛盾：TC-US08-13 的 `/update` 占位（契约 §1 已声明映射到 `/publish`）、TC-US07-03 / 05 / 07 / 08 的"或 400"写法、TC-US06-05

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-5/_index.md](_index.md) | 本任务状态 → completed |
