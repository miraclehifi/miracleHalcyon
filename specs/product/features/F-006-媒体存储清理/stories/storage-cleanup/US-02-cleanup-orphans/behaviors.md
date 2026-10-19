# US-02 一键清理未引用媒体 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-CLEANUP-01 | 确认后清理未引用图片与视频 | 正常 |
| BH-02 | SC-CLEANUP-02 | 只清理视频时保留图片 | 正常 |
| BH-03 | SC-CLEANUP-03 | 确认框内容与取消 | UI |
| BH-04 | SC-CLEANUP-04 | 清理中按钮不可重复点击 | UI |
| BH-05 | SC-CLEANUP-05 | 无未引用资源时按钮禁用 | UI |
| BH-06 | SC-CLEANUP-06 | 打开页面后被重新引用的图片不被删除 | 边界 |
| BH-07 | SC-CLEANUP-07 | 清理不碰被引用与保护期内的记录 | 边界 |
| BH-08 | SC-CLEANUP-08 | 页面统计过期时按清理时的实际结果提示 | 边界 |
| BH-09 | SC-CLEANUP-09 | 清理中途失败可再次清理完成 | 错误 |
| BH-10 | SC-CLEANUP-10 | 清理接口拒绝未登录与非法来源 | 错误 |
| BH-11 | SC-CLEANUP-11 | 视频已清理的图片重新加 live 只显示静态图 | 边界 |
| BH-12 | SC-CLEANUP-12 | 大量记录分批清理 | 边界 |

---

## BH-01: 确认后清理未引用图片与视频

**SC-ID**: SC-CLEANUP-01

```gherkin
Given 有 2 张未引用图片（其中 O1 带实况视频）和 1 段未引用实况视频
When 我点"一键清理未引用资源"并在确认框点"清理"
Then R2 中 O1、O2 的图片对象与 O1 的 .live.mp4 被删除
  And images 表中 O1、O2 两行被删除
  And 提示"已清理 3 项，释放 Y MB"
  And 统计刷新为 0，按钮禁用
```

## BH-02: 只清理视频时保留图片

**SC-ID**: SC-CLEANUP-02

```gherkin
Given 图片 V 被文章引用但引用都不带 live，V 的视频为未引用
When 清理
Then R2 中 V 的 .live.mp4 被删除，V 的图片对象保留
  And images 中 V 的 video_key、video_size 为 NULL，其余字段不变
  And 文章中 V 正常显示
```

## BH-03: 确认框内容与取消

**SC-ID**: SC-CLEANUP-03

```gherkin
Given 有 2 张未引用图片、1 段未引用视频、可释放 5.7 MB
When 我点"一键清理未引用资源"
Then 弹出确认框，写明"将清理 2 张图片、1 个实况视频，释放 5.7 MB。清理后无法恢复。"
When 我点"取消"或按 Esc
Then 确认框关闭，不发出清理请求，统计不变
```

## BH-04: 清理中按钮不可重复点击

**SC-ID**: SC-CLEANUP-04

```gherkin
Given 我已在确认框点"清理"，请求尚未返回
When 我再次点击确认框的"清理"或页面上的"一键清理"
Then 不发出第二个清理请求
  And 确认按钮显示进行中状态
```

## BH-05: 无未引用资源时按钮禁用

**SC-ID**: SC-CLEANUP-05

```gherkin
Given 未引用图片与未引用视频都为 0（可能有保护期内的记录）
When 我查看存储页
Then "一键清理未引用资源"禁用，显示"存储状态良好，无未引用文件"
```

## BH-06: 打开页面后被重新引用的图片不被删除

**SC-ID**: SC-CLEANUP-06

```gherkin
Given 存储页显示图片 R 为未引用
  And 之后我在写文章页把 R 插回文章并已自动保存
When 我在存储页确认清理（未重新检测）
Then R 的 R2 对象与 images 记录都保留
```

## BH-07: 清理不碰被引用与保护期内的记录

**SC-ID**: SC-CLEANUP-07

```gherkin
Given 有被草稿 body 引用的图片、只被 pub_body 引用的图片、只被 pub_cover 引用的图片、带 live 引用的实况图片、23 小时前上传的未引用图片
  And 另有 1 张 2 天前上传的未引用图片 O
When 清理
Then 只有 O 被删除
  And 其余图片的 R2 对象、视频对象与 images 记录全部保留
```

## BH-08: 页面统计过期时按清理时的实际结果提示

**SC-ID**: SC-CLEANUP-08

```gherkin
Given 存储页显示未引用图片 3 张
  And 之后其中 1 张被重新引用
When 我确认清理
Then 实际清理 2 张，提示"已清理 2 项，释放 …"（按清理接口返回的数量与体积）
```

## BH-09: 清理中途失败可再次清理完成

**SC-ID**: SC-CLEANUP-09

```gherkin
Given 清理执行到一半时 R2 或 D1 出错，接口返回 500
When 清理失败
Then 提示"清理未完成，请重试"，确认框关闭
  And 统计自动重新检测
  And 已删除的不恢复，未处理的记录与对象保持原样
When 我再次清理且服务恢复
Then 剩余未引用资源被清理，统计为 0
```

## BH-10: 清理接口拒绝未登录与非法来源

**SC-ID**: SC-CLEANUP-10

```gherkin
Given 没有有效会话
When 调用 POST /api/admin/storage/cleanup
Then 返回 401，不删除任何数据
Given 已登录但请求 Origin 不是站点地址
When 调用 POST /api/admin/storage/cleanup
Then 返回 403，不删除任何数据
```

## BH-11: 视频已清理的图片重新加 live 只显示静态图

**SC-ID**: SC-CLEANUP-11

```gherkin
Given 图片 V 的实况视频已被清理
When 我在正文中把 V 的引用改为 "…jpg#live" 并预览
  And 把鼠标移到图片上（手机长按）
Then 视频加载失败，LIVE 标记隐藏，只显示静态图，不报错
  And 发布后读者页同样如此
```

## BH-12: 大量记录分批清理

**SC-ID**: SC-CLEANUP-12

```gherkin
Given 有 1,200 张未引用图片
When 清理
Then 1,200 张全部被删除（R2 每批不超过 1,000 个 key，D1 按参数上限分批）
  And 提示"已清理 1200 项，…"
```
