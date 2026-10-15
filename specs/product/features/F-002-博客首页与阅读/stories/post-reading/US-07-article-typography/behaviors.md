# US-07 文章正文渲染与阅读排版 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-ARTICLE-01 | 正文渲染与预览一致 | 正常 |
| BH-02 | SC-ARTICLE-02 | 代码高亮随主题切换 | UI |
| BH-03 | SC-ARTICLE-03 | 标题区 | 正常 |
| BH-04 | SC-ARTICLE-04 | 段首缩进与首字下沉 | UI |
| BH-05 | SC-ARTICLE-05 | 首段不是文字时不下沉 | 边界 |
| BH-06 | SC-ARTICLE-06 | 引用署名 | UI |
| BH-07 | SC-ARTICLE-07 | 正文中的 HTML 被清洗 | 错误 |
| BH-08 | SC-ARTICLE-08 | 不存在的 slug | 错误 |

---

## BH-01: 正文渲染与预览一致

**SC-ID**: SC-ARTICLE-01

```gherkin
Given 一篇已发布文章正文含表格、任务列表、删除线、ts 代码块
When 我访问 /posts/:slug
Then 正文 HTML 结构与写文章页预览对同一 Markdown 的输出一致
  And 代码块有语法高亮
```

## BH-02: 代码高亮随主题切换

**SC-ID**: SC-ARTICLE-02

```gherkin
Given 我在文章详情页，主题为亮色
When 我切换到暗色
Then 代码块无需刷新即切换为暗色配色
```

## BH-03: 标题区

**SC-ID**: SC-ARTICLE-03

```gherkin
Given 文章发布于 2026-10-01，2026-10-12 发布过更新
When 我查看标题区
Then 看到标题、"2026-10-01"、"更新于 2026-10-12"与标签链接
Given 文章发布后从未更新
Then 不显示"更新于"
```

## BH-04: 段首缩进与首字下沉

**SC-ID**: SC-ARTICLE-04

```gherkin
Given 正文第一段为文字，之后有段落、列表、代码块、引用、图片
When 我查看正文
Then 普通段落首行缩进 2 字，列表、代码块、引用、图片、表格不缩进
  And 第一段首字下沉
```

## BH-05: 首段不是文字时不下沉

**SC-ID**: SC-ARTICLE-05

```gherkin
Given 正文以图片或代码块开头
When 我查看正文
Then 没有任何字符下沉
```

## BH-06: 引用署名

**SC-ID**: SC-ARTICLE-06

```gherkin
Given 正文有引用，最后一段为"— 鲁迅"
When 我查看该引用
Then "— 鲁迅"右对齐显示为署名，引用左上有大号引号装饰
Given 引用最后一段不以"— "或"—— "开头
Then 不显示署名样式
```

## BH-07: 正文中的 HTML 被清洗

**SC-ID**: SC-ARTICLE-07

```gherkin
Given 正文包含 <script> 与 onerror 属性
When 我访问文章详情
Then 脚本不执行，危险属性被移除（与预览同一清洗规则）
```

## BH-08: 不存在的 slug

**SC-ID**: SC-ARTICLE-08

```gherkin
Given slug "draft-post" 只属于草稿
When 我访问 /posts/draft-post
Then 显示 404
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
