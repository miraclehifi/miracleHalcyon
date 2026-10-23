# 书影音 — 工程视角

**Feature**: F-005 · [产品视角](../../../product/features/F-005-书影音/_index.md)

| 文档 | 说明 |
|------|------|
| [feature-architecture.md](architecture/feature-architecture.md) | 架构、数据流、前端组件、跨 Feature 影响 |
| [ADR-011](architecture/adr/ADR-011-shelf-domain-douban-recognition.md) | 新领域 `shelf`；豆瓣识别防腐层；封面识别时下载 |
| [ADR-014](architecture/adr/ADR-014-douban-bulk-import.md) | 豆瓣批量导入：前端逐页驱动；全量 + 按水位增量同步；按豆瓣 ID 覆盖；结束时重建一次 |
| [ADR-012](architecture/adr/ADR-012-shelf-reader-build-and-covers.md) | `GET /api/shelf` + `virtual:shelf-data`；路径路由；`/covers/*` |
| [shelf 领域](../../backend/domains/shelf/domain-model.md) · [API](../../backend/domains/shelf/api-contract.md) · [数据](../../backend/domains/shelf/data-model.md) | 领域模型、API 契约、数据模型（迁移 0004） |
| [reader 模块 §1.3](../../frontend/modules/reader/module-spec.md) | `virtual:shelf-data` |
| [us-to-domain.md](us-to-domain.md) | US → Domain 映射 |

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-21 | 创建 | miraclehifi |
| 2026-10-23 | 加 ADR-014（US-04 豆瓣批量导入） | miraclehifi |
