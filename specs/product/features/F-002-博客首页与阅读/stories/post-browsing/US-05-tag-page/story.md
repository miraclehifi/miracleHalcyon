# 标签页 /tags/:tag

**US ID**: US-05
**所属分组**: post-browsing
**状态**: draft

---

## 1. User Story

**作为** 读者
**我想要** 只看某个标签下的文章
**以便于** 集中读同一主题

---

## 2. 验收标准

1. Given 某标签下有已发布文章
   When 我访问 `/tags/:tag`
   Then 列出带该标签的已发布文章，卡片与分页规则同 `/posts`（第 2 页起 `/tags/:tag/page/2`）；页头显示标签名与篇数

2. Given 标签有大小写不同的写法
   When 我访问 `/tags/astro` 或 `/tags/Astro`
   Then 两者内容相同；页面链接统一用小写地址，页头标签名用出现最多的写法

3. Given 标签名含空格、中文、`#`、`/` 等字符
   When 我点击该标签
   Then 链接正确编码并打开对应标签页

4. Given 某标签只出现在草稿中
   When 我访问该标签地址
   Then 显示 404

---

## 3. 约束与假设

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-002-博客首页与阅读/us-to-domain.md)
- [站点地图](../../../../../ui/site-map.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
