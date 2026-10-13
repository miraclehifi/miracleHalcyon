# US-03 新建与编辑文章 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-POSTINFO-01 | 新建文章显示空白表单，默认草稿与今天日期 | 正常 |
| BH-02 | SC-POSTINFO-02 | 填写信息与正文后保存成功 | 正常 |
| BH-03 | SC-POSTINFO-03 | 打开已有文章显示最新保存内容 | 正常 |
| BH-04 | SC-POSTINFO-04 | 英文标题自动生成 slug | 正常 |
| BH-05 | SC-POSTINFO-05 | 手动修改 slug 后不再跟随标题 | 边界 |
| BH-06 | SC-POSTINFO-06 | 中文标题无法生成 slug 时提示手动填写 | 边界 |
| BH-07 | SC-POSTINFO-07 | slug 含非法字符时提示格式错误 | 错误 |
| BH-08 | SC-POSTINFO-08 | slug 与其他文章重复时保存失败 | 错误 |
| BH-09 | SC-POSTINFO-09 | 摘要超过 200 字时提示 | 边界 |
| BH-10 | SC-POSTINFO-10 | 添加、删除、自动补全标签 | UI |
| BH-11 | SC-POSTINFO-11 | 打开不存在的文章显示 404 | 错误 |

---

## BH-01: 新建文章显示空白表单，默认草稿与今天日期

**SC-ID**: SC-POSTINFO-01

```gherkin
Given 我已登录并在文章列表页
When 我点击"新建文章"
Then 我进入写文章页
  And 标题、slug、标签、摘要、正文为空
  And 发布日期为今天
  And 状态标记显示"草稿"
```

## BH-02: 填写信息与正文后保存成功

**SC-ID**: SC-POSTINFO-02

```gherkin
Given 我在新建文章的写文章页
When 我输入标题"Hello Astro"、标签"astro"、摘要和正文
  And 保存（自动保存或 Ctrl/Cmd+S）
Then 文章以草稿状态写入数据库
  And 地址栏变为 /admin/posts/{id}/edit
```

## BH-03: 打开已有文章显示最新保存内容

**SC-ID**: SC-POSTINFO-03

```gherkin
Given 已存在一篇文章，标题为"旧标题"，正文为"旧正文"
When 我打开它的写文章页
Then 表单显示"旧标题"，编辑区显示"旧正文"
```

## BH-04: 英文标题自动生成 slug

**SC-ID**: SC-POSTINFO-04

```gherkin
Given 我未手动修改过 slug
When 我输入标题"Hello Astro 5!"
Then slug 自动变为 "hello-astro-5"
```

## BH-05: 手动修改 slug 后不再跟随标题

**SC-ID**: SC-POSTINFO-05

```gherkin
Given 我手动把 slug 改为 "my-post"
When 我把标题改为"New Title"
Then slug 保持 "my-post"
```

## BH-06: 中文标题无法生成 slug 时提示手动填写

**SC-ID**: SC-POSTINFO-06

```gherkin
Given 我未手动修改过 slug
When 我输入标题"你好世界"
Then slug 输入框为空并提示"请填写英文 slug"
  And 草稿仍可保存，发布时 slug 必填
```

## BH-07: slug 含非法字符时提示格式错误

**SC-ID**: SC-POSTINFO-07

```gherkin
Given 我在写文章页
When 我把 slug 改为 "Hello World!"
Then slug 输入框下显示"仅允许小写字母、数字和连字符"
  And 该 slug 不会被保存
```

## BH-08: slug 与其他文章重复时保存失败

**SC-ID**: SC-POSTINFO-08

```gherkin
Given 已存在 slug 为 "hello-astro" 的另一篇文章
When 我把当前文章 slug 改为 "hello-astro" 并保存
Then slug 输入框下显示"slug 已存在"
  And 当前文章的 slug 保持原值
```

## BH-09: 摘要超过 200 字时提示

**SC-ID**: SC-POSTINFO-09

```gherkin
Given 我在摘要框输入
When 字数超过 200
Then 字数计数显示为红色 "201/200"
  And 超出部分不被保存，提示"摘要不能超过 200 字"
```

## BH-10: 添加、删除、自动补全标签

**SC-ID**: SC-POSTINFO-10

```gherkin
Given 已有其他文章使用标签 "astro"、"react"
When 我在标签框输入 "as"
Then 下拉建议显示 "astro"
When 我选中 "astro" 并再输入 "cloudflare" 回车
Then 显示两个标签块 "astro"、"cloudflare"
When 我点击 "astro" 标签块上的 ×
Then 只剩 "cloudflare"
```

## BH-11: 打开不存在的文章显示 404

**SC-ID**: SC-POSTINFO-11

```gherkin
Given 不存在 id 为 "nope" 的文章
When 我访问 /admin/posts/nope/edit
Then 显示"文章不存在"与"返回列表"按钮
```
