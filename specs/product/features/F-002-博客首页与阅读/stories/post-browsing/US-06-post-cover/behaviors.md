# US-06 文章封面 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-COVER-01 | 上传封面 | 正常 |
| BH-02 | SC-COVER-02 | 拖入图片设置封面 | 正常 |
| BH-03 | SC-COVER-03 | 更换与移除 | 正常 |
| BH-04 | SC-COVER-04 | 上传失败保留原封面 | 错误 |
| BH-05 | SC-COVER-05 | 已发布文章改封面标记未发布修改 | 边界 |
| BH-06 | SC-COVER-06 | 接口返回封面 | 正常 |
| BH-07 | SC-COVER-07 | 动态照片作封面只取静态图 | 边界 |
| BH-08 | SC-COVER-08 | 自动保存校验封面引用 | 错误 |

---

## BH-01: 上传封面

**SC-ID**: SC-COVER-01

```gherkin
Given 我在写文章页打开设置抽屉，文章没有封面
When 我在"封面"区选择一张 jpg
Then 封面区显示"上传中…"，完成后显示缩略图与"更换""移除"按钮
  And 随后自动保存，保存状态变为"已保存"
```

## BH-02: 拖入图片设置封面

**SC-ID**: SC-COVER-02

```gherkin
Given 设置抽屉已打开
When 我把一张 png 拖到封面区
Then 封面区高亮可放置，放下后上传并显示缩略图
```

## BH-03: 更换与移除

**SC-ID**: SC-COVER-03

```gherkin
Given 文章已有封面
When 我点"更换"并选择新图片
Then 显示新封面
When 我点"移除"
Then 封面区恢复空状态，R2 中原文件仍在
```

## BH-04: 上传失败保留原封面

**SC-ID**: SC-COVER-04

```gherkin
Given 文章已有封面 X
When 我选择一个 bmp 文件，或上传返回 500
Then 封面区提示失败原因（"仅支持 png、jpg、webp、gif" / "上传失败，请重试"）
  And 仍显示封面 X
```

## BH-05: 已发布文章改封面标记未发布修改

**SC-ID**: SC-COVER-05

```gherkin
Given 一篇已发布且无未发布修改的文章
When 我更换封面并自动保存
Then 状态显示"有未发布修改"，读者端仍为旧封面
When 我点击"发布更新"
Then 公开接口返回新封面
```

## BH-06: 接口返回封面

**SC-ID**: SC-COVER-06

```gherkin
Given 文章已发布且有封面
When 读取 GET /api/posts/:slug 与 GET /api/admin/posts/:id
Then 都包含 cover：站内图片地址（如 /img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg）；无封面时为 null
```

## BH-07: 动态照片作封面只取静态图

**SC-ID**: SC-COVER-07

```gherkin
Given 我选择一张安卓动态照片作为封面
When 上传完成
Then 只上传静态图，请求不带视频，封面不显示 LIVE
```

## BH-08: 自动保存校验封面引用

**SC-ID**: SC-COVER-08

```gherkin
Given 自动保存请求中 cover 不是本站图片地址格式（如外链 https://evil.example.com/a.jpg）
When 服务端处理
Then 返回 400 VALIDATION_FAILED（字段 cover）
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
