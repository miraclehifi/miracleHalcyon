# US-01 检测未引用媒体 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-DETECT-01 | 从顶栏进入存储页看到统计 | 正常 |
| BH-02 | SC-DETECT-02 | 草稿正文引用的图片不算未引用 | 边界 |
| BH-03 | SC-DETECT-03 | 只被已发布版本引用的图片不算未引用 | 边界 |
| BH-04 | SC-DETECT-04 | 封面引用（工作稿或已发布版本）的图片不算未引用 | 边界 |
| BH-05 | SC-DETECT-05 | 非图片语法的引用同样算引用 | 边界 |
| BH-06 | SC-DETECT-06 | 无任何引用的图片计入未引用，其视频计入可释放 | 正常 |
| BH-07 | SC-DETECT-07 | 引用都不带 live 时只有视频计入未引用 | 正常 |
| BH-08 | SC-DETECT-08 | 任一引用带 live 时视频不算未引用 | 边界 |
| BH-09 | SC-DETECT-09 | 24 小时内上传的记录不参与统计 | 边界 |
| BH-10 | SC-DETECT-10 | 没有未引用资源时显示良好状态 | UI |
| BH-11 | SC-DETECT-11 | 重新检测刷新统计与检测时间 | UI |
| BH-12 | SC-DETECT-12 | 检测中显示加载态 | UI |
| BH-13 | SC-DETECT-13 | 检测失败显示错误并可重试 | 错误 |
| BH-14 | SC-DETECT-14 | 存储页不请求任何图片或视频 | 边界 |
| BH-15 | SC-DETECT-15 | 未登录访问跳转登录页 | 错误 |
| BH-16 | SC-DETECT-16 | 未登录调用检测接口返回 401 | 错误 |

---

## BH-01: 从顶栏进入存储页看到统计

**SC-ID**: SC-DETECT-01

```gherkin
Given 我已登录后台
  And 有 2 张未引用图片（共 3,000,000 B），其中一张带 1,000,000 B 的实况视频
  And 有 1 段未引用实况视频（2,000,000 B），所属图片仍被引用
When 我点后台顶栏的"存储"
Then 进入 /admin/storage
  And 显示"未引用图片 2 张 · 2.9 MB"
  And 显示"未引用实况视频 1 个 · 1.9 MB"
  And "预计可释放"显示 5.7 MB（3,000,000 + 1,000,000 + 2,000,000 B）并高亮
  And 显示检测时间
```

## BH-02: 草稿正文引用的图片不算未引用

**SC-ID**: SC-DETECT-02

```gherkin
Given 草稿 A（从未发布）的 body 含 "![x](/img/2026/10/aaaaaaaaaa_800x600_112233.jpg)"
  And 该图片上传于 2 天前
When 检测
Then 该图片不计入未引用图片
```

## BH-03: 只被已发布版本引用的图片不算未引用

**SC-ID**: SC-DETECT-03

```gherkin
Given 已发布文章 B 的 pub_body 引用图片 P
  And B 的工作稿 body 已删掉 P（有未发布修改）
  And P 上传于 2 天前
When 检测
Then P 不计入未引用图片
```

## BH-04: 封面引用的图片不算未引用

**SC-ID**: SC-DETECT-04

```gherkin
Given 图片 C1 只出现在某文章的 cover
  And 图片 C2 只出现在某已发布文章的 pub_cover
  And 两者都上传于 2 天前
When 检测
Then C1、C2 都不计入未引用图片
```

## BH-05: 非图片语法的引用同样算引用

**SC-ID**: SC-DETECT-05

```gherkin
Given 图片 L1 只以普通链接 "[原图](/img/2026/10/...jpg)" 出现在 body
  And 图片 L2 只以 HTML "<img src=\"/img/2026/10/...webp\">" 出现在 body
  And 图片 L3 只以完整地址 "https://example.com/img/2026/10/...png#wide" 出现在 body
When 检测
Then L1、L2、L3 都不计入未引用图片
```

## BH-06: 无任何引用的图片计入未引用，其视频计入可释放

**SC-ID**: SC-DETECT-06

```gherkin
Given 图片 O 带实况视频，没有出现在任何文章的 body、cover、pub_body、pub_cover 中
  And O 上传于 2 天前
When 检测
Then 未引用图片计数含 O，体积含 O 的 size
  And 未引用实况视频计数不含 O 的视频
  And "预计可释放"含 O 的 size 与 video_size
```

## BH-07: 引用都不带 live 时只有视频计入未引用

**SC-ID**: SC-DETECT-07

```gherkin
Given 带实况视频的图片 V 在两篇文章中被引用，URL 片段分别为无片段和 "#wide"
  And V 上传于 2 天前
When 检测
Then 未引用实况视频计数含 V 的视频，体积为 V 的 video_size
  And 未引用图片计数不含 V
```

## BH-08: 任一引用带 live 时视频不算未引用

**SC-ID**: SC-DETECT-08

```gherkin
Given 带实况视频的图片 V 在文章 A 的 body 中为 "...jpg"（无 live）
  And 在文章 B 的 pub_body 中为 "...jpg#wide,live"
When 检测
Then V 的视频不计入未引用实况视频
```

## BH-09: 24 小时内上传的记录不参与统计

**SC-ID**: SC-DETECT-09

```gherkin
Given 未被引用的图片 N1 上传于 23 小时前
  And 带视频、引用不带 live 的图片 N2 上传于 1 小时前
  And 未被引用的图片 N3 上传于 25 小时前
When 检测
Then N1、N2 都不计入未引用统计
  And N3 计入未引用图片
  And 页面显示"近 24 小时上传的 2 项不参与清理"
```

## BH-10: 没有未引用资源时显示良好状态

**SC-ID**: SC-DETECT-10

```gherkin
Given 所有图片都被引用，且没有未引用实况视频
When 我打开存储页
Then 三项统计均为 0
  And 显示"存储状态良好，无未引用文件"
  And "一键清理未引用资源"按钮禁用
```

## BH-11: 重新检测刷新统计与检测时间

**SC-ID**: SC-DETECT-11

```gherkin
Given 存储页显示未引用图片 1 张
  And 之后另一标签页把该图片插入文章并保存
When 我点"重新检测"
Then 未引用图片变为 0 张
  And 检测时间更新为本次检测时间
```

## BH-12: 检测中显示加载态

**SC-ID**: SC-DETECT-12

```gherkin
Given 检测接口响应较慢
When 我打开存储页或点"重新检测"
Then 统计区显示加载态，"重新检测"与"一键清理"不可点
When 响应返回
Then 显示统计，按钮恢复
```

## BH-13: 检测失败显示错误并可重试

**SC-ID**: SC-DETECT-13

```gherkin
Given 检测接口返回 500 或网络中断
When 页面加载检测
Then 统计区显示"检测失败，请重试"
  And "一键清理"禁用
When 我点"重新检测"且接口恢复
Then 正常显示统计
```

## BH-14: 存储页不请求任何图片或视频

**SC-ID**: SC-DETECT-14

```gherkin
Given 有未引用图片与视频
When 我打开存储页并完成检测
Then 页面没有发出任何 /img/ 请求
```

## BH-15: 未登录访问跳转登录页

**SC-ID**: SC-DETECT-15

```gherkin
Given 我未登录
When 访问 /admin/storage
Then 跳转 /admin/login?next=/admin/storage
```

## BH-16: 未登录调用检测接口返回 401

**SC-ID**: SC-DETECT-16

```gherkin
Given 没有有效会话
When 调用 GET /api/admin/storage/orphans
Then 返回 401，不扫描数据
```
