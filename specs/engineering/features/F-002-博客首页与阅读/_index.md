# F-002 博客首页与阅读 — 研发视角

> 研发工程师的工作入口。

## 本目录内容

- [架构设计](./architecture/feature-architecture.md)（含 [ADR-007 构建数据与重建](./architecture/adr/ADR-007-reader-build-data.md)、[ADR-008 读者页交互](./architecture/adr/ADR-008-reader-interactivity.md)）
- [US→Domain 映射](./us-to-domain.md)（design-domain 产出）
- 后端 Domain：[post](../../backend/domains/post/domain-model.md)（封面增量）
- 前端模块：[reader](../../frontend/modules/reader/module-spec.md)（design-domain 产出）· [markdown](../../frontend/modules/markdown/module-spec.md)（引用署名增量）
- [字段格式](../../shared-field-formats.md) · [共享 Domain](../../shared-domains.md)

## 相关产品需求

- [Feature 范围](../../../product/features/F-002-博客首页与阅读/feature-scope.md)
- [User Stories](../../../product/features/F-002-博客首页与阅读/stories/_index.md)

## 涉及的 Domain / 模块

| Domain / 模块 | 类型 | 说明 |
|--------|------|------|
| `post` | 核心（F-001） | 只读已发布快照；新增封面字段 |
| `markdown` | 共享内核（F-001） | 构建时渲染；新增引用署名插件 |
| `reader` | 无状态模块（新） | 构建期视图模型纯函数 |
| `rebuild` | 适配器（新） | Deploy Hook 实现 `PublicationHooks` |

## 相关 UI 与测试

- 页面规格：[reader-shell](../../../ui/pages/reader-shell.md) · [reader-home](../../../ui/pages/reader-home.md) · [reader-post-list](../../../ui/pages/reader-post-list.md) · [reader-post-detail](../../../ui/pages/reader-post-detail.md)；[组件清单](../../../ui/components.md)
- [验收测试](../../../test/features/F-002-博客首页与阅读/acceptance/)（共享夹具 [_fixtures.md](../../../test/features/F-002-博客首页与阅读/acceptance/_fixtures.md)）、[前端单元测试规格](../../../test/features/F-002-博客首页与阅读/unit/frontend-unit-tests.md)
