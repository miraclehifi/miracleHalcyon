# F-006 US → Domain 映射

**最后更新**: 2026-10-16

| US | Domain | 能力 | 接口 |
|----|--------|------|------|
| US-01 detect-orphans | `media` | `StorageService.detectOrphans`、`ImageCleanupRepo.listAll`、`classifyOrphans` / `summarize`（[domain-model](../../backend/domains/media/domain-model.md) §9） | `GET /api/admin/storage/orphans` |
| US-01 detect-orphans | `post` | `ImageReferenceQuery.classify`（[domain-model](../../backend/domains/post/domain-model.md) §6.1） | — |
| US-01 detect-orphans | `auth` | middleware 会话校验（页面 302、接口 401） | — |
| US-02 cleanup-orphans | `media` | `StorageService.cleanupOrphans`、`MediaCleanupStore.deleteMany`、`ImageCleanupRepo.removeOrphans` | `POST /api/admin/storage/cleanup` |
| US-02 cleanup-orphans | `post` | `ImageReferenceQuery.classify`（清理前重新判定） | — |
| US-02 cleanup-orphans | `auth` | middleware 会话 + Origin 校验 | — |

全部已实现（Sprint 7 任务 1–4）：后端见任务 1、2，页面 `src/pages/admin/storage.astro` + `StoragePage`（任务 3、4）。

反向映射见各 domain-model"服务的需求"（media §7、post §7）。
