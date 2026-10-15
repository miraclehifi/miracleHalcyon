# US-05 标签页 /tags/:tag - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-TAG-01 | 标签页列出该标签文章 | 正常 |
| BH-02 | SC-TAG-02 | 大小写不同的写法合并 | 边界 |
| BH-03 | SC-TAG-03 | 特殊字符标签 | 边界 |
| BH-04 | SC-TAG-04 | 标签页分页 | 边界 |
| BH-05 | SC-TAG-05 | 只在草稿中的标签 | 错误 |

---

## BH-01: 标签页列出该标签文章

**SC-ID**: SC-TAG-01

```gherkin
Given 已发布文章 A、B 带 Astro，C 不带
When 我访问 /tags/astro
Then 只显示 A、B，按发布日期倒序
  And 页头显示"#Astro"与"2 篇文章"
```

## BH-02: 大小写不同的写法合并

**SC-ID**: SC-TAG-02

```gherkin
Given 文章 A 标签写作 Astro，B 写作 astro，C 写作 Astro
When 我访问 /tags/astro
Then 显示 A、B、C，页头标签名为出现最多的"Astro"
  And 所有卡片中的标签链接都指向 /tags/astro
```

## BH-03: 特殊字符标签

**SC-ID**: SC-TAG-03

```gherkin
Given 文章带标签"C# 与 .NET/Core"
When 我点击该标签
Then 进入编码后的地址，页面正常显示该标签的文章
```

## BH-04: 标签页分页

**SC-ID**: SC-TAG-04

```gherkin
Given 25 篇已发布文章带标签 Astro
When 我访问 /tags/astro
Then 显示 20 篇与页码，第 2 页地址为 /tags/astro/page/2
```

## BH-05: 只在草稿中的标签

**SC-ID**: SC-TAG-05

```gherkin
Given 标签 Secret 只出现在草稿中
When 我访问 /tags/secret
Then 显示 404
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
