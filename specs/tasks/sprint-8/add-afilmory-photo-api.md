# add-afilmory-photo-api: 照片信息接口

**Sprint**: Sprint 8
**序号**: 1
**状态**: completed
**类别**: API
**架构层级**: 配置 + 领域 + 接口（`src/config/`、`src/lib/reader/site-config.ts`、`src/domains/media/`、`src/pages/api/admin/afilmory/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)

## 意图声明

- **改动意图**: `site.ts` 登记 `afilmory: { site, storage }`，`normalizeSiteConfig` 校验；`src/domains/media/afilmory.ts` 实现 `parseAfilmoryManifest` / `toPhotoInfo` / `fetchAfilmoryPhoto`（`thumbhash` 平均色）；路由 `GET /api/admin/afilmory/photos/[id]` 映射错误码
- **影响范围**: 新增文件为主；`site-config.ts` 加可选字段（读者首页不受影响）
- **不变量**: 已有 `site` 字段与读者页输出不变；middleware 对 `/api/admin` 的会话校验覆盖新路由
- **不在本任务**: 编辑器调用（任务 4）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) AC1、AC4；BH-05、BH-13 |
| 设计依据 | [media api-contract](../../engineering/backend/domains/media/api-contract.md) `GET /api/admin/afilmory/photos/{id}` · [media domain-model §10](../../engineering/backend/domains/media/domain-model.md) · [ADR-010](../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-176：`normalizeSiteConfig` 的 `afilmory` | 单元 |
| 2 | MEDIA-UT-11、12：清单解析、照片信息转换（夹具页） | 单元 |
| 3 | MEDIA-UT-13：`fetchAfilmoryPhoto`（fake fetch） | 单元 |
| 4 | [TC-US13-13](../../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)（MEDIA-UT-14）：路由 401 / 400 / 200 / 404 / 502 | 集成（workers） |

## DoD（完成定义）

- [x] 外部请求只发往 `{site}/photos/{id}`，`redirect: "manual"`，10s 超时
- [x] 夹具 `tests/fixtures/afilmory/photo-page.html` 取自真实页面结构（保留 3–4 张，含动态照片、子目录照片）
- [x] 测试清单全部由红变绿

## 依赖

无

## 影响的文件

- `src/config/site.ts`、`src/lib/reader/site-config.ts`
- `src/domains/media/afilmory.ts`（新建）、`src/pages/api/admin/afilmory/photos/[id].ts`（新建）
- `package.json`（`thumbhash`）
- `tests/unit/reader/site-config.test.ts`、`tests/unit/media/afilmory.test.ts`（新建）、`tests/integration/media/afilmory-route.test.ts`（新建）、`tests/fixtures/afilmory/`（新建）

## 回滚策略

删除新文件与 `afilmory` 配置字段

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| media api-contract / domain-model §10 | 标注已实现 |
| [sprint-8/_index.md](_index.md) | 状态 → completed |
