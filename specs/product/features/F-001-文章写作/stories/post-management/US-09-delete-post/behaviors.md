# US-09 删除文章 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-DELETE-01 | 从列表左滑删除文章 | 正常 |
| BH-02 | SC-DELETE-02 | 从写文章页删除后回到列表 | 正常 |
| BH-03 | SC-DELETE-03 | 写文章页取消删除保持不变 | UI |
| BH-04 | SC-DELETE-04 | 删除已发布文章后读者无法访问 | 边界 |
| BH-05 | SC-DELETE-05 | 删除不存在的文章返回 404 | 错误 |
| BH-06 | SC-DELETE-06 | 删除失败时提示且文章保留 | 错误 |
| BH-07 | SC-DELETE-07 | 列表删除后撤销 | 正常 |
| BH-08 | SC-DELETE-08 | 撤销期内离开页面立即提交删除 | 边界 |
| BH-09 | SC-DELETE-09 | 拖动卡片不误进写文章页 | UI |

---

## BH-01: 从列表左滑删除文章

**SC-ID**: SC-DELETE-01

```gherkin
Given 列表中有文章 "Old Post"
When 我把 "Old Post" 行向左拖过行宽 60% 后松手
  Or 左滑露出抽屉后点击"删除"
Then 该行折叠消失，"共 N 篇"减 1
  And 显示提示"已删除《Old Post》"和"撤销"
When 6 秒内没有点"撤销"
Then 文章被删除，刷新后列表中不再有 "Old Post"
```

## BH-02: 从写文章页删除后回到列表

**SC-ID**: SC-DELETE-02

```gherkin
Given 我在 "Old Post" 的写文章页
When 我点击设置抽屉的"删除文章"并确认
Then 跳转到 /admin，列表中不再有 "Old Post"
  And 离开时不弹出"未保存"确认
```

## BH-03: 取消删除文章保持不变

**SC-ID**: SC-DELETE-03

```gherkin
Given 写文章页的删除确认框已弹出
When 我点击"取消"或按 Esc
Then 确认框关闭，文章仍在
```

## BH-04: 删除已发布文章后读者无法访问

**SC-ID**: SC-DELETE-04

```gherkin
Given 已发布文章 slug 为 "old-post"
When 我删除它
Then 读者端按 slug "old-post" 读取返回不存在
  And 读者缓存失效
```

## BH-05: 删除不存在的文章返回 404

**SC-ID**: SC-DELETE-05

```gherkin
Given 文章已被删除
When 再次调用删除接口
Then 接口返回 404，不影响其他数据
```

## BH-06: 删除失败时提示且文章保留

**SC-ID**: SC-DELETE-06

```gherkin
Given 删除接口返回 500
When 我在写文章页确认删除
Then 显示"删除失败，请重试"，停留在写文章页
When 我在列表删除，撤销期结束后提交失败
Then 该行回到原位置，显示常驻提示"删除《标题》失败，请重试"
```

## BH-07: 列表删除后撤销

**SC-ID**: SC-DELETE-07

```gherkin
Given 我刚在列表删除 "Old Post"，撤销提示仍在
When 我点击"撤销"
Then "Old Post" 回到列表原来的位置，"共 N 篇"恢复
  And 没有发出删除请求
```

## BH-08: 撤销期内离开页面立即提交删除

**SC-ID**: SC-DELETE-08

```gherkin
Given 我刚在列表删除 "Old Post"，撤销提示仍在
When 我点进另一篇文章或关闭标签页
Then 删除请求立即发出，"Old Post" 被删除
When 我在撤销期内又删除了 "Second Post"
Then "Old Post" 的删除立即提交，提示换成"已删除《Second Post》"
```

## BH-09: 拖动卡片不误进写文章页

**SC-ID**: SC-DELETE-09

```gherkin
Given 列表中有文章 "Old Post"
When 我拖动 "Old Post" 行露出抽屉后松手
Then 停在列表页，不进入写文章页
When 抽屉打开时我点击该卡片
Then 抽屉收起，仍不进入写文章页
When 我打开另一行的抽屉
Then "Old Post" 的抽屉收起
```
