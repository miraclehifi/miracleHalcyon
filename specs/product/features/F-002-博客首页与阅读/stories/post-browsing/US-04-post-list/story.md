# 文章列表 /posts

**US ID**: US-04
**所属分组**: post-browsing
**状态**: draft

---

## 1. User Story

**作为** 读者
**我想要** 按时间浏览全部已发布文章
**以便于** 找到想读的文章

---

## 2. 验收标准

1. Given 存在已发布文章
   When 我访问 `/posts`
   Then 按发布日期倒序显示，每页 20 篇；超过一页时有上一页 / 下一页与页码，第 2 页起地址为 `/posts/page/2`；页头显示文章总数

2. Given 列表中有文章卡片
   When 我查看卡片
   Then 看到标题、摘要、日期、标签；点卡片进入详情，点标签进入标签页

3. Given 文章填了摘要 / 没填摘要
   When 列表渲染
   Then 有摘要显示摘要；没有则取正文纯文本前约 120 字（不露出 Markdown / HTML 原文），最多 3 行

4. Given 文章有封面 / 没有封面
   When 列表渲染
   Then 有封面时右侧显示 128×128 封面（裁切填满）；没有封面不留空位

5. Given 我用鼠标悬停卡片
   When 悬停
   Then 卡片下两层虚线框错位（各移 4px）；触屏不触发；减弱动效时不移动

6. Given 没有任何已发布文章
   When 我访问 `/posts`
   Then 显示空态

7. Given 我访问超出范围的页码（如 `/posts/page/99`）
   When 页面加载
   Then 显示 404

---

## 3. 约束与假设

**约束**:
- 摘要优先用 `summary` 字段（2026-10-15 作者决定）
- 不做列表搜索框（F-004）

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-002-博客首页与阅读/us-to-domain.md)
- [Backlog 文章列表页参考](../../../../../../backlog/blog-home-reading.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
