# add-mainline-journey-e2e: 主干用户旅程 E2E

**Sprint**: Sprint 1
**序号**: 72
**状态**: completed
**类别**: TEST
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 按 Sprint 1 DoD 补一条全程走界面的主干旅程 E2E（不经接口造数据）
- **影响范围**: `tests/e2e/mainline-journey.spec.ts`（新增）
- **不变量**: 不改动产品代码；其余 E2E 不变

> 追加原因（2026-10-14 Sprint 1 DoD 核对）：各段已有 E2E，但发布 / 撤回用例都经接口造数据，缺一条串起来的旅程。

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | US-01、US-03、US-06、US-07、US-08（跨组旅程，见 [Sprint 1 DoD](_index.md)） |
| 设计依据 | [admin-login](../../ui/pages/admin-login.md)、[admin-post-list](../../ui/pages/admin-post-list.md)、[editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

主干旅程（Sprint 1 DoD）：
1. 登录页输入测试账号 → 进入 `/admin`
2. 点"新建文章"→ 输入标题 `Journey {run}` 与正文 → 2 秒后显示"已保存"，地址变为 `/admin/posts/:id`
3. 返回 `/admin`，列表中出现该标题，徽标"草稿"；点击进入写文章页
4. 点"发布"→ 提示"已发布，几分钟后读者可见"；`GET /api/posts/journey-{run}` 200，正文一致
5. 设置抽屉"撤回为草稿"→ 确认 → `GET /api/posts/journey-{run}` 404

## DoD（完成定义）

### 实现类
- [x] 新增 `tests/e2e/mainline-journey.spec.ts`，全程界面操作

### 测试类
- [x] 变更点测试：上述旅程在 chromium、webkit 通过
- [x] 影响范围回归：全量 E2E 通过
- [x] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-unpublish-action](implement-unpublish-action.md), [build-post-list-page](build-post-list-page.md), [build-login-page](build-login-page.md)

## 影响的文件

- `tests/e2e/mainline-journey.spec.ts`

## 回滚策略

删除新增测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed；DoD"主干 E2E"勾选 |
| status.yaml | `implementation` 进度 |
| test/validation | 追加旅程结果 |
