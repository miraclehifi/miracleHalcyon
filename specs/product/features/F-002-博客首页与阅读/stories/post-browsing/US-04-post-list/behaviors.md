# US-04 文章列表 /posts - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-BROWSE-01 | 列表按发布日期倒序 | 正常 |
| BH-02 | SC-BROWSE-02 | 卡片内容与链接 | 正常 |
| BH-03 | SC-BROWSE-03 | 摘要优先用字段，否则截正文 | 正常 |
| BH-04 | SC-BROWSE-04 | 封面有则显示、无则不留空 | UI |
| BH-05 | SC-BROWSE-05 | 分页 | 边界 |
| BH-06 | SC-BROWSE-06 | 第 1 页没有单独地址 | 边界 |
| BH-07 | SC-BROWSE-07 | 超出范围的页码 | 错误 |
| BH-08 | SC-BROWSE-08 | 空列表 | 边界 |
| BH-09 | SC-BROWSE-09 | 悬停错位效果 | UI |

---

## BH-01: 列表按发布日期倒序

**SC-ID**: SC-BROWSE-01

```gherkin
Given 已发布文章 A（2026-10-01）、B（2026-10-10）、C（2026-10-05）
When 我访问 /posts
Then 依次显示 B、C、A
  And 页头显示"3 篇文章"
```

## BH-02: 卡片内容与链接

**SC-ID**: SC-BROWSE-02

```gherkin
Given 文章 "Hello" 带标签 Astro、Cloudflare
When 我查看它的卡片
Then 看到标题、摘要、日期、#Astro、#Cloudflare
  And 点击卡片进入 /posts/hello，点击 #Astro 进入 /tags/astro
```

## BH-03: 摘要优先用字段，否则截正文

**SC-ID**: SC-BROWSE-03

```gherkin
Given 文章 A 摘要为"手写摘要"，文章 B 无摘要、正文以 "## 标题\n\n**粗体**文字 ![图](/img/x.jpg)" 开头
When 我访问 /posts
Then A 显示"手写摘要"
  And B 显示"标题 粗体文字"开头的纯文本，不含 #、*、![ 等符号，约 120 字以内，最多 3 行
```

## BH-04: 封面有则显示、无则不留空

**SC-ID**: SC-BROWSE-04

```gherkin
Given 文章 A 有封面，B 没有
When 我访问 /posts
Then A 卡片右侧显示 128×128 封面（object-fit: cover，带宽高属性）
  And B 卡片文字占满宽度
```

## BH-05: 分页

**SC-ID**: SC-BROWSE-05

```gherkin
Given 有 41 篇已发布文章
When 我访问 /posts
Then 显示 20 篇和页码 1、2、3，"上一页"不可用
When 我点击页码 3
Then 进入 /posts/page/3，显示 1 篇，"下一页"不可用
```

## BH-06: 第 1 页没有单独地址

**SC-ID**: SC-BROWSE-06

```gherkin
Given 有 41 篇已发布文章
When 我访问 /posts/page/1
Then 显示 404（第 1 页只有 /posts）
```

## BH-07: 超出范围的页码

**SC-ID**: SC-BROWSE-07

```gherkin
Given 有 41 篇已发布文章
When 我访问 /posts/page/4
Then 显示 404
```

## BH-08: 空列表

**SC-ID**: SC-BROWSE-08

```gherkin
Given 没有已发布文章
When 我访问 /posts
Then 显示空态文案"还没有文章"，不显示分页
```

## BH-09: 悬停错位效果

**SC-ID**: SC-BROWSE-09

```gherkin
Given 我用鼠标访问 /posts
When 鼠标移入一张卡片
Then 卡片下两层虚线框分别向左上、右下移动 4px（0.3s）
Given 系统开启减弱动效，或我用触屏
When 移入或点按卡片
Then 虚线框不移动
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
