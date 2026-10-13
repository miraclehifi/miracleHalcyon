# US-07 后台文章列表 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-POSTLIST-01 | 列表按更新时间倒序显示全部文章及状态 | 正常 |
| BH-02 | SC-POSTLIST-02 | 点击文章进入写文章页 | 正常 |
| BH-03 | SC-POSTLIST-03 | 点击"新建文章"进入空白写文章页 | 正常 |
| BH-04 | SC-POSTLIST-04 | 按状态筛选 | UI |
| BH-05 | SC-POSTLIST-05 | 按标题关键字搜索 | UI |
| BH-06 | SC-POSTLIST-06 | 无文章时显示空状态 | 边界 |
| BH-07 | SC-POSTLIST-07 | 筛选无结果时显示提示 | 边界 |
| BH-08 | SC-POSTLIST-08 | 超过 20 篇分页 | 边界 |
| BH-09 | SC-POSTLIST-09 | 加载失败显示错误与重试 | 错误 |

---

## BH-01: 列表按更新时间倒序显示全部文章及状态

**SC-ID**: SC-POSTLIST-01

```gherkin
Given 存在草稿 A（更新于今天）、已发布 B（更新于昨天）、已发布且有未发布修改的 C（更新于前天）
When 我进入 /admin
Then 列表依次显示 A、B、C
  And 状态标记分别为"草稿"、"已发布"、"已发布 · 有修改"
  And 每行显示标题、标签、更新时间
```

## BH-02: 点击文章进入写文章页

**SC-ID**: SC-POSTLIST-02

```gherkin
Given 列表中有文章 A
When 我点击 A 的标题
Then 进入 /admin/posts/{A.id}
```

## BH-03: 点击"新建文章"进入空白写文章页

**SC-ID**: SC-POSTLIST-03

```gherkin
Given 我在列表页
When 我点击"新建文章"
Then 进入 /admin/posts/new
```

## BH-04: 按状态筛选

**SC-ID**: SC-POSTLIST-04

```gherkin
Given 存在 2 篇草稿、3 篇已发布
When 我选择筛选"草稿"
Then 列表只显示 2 篇草稿
  And 地址栏带 ?status=draft，刷新后筛选保持
```

## BH-05: 按标题关键字搜索

**SC-ID**: SC-POSTLIST-05

```gherkin
Given 存在标题含 "Astro" 的 2 篇文章
When 我在搜索框输入 "astro"
Then 列表只显示这 2 篇（不区分大小写）
```

## BH-06: 无文章时显示空状态

**SC-ID**: SC-POSTLIST-06

```gherkin
Given 数据库中没有文章
When 我进入 /admin
Then 显示插画/图标、"还没有文章"和"写第一篇"按钮
```

## BH-07: 筛选无结果时显示提示

**SC-ID**: SC-POSTLIST-07

```gherkin
Given 不存在标题含 "xyz" 的文章
When 我搜索 "xyz"
Then 显示"没有匹配的文章"与"清除筛选"按钮
```

## BH-08: 超过 20 篇分页

**SC-ID**: SC-POSTLIST-08

```gherkin
Given 存在 45 篇文章
When 我进入列表页
Then 第 1 页显示 20 篇，分页控件显示共 3 页
When 我点击第 3 页
Then 显示 5 篇
```

## BH-09: 加载失败显示错误与重试

**SC-ID**: SC-POSTLIST-09

```gherkin
Given 列表接口返回 500
When 我进入列表页
Then 显示"加载失败"与"重试"按钮
When 我点击"重试"且接口恢复
Then 列表正常显示
```
