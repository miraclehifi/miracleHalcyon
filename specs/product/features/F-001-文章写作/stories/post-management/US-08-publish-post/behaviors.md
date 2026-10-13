# US-08 发布、更新与撤回文章 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-PUBLISH-01 | 发布草稿后读者可读取 | 正常 |
| BH-02 | SC-PUBLISH-02 | 发布日期为空时设为今天 | 边界 |
| BH-03 | SC-PUBLISH-03 | 必填项缺失时不能发布 | 错误 |
| BH-04 | SC-PUBLISH-04 | 更新已发布文章的修改 | 正常 |
| BH-05 | SC-PUBLISH-05 | 撤回已发布文章为草稿 | 正常 |
| BH-06 | SC-PUBLISH-06 | 读者永远读不到草稿或未发布修改 | 边界 |
| BH-07 | SC-PUBLISH-07 | 发布/更新/撤回后读者缓存失效 | 正常 |
| BH-08 | SC-PUBLISH-08 | 按钮按状态显示与禁用 | UI |
| BH-09 | SC-PUBLISH-09 | 发布前先保存未保存内容 | 边界 |
| BH-10 | SC-PUBLISH-10 | 发布请求失败时状态不变并提示 | 错误 |

---

## BH-01: 发布草稿后读者可读取

**SC-ID**: SC-PUBLISH-01

```gherkin
Given 一篇草稿，标题、slug、正文齐全
When 我点击"发布"
Then 显示提示"已发布"
  And 状态标记变为"已发布"
  And 通过读者端接口可按 slug 读取到该文章
```

## BH-02: 发布日期为空时设为今天

**SC-ID**: SC-PUBLISH-02

```gherkin
Given 一篇草稿，发布日期被清空
When 我点击"发布"
Then 发布日期被设为今天
```

## BH-03: 必填项缺失时不能发布

**SC-ID**: SC-PUBLISH-03

```gherkin
Given 一篇草稿，标题为"无标题"或 slug 为空或正文为空
When 我点击"发布"
Then 显示"发布前请填写：标题、slug、正文"中缺失的项，并高亮对应输入框
  And 文章保持草稿状态
```

## BH-04: 更新已发布文章的修改

**SC-ID**: SC-PUBLISH-04

```gherkin
Given 一篇已发布文章，读者看到 "V1"，编辑内容为 "V2"（有未发布修改）
When 我点击"发布更新"
Then 读者读取到 "V2"
  And 状态标记变为"已发布"（无修改标记）
```

## BH-05: 撤回已发布文章为草稿

**SC-ID**: SC-PUBLISH-05

```gherkin
Given 一篇已发布文章
When 我点击"更多 → 撤回为草稿"
Then 弹出确认"撤回后读者将无法访问此文章"
When 我确认
Then 状态变为"草稿"
  And 读者端按 slug 读取返回不存在
  And 编辑内容保留
```

## BH-06: 读者永远读不到草稿或未发布修改

**SC-ID**: SC-PUBLISH-06

```gherkin
Given 草稿 A 与已发布文章 B（有未发布修改 "B2"，已发布内容 "B1"）
When 读者端查询文章列表与详情
Then 结果不含 A
  And B 的内容为 "B1"
```

## BH-07: 发布/更新/撤回后读者缓存失效

**SC-ID**: SC-PUBLISH-07

```gherkin
Given 读者页面已被缓存
When 我发布、更新或撤回一篇文章
Then 10 秒内读者访问文章列表页与该文章页看到最新状态
```

## BH-08: 按钮按状态显示与禁用

**SC-ID**: SC-PUBLISH-08

```gherkin
Given 文章为草稿
Then 显示主按钮"发布"，不显示"发布更新"与"撤回为草稿"
Given 文章已发布且无未发布修改
Then 显示"发布更新"（禁用）与"撤回为草稿"
Given 文章已发布且有未发布修改
Then "发布更新"可用
Given 发布/更新请求进行中
Then 对应按钮显示加载并禁用
```

## BH-09: 发布前先保存未保存内容

**SC-ID**: SC-PUBLISH-09

```gherkin
Given 状态栏为"未保存"
When 我点击"发布"
Then 先保存最新内容，再发布
  And 读者看到的是点击发布时编辑区的内容
```

## BH-10: 发布请求失败时状态不变并提示

**SC-ID**: SC-PUBLISH-10

```gherkin
Given 发布接口返回 500
When 我点击"发布"
Then 显示"发布失败，请重试"
  And 文章保持草稿状态，编辑内容不丢失
```
