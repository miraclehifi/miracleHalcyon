# F-006 Sprint 7 任务测试结果

## 任务 1 implement-orphan-detection-api（2026-10-16）

| 测试文件 | 覆盖 | 结果 |
|---------|------|------|
| `tests/unit/media/storage-classify.test.ts` | MEDIA-UT-09；TC-US01-04 | 3 / 3 |
| `tests/unit/post/collect-references.test.ts` | TC-US01-05（与 `parseMarks` 一致性） | 12 / 12 |
| `tests/integration/post/image-reference-query.test.ts` | POST-UT-15、16；TC-US01-02、03、05、07 | 6 / 6 |
| `tests/integration/media/storage-orphans.test.ts` | TC-US01-04、06、08 | 3 / 3 |
| `tests/integration/media/storage-orphans-perf.test.ts` | TC-US01-11 | 1 / 1（711 ms） |

- 首版按 ADR-009 方案 C1（`json_each` × `posts` 逐图 `instr`）实现，功能正确但性能测试 34,484 ms，不达标；改为方案 C2（递归 CTE 抽取 `img/` 片段 + Worker 解析）后 711 ms。ADR-009、post domain-model §6.1、TC-US01-05 #6 已同步
- 回归：`tests/integration/media`、`tests/integration/post`、`tests/unit/media`、`tests/unit/post` 37 个文件 101 个测试通过；`npm run lint`、`npm run check` 0 错误
- `ImageRepo` 拆出 `ImageCleanupRepo`（清理用方法），避免上传侧测试桩需要实现清理方法

## 任务 2 implement-orphan-cleanup-api（2026-10-16）

| 测试文件 | 覆盖 | 结果 |
|---------|------|------|
| `tests/integration/media/storage-cleanup.test.ts` | MEDIA-UT-10；TC-US02-01、02、03、09 | 4 / 4 |
| `tests/integration/media/storage-cleanup-failure.test.ts` | TC-US02-05（R2 / D1 各失败一轮后重跑）、TC-US02-07（1,000 / 1,001 / 1,200 张） | 5 / 5 |
| `tests/integration/media/storage-cleanup-api.test.ts` | TC-US02-06（401 / 跨站 403 / 无 Origin 403；只导出 POST） | 2 / 2 |

- 回归：`tests/integration/media`（含上传、读取、内存测试）、`tests/unit/media` 通过；lint 0；check 中本 Sprint 文件 0 错误（另有 3 个错误在 `tests/unit/upload/use-image-uploads.test.tsx`，属 Sprint 6 并行会话进行中的红灯阶段）
- `MediaStore` 拆出 `MediaCleanupStore`（`deleteMany`），理由同 `ImageCleanupRepo`
- 方法限制（405）以"路由只导出 POST"断言，Astro 对未导出方法返回 405

## 任务 3 add-storage-page（2026-10-16）

| 测试文件 | 覆盖 | 结果 |
|---------|------|------|
| `tests/unit/ui/format-bytes.test.ts` | UT-01 | 8 / 8 |
| `tests/unit/admin/storage-page.test.tsx` | UT-02、03、04；TC-US01-01、12、14、15 | 4 / 4 |
| `tests/e2e/storage-page.spec.ts` | TC-US01-01（含 390 宽）、09、10、12、13、14、15 | chromium 8 / 8，webkit 8 / 8 |

- 本地 D1 / R2 被并行 E2E 共享且跨运行保留：除 TC-US01-09（未登录跳转）、TC-US01-10（真实接口不请求 /img/）外，检测接口用 `page.route` 返回固定数据
- 390 宽首轮失败：`Button` 底层 SpecularButton 的光晕 canvas（`-inset-6`）在全宽按钮上越出视口 8px；手机端 `main` 加 `overflow-x-clip` 修复
- 设计令牌没有 28px 字号：StatCard 主数字改用 `text-title`（24px），手机页面标题沿用 `PageHeader` 的 `text-display`；admin-storage.md 与 admin.pen 同步
- 回归：文章列表与登出 E2E（`post-list*.spec.ts`、`logout.spec.ts`）chromium 7 / 7；`tests/unit/admin`、`tests/unit/ui` 33 个文件通过
- 红灯阶段说明：两个单元测试文件与实现同一轮写入，未单独记录红灯输出（模块不存在必然失败）；E2E 首轮红灯见上

## 任务 4 add-storage-cleanup-flow（2026-10-16）

| 测试文件 | 覆盖 | 结果 |
|---------|------|------|
| `tests/unit/admin/storage-cleanup-text.test.ts` | UT-05、06 | 4 / 4 |
| `tests/e2e/storage-cleanup.spec.ts` | TC-US02-10、11（含 UT-07 焦点与 Esc）、12、13、14 | chromium 5 / 5，webkit 5 / 5 |
| `tests/e2e/storage-live-fallback.spec.ts` | TC-US02-08 | chromium 1 / 1，webkit 1 / 1 |
| `tests/integration/media/storage-cleanup.test.ts`（追加） | TC-US02-04（清理时重新判定） | 5 / 5 |

- E2E 中真实清理会删掉其他用例依赖的夹具，清理与检测接口都用 `page.route` 返回固定数据；TC-US02-04 改在集成测试中验证（数据按文件隔离）
- TC-US02-11 在 WebKit 首轮失败：WebKit 鼠标点击按钮不获得焦点，确认框关闭后无处归还焦点；"焦点回到触发按钮"针对键盘用户，用例改为键盘打开（focus + Enter）
- TC-US02-08 用 e2e:seed 的普通图片（本无视频）加 `#live` 模拟"视频已清理"；读者页与预览共用 `ArticleImage`
- lint 规则 react-hooks/set-state-in-effect：首次检测改为 `then` 回调写状态
