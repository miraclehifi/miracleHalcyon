# add-douban-recognize-api: 豆瓣识别接口

**Sprint**: Sprint 9
**序号**: 3
**状态**: completed
**类别**: API
**架构层级**: 领域 + 接口（`src/domains/shelf/douban/`、`src/domains/shelf/service.ts`、`src/pages/api/admin/shelf/recognize.ts`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: `douban/link.ts`（`isDoubanHost`、`isDoubanImageHost`、`isSafeUrl`、`extractDoubanLink`、`parseSubjectUrl`）、`douban/map.ts`（`mapSubject`，按 spike 补全的映射表）、`douban/client.ts`（`DoubanClient`：Rexxar 条目与书标签、封面下载带大小上限；全部 `redirect: "manual"`）；`ShelfService.recognize`（8 秒总时限、去重、封面 data URL、`missing`）；路由 `POST /api/admin/shelf/recognize`
- **影响范围**: `service.ts` 增加方法与 `DoubanClient` 注入；其余新增
- **不变量**: 只向白名单主机发请求；识别无持久化副作用；封面失败不使识别失败
- **不在本任务**: 表单识别框（任务 6）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-02](../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/story.md) AC2–AC9；BH-03–BH-15、BH-18–BH-21、BH-23、BH-24 |
| 设计依据 | [shelf domain-model §2、§5](../../engineering/backend/domains/shelf/domain-model.md) · [api-contract `POST /api/admin/shelf/recognize`](../../engineering/backend/domains/shelf/api-contract.md) · [ADR-011](../../engineering/features/F-005-书影音/architecture/adr/ADR-011-shelf-domain-douban-recognition.md) · [Feature NFR](../../product/features/F-005-书影音/nfr.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | SHELF-UT-06、07：链接提取、白名单、条目链接规范化（`tests/unit/shelf/douban-link.test.ts`） | 单元 |
| 2 | SHELF-UT-08：每个录制夹具的字段映射与分类推断（`tests/unit/shelf/douban-map.test.ts`） | 单元 |
| 3 | SHELF-UT-09：`recognize` 全流程（替身 client / repo，假计时器验证 8 秒）（`tests/unit/shelf/recognize.test.ts`） | 单元 |
| 4 | TC-US02-01、02、05、06、07、08、09、10、12、13（`tests/integration/shelf/recognize-api.test.ts`，workers；`fetch` 按 URL 返回 `tests/fixtures/douban/` 夹具并记录全部请求主机） | 集成 |

## DoD（完成定义）

- [x] 错误码与 message 与 api-contract 表一致
- [x] 集成测试断言：所有外发请求主机 ∈ 白名单；`redirect-offsite` 不请求 `evil.example`；作者提供的 dispatch 链接识别为剧
- [x] 测试清单全部由红变绿；影响范围：任务 2 的 `tests/unit/shelf/service.test.ts`、`tests/integration/shelf/entries-api.test.ts` 通过

## 依赖

1（夹具与映射表）、2（`ShelfRepo.findByDoubanId`、`canonicalDoubanUrl`、`detectCoverType`）

## 影响的文件

- `src/domains/shelf/douban/{link,map,client}.ts`（新建）、`src/domains/shelf/service.ts`
- `src/pages/api/admin/shelf/recognize.ts`（新建）
- `tests/unit/shelf/douban-*.test.ts`、`tests/unit/shelf/recognize.test.ts`、`tests/integration/shelf/recognize-api.test.ts`（新建）

## 实现记录（2026-10-22）

- 2026-10-22 作者确认 App 分享链接为 dispatch 条目链接，去掉短链跳转：`DoubanClient` 所有请求 `redirect: "manual"`，3xx 即 `FETCH_FAILED`
- 时限用 `AbortController` + `Promise.race`：条目超时 → `FETCH_FAILED`；书的标签请求与条目并行，标签超时或失败按 book 处理；封面超时只列入 `missing`
- 路由依赖可注入 `fetch` 与 `recognizeTimeoutMs`（集成测试用夹具替身与 200ms 时限）
- 识别接口加入 `entries-security.test.ts` 的鉴权矩阵（TC-US02-10）
- 测试：`douban-link`（23）、`douban-map`（17）、`recognize`（8）单元；`recognize-api`（9）集成；全部通过

## 回滚策略

删除 `douban/` 与识别路由；还原 `service.ts`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| shelf domain-model §2、§5、api-contract | 标注已实现；映射表若实现中有修正同步 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
