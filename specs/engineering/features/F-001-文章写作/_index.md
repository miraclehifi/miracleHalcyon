# F-001 文章写作 — 研发视角

> 研发工程师的工作入口。

## 本目录内容

- [架构设计](./architecture/feature-architecture.md)（含 [ADR](./architecture/adr/)）
- [US→Domain 映射](./us-to-domain.md)
- 后端 Domain：[auth](../../backend/domains/auth/domain-model.md) · [post](../../backend/domains/post/domain-model.md) · [media](../../backend/domains/media/domain-model.md)（各含 api-contract、data-model）
- 前端模块：[markdown](../../frontend/modules/markdown/module-spec.md) · [editor](../../frontend/modules/editor/module-spec.md) · [media-upload](../../frontend/modules/media-upload/module-spec.md)
- [字段格式](../../shared-field-formats.md) · [共享 Domain](../../shared-domains.md)

## 相关产品需求

- [Feature 范围](../../../product/features/F-001-文章写作/feature-scope.md)
- [User Stories](../../../product/features/F-001-文章写作/stories/_index.md)

## 涉及的 Domain

| Domain | 类型 | 说明 |
|--------|------|------|
| `auth` | 支撑 | 会话与限流 |
| `post` | 核心 | 文章工作稿 / 已发布快照；对 F-002 提供只读查询 |
| `media` | 支撑 | 图片与实况视频上传、R2 存取 |
| `markdown` | 共享内核 | 同构渲染模块 |

## 相关 UI 与测试

- [页面规格](../../../ui/pages/)、[组件清单](../../../ui/components.md)
- [验收测试](../../../test/features/F-001-文章写作/acceptance/)、[前端单元测试规格](../../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)
