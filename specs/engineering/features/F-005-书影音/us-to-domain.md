# F-005 US → Domain 映射

**最后更新**: 2026-10-27

| US | Domain / 模块 | 能力 | 接口 |
|----|--------------|------|------|
| US-01 manage-entries | `shelf` | `list`、`get`、`create`、`update`、`setHidden`、`remove`；`CoverStore`；`ShelfHooks`；`normalizeEntryInput`、`sortEntries`、`statusLabel`、`creatorLabel`、`countLabel`；游戏：`IgdbImageClient`、`normalizeIgdbCoverUrl`、`readImageSize`、`platformLabel`（[domain-model](../../backend/domains/shelf/domain-model.md) §1、§3、§4） | `GET/POST /api/admin/shelf/entries`、`GET/PUT/DELETE /api/admin/shelf/entries/:id`、`POST …/:id/hide|unhide`、`GET /covers/*` |
| US-01 manage-entries | `auth` | middleware 会话（页面 302、接口 401）+ Origin（403） | — |
| US-01 manage-entries | 重建钩子 | `createDeployHookHooks` 适配 `ShelfHooks` | — |
| US-02 douban-recognize | `shelf`（`douban/` 防腐层） | `recognize`、`extractDoubanLink`、`parseSubjectUrl`、`mapSubject`、`DoubanClient`；`create` 的豆瓣去重（§2、§5） | `POST /api/admin/shelf/recognize` |
| US-02 douban-recognize | `auth` | middleware 会话 + Origin | — |
| US-04 douban-import | `shelf`（`douban/` 防腐层） | `importState`、`importPage`、`finishImport`、`ImportStateRepo`、`DoubanClient.fetchInterests`、`isValidDoubanUid`、`mapInterest`、`ShelfRepo.findByDoubanIds`（ADR-014） | `GET /api/admin/shelf/import/state`、`POST /api/admin/shelf/import`、`POST /api/admin/shelf/import/finish` |
| US-04 douban-import | `auth`、重建钩子 | middleware 会话 + Origin；finish 时 `onShelfChanged` 一次 | — |
| US-03 media-page | `shelf` | `listPublic`、`CoverStore.get`（§4） | `GET /api/shelf`、`GET /covers/*` |
| US-03 media-page | `reader` 模块 | `virtual:shelf-data`、`src/lib/reader/shelf.ts`（含游戏 `posterAspect`）、`shelf-time.ts`（[module-spec](../../frontend/modules/reader/module-spec.md) §1.3、§2） | — |

实现进度：US-01（接口任务 2、列表任务 4、表单任务 5）、US-02（识别接口任务 3、识别框任务 6）、US-03（构建数据任务 7、读者页任务 8、海报墙任务 10）已实现（2026-10-22）；游戏平台与海报墙（[game-case-shelf](../../../backlog/game-case-shelf.md)）：接口任务 12、表单任务 13、读者页任务 14 已实现（2026-10-27）；"按时间"发行年份与游戏年份徽标（[media-time-basis](../../../backlog/media-time-basis.md)）任务 15 已实现（2026-10-27）；所有分类统一海报墙（[media-wall-all-types](../../../backlog/media-wall-all-types.md)）任务 16 已实现（2026-10-27）。US-03 全部已实现。US-04 豆瓣批量导入：接口任务 19 已实现（2026-10-27），弹窗任务 20 待实现。

反向映射见 [shelf domain-model](../../backend/domains/shelf/domain-model.md) §7"服务的需求"。
