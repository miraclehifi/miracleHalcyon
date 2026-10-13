# US-06 自动保存草稿 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-AUTOSAVE-01 | 停止输入 2 秒后自动保存 | 正常 |
| BH-02 | SC-AUTOSAVE-02 | 保存状态栏显示未保存/保存中/已保存 | UI |
| BH-03 | SC-AUTOSAVE-03 | 关闭后重开恢复最后保存内容 | 正常 |
| BH-04 | SC-AUTOSAVE-04 | 新建文章未填标题时自动保存为"无标题" | 边界 |
| BH-05 | SC-AUTOSAVE-05 | 空白新建页不产生草稿 | 边界 |
| BH-06 | SC-AUTOSAVE-06 | 断网时本地暂存并在恢复后重试 | 错误 |
| BH-07 | SC-AUTOSAVE-07 | 重开时发现本地内容更新，提示恢复 | 错误 |
| BH-08 | SC-AUTOSAVE-08 | 已发布文章自动保存不影响读者 | 边界 |
| BH-09 | SC-AUTOSAVE-09 | 有未保存修改时离开页面弹确认 | UI |
| BH-10 | SC-AUTOSAVE-10 | 会话过期时保存失败提示重新登录且不丢内容 | 错误 |
| BH-11 | SC-AUTOSAVE-11 | 手动 Ctrl/Cmd+S 立即保存 | 正常 |

---

## BH-01: 停止输入 2 秒后自动保存

**SC-ID**: SC-AUTOSAVE-01

```gherkin
Given 我在一篇草稿的写文章页
When 我输入一段文字后停止输入 2 秒
Then 发起一次保存请求
  And 数据库中的正文与编辑区一致
```

## BH-02: 保存状态栏显示未保存/保存中/已保存

**SC-ID**: SC-AUTOSAVE-02

```gherkin
Given 我在写文章页
When 我修改正文
Then 状态栏显示"未保存"
When 自动保存请求进行中
Then 状态栏显示"保存中…"
When 保存成功
Then 状态栏显示"已保存 · 14:32"
```

## BH-03: 关闭后重开恢复最后保存内容

**SC-ID**: SC-AUTOSAVE-03

```gherkin
Given 我写完一段正文且状态栏显示"已保存"
When 我关闭浏览器标签页后重新打开这篇文章
Then 编辑区显示刚才写的完整内容
```

## BH-04: 新建文章未填标题时自动保存为"无标题"

**SC-ID**: SC-AUTOSAVE-04

```gherkin
Given 我在新建文章页，标题为空
When 我输入正文并停止 2 秒
Then 创建一篇标题为"无标题"的草稿
  And 地址栏变为 /admin/posts/{id}
```

## BH-05: 空白新建页不产生草稿

**SC-ID**: SC-AUTOSAVE-05

```gherkin
Given 我打开新建文章页
When 我不输入任何内容就离开
Then 数据库中不新增文章
```

## BH-06: 断网时本地暂存并在恢复后重试

**SC-ID**: SC-AUTOSAVE-06

```gherkin
Given 网络已断开
When 我修改正文并停止 2 秒
Then 状态栏显示"保存失败，将自动重试"
  And 内容写入浏览器本地暂存
When 网络恢复
Then 自动重新保存成功，状态栏显示"已保存"
  And 本地暂存被清除
```

## BH-07: 重开时发现本地内容更新，提示恢复

**SC-ID**: SC-AUTOSAVE-07

```gherkin
Given 浏览器本地暂存的内容比服务端最后保存的更新
When 我打开这篇文章
Then 显示提示条"发现未同步的本地内容（14:35），是否恢复？" 及"恢复"/"丢弃"
When 我点击"恢复"
Then 编辑区替换为本地内容并立即保存
```

## BH-08: 已发布文章自动保存不影响读者

**SC-ID**: SC-AUTOSAVE-08

```gherkin
Given 一篇已发布文章，读者看到的正文为 "V1"
When 我把正文改为 "V2" 并自动保存
Then 文章状态显示"已发布 · 有修改"
  And 读者读取到的正文仍为 "V1"
```

## BH-09: 有未保存修改时离开页面弹确认

**SC-ID**: SC-AUTOSAVE-09

```gherkin
Given 状态栏为"未保存"或"保存中…"
When 我关闭标签页或点击浏览器后退
Then 浏览器弹出离开确认
Given 状态栏为"已保存"
When 我离开页面
Then 不弹出确认
```

## BH-10: 会话过期时保存失败提示重新登录且不丢内容

**SC-ID**: SC-AUTOSAVE-10

```gherkin
Given 我的会话已过期
When 自动保存触发并收到 401
Then 状态栏显示"登录已过期，请重新登录"并提供登录链接（新窗口）
  And 内容写入浏览器本地暂存
When 我在新窗口登录后回到写文章页
Then 下一次自动保存成功
```

## BH-11: 手动 Ctrl/Cmd+S 立即保存

**SC-ID**: SC-AUTOSAVE-11

```gherkin
Given 我在写文章页且有未保存修改
When 我按 Ctrl/Cmd+S
Then 立即发起保存，不等待 2 秒
  And 不弹出浏览器的"保存网页"对话框
```
