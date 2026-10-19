# US-05 图片上传 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-IMAGE-01 | 粘贴图片上传并插入引用 | 正常 |
| BH-02 | SC-IMAGE-02 | 拖入图片上传并插入引用 | 正常 |
| BH-03 | SC-IMAGE-03 | 工具栏选择图片上传 | 正常 |
| BH-04 | SC-IMAGE-04 | 多张图片按顺序插入 | 边界 |
| BH-05 | SC-IMAGE-05 | 超过 50MB 被拒绝 | 边界 |
| BH-06 | SC-IMAGE-06 | 不支持的格式被拒绝 | 错误 |
| BH-07 | SC-IMAGE-07 | 上传失败，卡片变为红框并显示原因 | 错误 |
| BH-08 | SC-IMAGE-08 | 服务端校验文件真实类型 | 错误 |
| BH-09 | SC-IMAGE-09 | 上传期间继续编辑不受影响 | UI |
| BH-10 | SC-IMAGE-10 | 失败卡片点"重试"重新上传成功 | 正常 |
| BH-11 | SC-IMAGE-11 | 失败卡片点"移除"删掉占位 | UI |
| BH-12 | SC-IMAGE-12 | 多张同时上传，卡片进度各自独立 | UI |
| BH-13 | SC-IMAGE-13 | 大 JPEG 压缩为长边 2560px 的 WebP | 正常 |
| BH-14 | SC-IMAGE-14 | 浏览器不支持导出 WebP 时压缩为 JPEG | 边界 |
| BH-15 | SC-IMAGE-15 | PNG 截图只缩尺寸、仍为 PNG | 边界 |
| BH-16 | SC-IMAGE-16 | GIF 与小图原样上传 | 边界 |
| BH-17 | SC-IMAGE-17 | 压缩不划算或出错时退回原图 | 错误 |
| BH-18 | SC-IMAGE-18 | 压缩按 EXIF 方向转正并去掉 EXIF / GPS | 正常 |
| BH-19 | SC-IMAGE-19 | 刷新后残留的占位显示"上传已中断"，只能移除 | 边界 |
| BH-20 | SC-IMAGE-20 | 读者页不显示上传占位 | 错误 |

---

## BH-01: 粘贴图片上传并插入引用

**SC-ID**: SC-IMAGE-01

```gherkin
Given 我在正文编辑区，剪贴板中有一张 200KB 的 png 截图
When 我按 Ctrl/Cmd+V
Then 光标处插入占位 "![处理中…]()"
  And 预览区对应位置立即出现该截图的缩略图卡片（半透明、微模糊），显示阶段文案与进度条
  And 进度依次经过 "正在压缩…" 与 "正在上传… N%"，N 随已上传字节增长到 100
  And 上传成功后卡片淡出，占位替换为 "![image](/img/{yyyy}/{mm}/{id}_{w}x{h}_{rgb}.png)"
  And 预览区显示正式图片
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

## BH-05: 超过 50MB 被拒绝

**SC-ID**: SC-IMAGE-05

```gherkin
Given 我有一张 60MB 的 jpg
When 我粘贴或拖入它
Then 显示提示"图片不能超过 50MB"
  And 不发起上传，正文不插入任何内容，预览区不出现卡片
```

## BH-06: 不支持的格式被拒绝

**SC-ID**: SC-IMAGE-06

```gherkin
Given 我有 logo.svg
When 我拖入它
Then 显示提示"仅支持 png、jpg、webp、gif"
  And 不发起上传，预览区不出现卡片
```

## BH-07: 上传失败，卡片变为红框并显示原因

**SC-ID**: SC-IMAGE-07

```gherkin
Given 网络中断
When 我粘贴一张图片 "shot.png"
Then 源码中的占位变为 "![上传失败]()"，位置不变
  And 预览区该卡片变为红框，显示 "网络中断"，并提供 "重试" 和 "移除"
  And 不弹出 "上传失败，请重试" 的 Toast
  And 正文其他内容不变
When 服务端返回 5xx
Then 卡片显示 "上传失败，请重试"
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

## BH-10: 失败卡片点"重试"重新上传成功

**SC-ID**: SC-IMAGE-10

```gherkin
Given "shot.png" 因网络中断上传失败，预览区显示红框卡片
  And 网络已恢复
When 我点击卡片上的 "重试"
Then 卡片回到进度状态，从 "正在压缩…" 重新开始
  And 源码中的占位变回 "![处理中…]()"，再到 "![上传中…]()"
  And 上传成功后占位替换为 "![shot](/img/…png)"，位置不变
```

## BH-11: 失败卡片点"移除"删掉占位

**SC-ID**: SC-IMAGE-11

```gherkin
Given "shot.png" 上传失败，源码第 4 行为 "![上传失败]()"
When 我点击卡片上的 "移除"
Then 源码中该占位被删除，其他内容不变
  And 预览区该卡片消失
  And 我在源码区按 ⌘Z / Ctrl+Z 可以恢复该占位文本
```

## BH-12: 多张同时上传，卡片进度各自独立

**SC-ID**: SC-IMAGE-12

```gherkin
Given 我同时拖入 a.jpg（8MB）、b.png（100KB）、c.png（100KB）
When 上传进行中
Then 预览区按 a、b、c 顺序出现三张卡片，各自显示自己的缩略图、阶段与进度
  And 同一时刻最多两张处于上传中，第三张显示 "等待中…"
  And b 先完成时只有 b 的卡片换成正式图片，a 的进度继续
  And 其中一张失败时只有该卡片变为红框，其余照常完成
```

## BH-13: 大 JPEG 压缩为长边 2560px 的 WebP

**SC-ID**: SC-IMAGE-13

```gherkin
Given 测试夹具 "large-photo.jpg"：4000×3000、大于 5MB
  And 当前浏览器支持 canvas 导出 WebP
When 我拖入该文件
Then 上传请求中的图片为 2560×1920 的 WebP，体积 < 1.5MB
  And 插入的引用为 "![large-photo](/img/{yyyy}/{mm}/{id}_2560x1920_{rgb}.webp)"
  And 引用中的主色由压缩后的图片计算
  And R2 中存储的是这份 WebP，而非原图
```

## BH-14: 浏览器不支持导出 WebP 时压缩为 JPEG

**SC-ID**: SC-IMAGE-14

```gherkin
Given 当前浏览器的 canvas.toBlob("image/webp") 实际返回 "image/png" 类型的 Blob
When 我拖入 "large-photo.jpg"
Then 图片被压缩为 2560×1920 的 JPEG（质量 0.85）后上传
  And 插入的引用以 ".jpg" 结尾
```

## BH-15: PNG 截图只缩尺寸、仍为 PNG

**SC-ID**: SC-IMAGE-15

```gherkin
Given "wide-screenshot.png" 为 3840×2160 的 PNG（带透明通道）
When 我拖入该文件
Then 上传的图片为 2560×1440 的 PNG，透明通道保留
  And 插入的引用以 ".png" 结尾，尺寸段为 "2560x1440"
When 我拖入 3000×1000 的 PNG，缩小后的 PNG 反而比原图大
Then 上传原图，引用尺寸段为 "3000x1000"
```

## BH-16: GIF 与小图原样上传

**SC-ID**: SC-IMAGE-16

```gherkin
Given "anim.gif" 为 3000×2000、多帧动画的 GIF
  And "small.jpg" 为 1200×800、300KB
When 我分别拖入这两个文件
Then 两者都以原始字节上传，不经过 canvas
  And anim.gif 在预览中仍为完整动画，引用尺寸段为 "3000x2000"
  And small.jpg 的引用以 ".jpg" 结尾、尺寸段为 "1200x800"
```

小图的判定：长边 ≤ 2560px 且体积 < 500KB；两条只满足一条的仍按规则压缩。

## BH-17: 压缩不划算或出错时退回原图

**SC-ID**: SC-IMAGE-17

```gherkin
Given "noisy.webp" 为 2400×1600、600KB，重新编码后不比原图小
When 我拖入该文件
Then 上传原图
Given 浏览器无法解码 "broken.jpg"（或 canvas 分配失败）
When 我拖入该文件
Then 跳过压缩，上传原图，卡片照常进入 "正在上传…"
  And 不弹出错误提示
```

## BH-18: 压缩按 EXIF 方向转正并去掉 EXIF / GPS

**SC-ID**: SC-IMAGE-18

```gherkin
Given "portrait.jpg" 存储为 4000×3000、EXIF Orientation = 6（顺时针 90°），且含 GPS 信息
When 我拖入该文件
Then 上传的图片为 1920×2560 的竖图，画面方向正确
  And 上传的图片中不含 EXIF 与 GPS 数据
  And 引用尺寸段为 "1920x2560"
```

## BH-19: 刷新后残留的占位显示"上传已中断"，只能移除

**SC-ID**: SC-IMAGE-19

```gherkin
Given 一张图片上传失败后自动保存已把 "![上传失败]()" 存进正文
  And 我刷新了写文章页
When 预览渲染该占位
Then 卡片显示 "上传已中断"，没有缩略图和进度，只有 "移除"
When 我点击 "移除"
Then 源码中该占位被删除
```

源码中残留的 "![处理中…]()" / "![上传中…]()"（上传中途刷新）同样显示为 "上传已中断"。

## BH-20: 读者页不显示上传占位

**SC-ID**: SC-IMAGE-20

```gherkin
Given 已发布文章的正文为 "段落A\n![上传失败]()\n![上传中…]()\n段落B"
When 读者打开该文章页
Then 页面只显示 "段落A" 和 "段落B"
  And 不出现 "图片上传中…"、"上传失败"、"上传已中断" 或任何占位块
```
