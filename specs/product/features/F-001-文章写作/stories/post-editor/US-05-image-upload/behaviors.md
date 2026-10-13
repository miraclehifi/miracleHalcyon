# US-05 图片上传 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-IMAGE-01 | 粘贴图片上传并插入引用 | 正常 |
| BH-02 | SC-IMAGE-02 | 拖入图片上传并插入引用 | 正常 |
| BH-03 | SC-IMAGE-03 | 工具栏选择图片上传 | 正常 |
| BH-04 | SC-IMAGE-04 | 多张图片按顺序插入 | 边界 |
| BH-05 | SC-IMAGE-05 | 超过 5MB 被拒绝 | 边界 |
| BH-06 | SC-IMAGE-06 | 不支持的格式被拒绝 | 错误 |
| BH-07 | SC-IMAGE-07 | 上传失败移除占位并提示 | 错误 |
| BH-08 | SC-IMAGE-08 | 服务端校验文件真实类型 | 错误 |
| BH-09 | SC-IMAGE-09 | 上传期间继续编辑不受影响 | UI |

---

## BH-01: 粘贴图片上传并插入引用

**SC-ID**: SC-IMAGE-01

```gherkin
Given 我在正文编辑区，剪贴板中有一张 200KB 的 png 截图
When 我按 Ctrl/Cmd+V
Then 光标处插入 "![上传中…]()"
  And 上传成功后替换为 "![image](https://<图片域名>/<随机名>.png)"
  And 预览区显示该图片
```

## BH-02: 拖入图片上传并插入引用

**SC-ID**: SC-IMAGE-02

```gherkin
Given 我在写文章页
When 我把 photo.jpg 拖到编辑区
Then 编辑区出现拖放高亮提示"松开以上传"
  And 松开后在放置位置插入 "![photo](<URL>)"
```

## BH-03: 工具栏选择图片上传

**SC-ID**: SC-IMAGE-03

```gherkin
Given 我在写文章页
When 我点击工具栏"插入图片"并选择 diagram.webp
Then 光标处插入 "![diagram](<URL>)"
```

## BH-04: 多张图片按顺序插入

**SC-ID**: SC-IMAGE-04

```gherkin
Given 我同时拖入 a.png、b.png、c.png
When 全部上传完成
Then 正文中按 a、b、c 顺序各插入一行图片引用
```

## BH-05: 超过 5MB 被拒绝

**SC-ID**: SC-IMAGE-05

```gherkin
Given 我有一张 6MB 的 jpg
When 我粘贴或拖入它
Then 显示提示"图片不能超过 5MB"
  And 不发起上传，正文不插入任何内容
```

## BH-06: 不支持的格式被拒绝

**SC-ID**: SC-IMAGE-06

```gherkin
Given 我有 logo.svg
When 我拖入它
Then 显示提示"仅支持 png、jpg、webp、gif"
  And 不发起上传
```

## BH-07: 上传失败移除占位并提示

**SC-ID**: SC-IMAGE-07

```gherkin
Given 网络中断
When 我粘贴一张图片
Then "![上传中…]()" 占位被移除
  And 显示提示"上传失败，请重试"
  And 正文其他内容不变
```

## BH-08: 服务端校验文件真实类型

**SC-ID**: SC-IMAGE-08

```gherkin
Given 我已登录
When 我直接调用上传接口，提交扩展名为 .png 但内容为 HTML 的文件
Then 接口返回 400 "不支持的图片格式"
  And R2 中不产生新文件
```

## BH-09: 上传期间继续编辑不受影响

**SC-ID**: SC-IMAGE-09

```gherkin
Given 一张大图正在上传
When 我在占位符之前继续输入文字
Then 上传完成后，图片引用仍替换到占位符所在位置
  And 我新输入的文字保持不变
```
