# 构建时预渲染与发布后重建

**US ID**: US-03
**所属分组**: reader-site
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 发布、更新、撤回、删除文章后读者页自动重建
**以便于** 不用手动部署读者就能看到变化，且读者访问不消耗 Worker CPU

---

## 2. 验收标准

1. Given 站点完成构建
   When 读者访问 `/`、`/posts`（含分页）、`/posts/:slug`、`/tags/:tag`
   Then 返回构建时生成的静态页，不执行 Worker 代码

2. Given 我发布 / 发布更新 / 撤回 / 删除一篇文章
   When 操作成功
   Then 触发一次读者页重建；P95 ≤ 5 分钟读者看到变化

3. Given 触发重建失败（Deploy Hook 不可用）
   When 我发布文章
   Then 发布照常成功，失败只记日志

4. Given 线上还没有任何已发布文章
   When 站点构建
   Then 构建成功，`/posts` 显示空态，不生成详情页与标签页

5. Given 存在草稿、已撤回、已删除的文章
   When 站点构建
   Then 这些文章不出现在任何构建产物中（列表、详情、标签页、上一篇 / 下一篇、同标签文章）

---

## 3. 约束与假设

**约束**:
- 构建脚本读线上公开接口 `GET /api/posts[/:slug]`，不需要 D1 凭据
- Deploy Hook URL 作为 Worker Secret 注入

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-002-博客首页与阅读/us-to-domain.md)
- [reader-build-time-prerender](../../../../../../backlog/reader-build-time-prerender.md)
- [全局 NFR](../../../../nfr.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
