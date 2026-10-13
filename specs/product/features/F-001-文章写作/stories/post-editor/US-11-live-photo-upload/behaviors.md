# US-11 手机照片与实况照片上传 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-LIVE-01 | 拖入同名 HEIC + MOV，插入一条实况照片引用 | 正常 |
| BH-02 | SC-LIVE-02 | 拖入单张 HEIC，转为 JPEG 后作为普通图片插入 | 正常 |
| BH-03 | SC-LIVE-03 | 拖入安卓动态照片，识别为实况照片 | 正常 |
| BH-04 | SC-LIVE-04 | 一批文件中混有实况照片与普通图片，各自按顺序插入 | 边界 |
| BH-05 | SC-LIVE-05 | 处理中与上传中的占位文本依次切换 | UI |
| BH-06 | SC-LIVE-06 | 视频处理后超过 10MB，退回为普通图片插入 | 边界 |
| BH-07 | SC-LIVE-07 | 只拖入视频，没有同名照片，不上传 | 错误 |
| BH-08 | SC-LIVE-08 | 实况照片任一文件上传失败，两者都不保留 | 错误 |
| BH-09 | SC-LIVE-09 | 浏览器不支持 H.264 转码，保留原编码并提示 | 边界 |
| BH-10 | SC-LIVE-10 | 预览中桌面悬停 / 手机长按播放实况照片 | UI |
| BH-11 | SC-LIVE-11 | 预览中视频播放失败，退回静态图并隐藏 LIVE 标记 | 错误 |
| BH-12 | SC-LIVE-12 | 通过"插入图片"多选同名图片与视频，同样配对 | 正常 |
| BH-13 | SC-LIVE-13 | HEIC 无法解码，提示并不上传 | 错误 |

---

## BH-01: 拖入同名 HEIC + MOV，插入一条实况照片引用

**SC-ID**: SC-LIVE-01

```gherkin
Given 我在写文章页，源码区光标在第 3 行行尾
When 我同时拖入 "IMG_1234.HEIC" 和 "IMG_1234.MOV"
Then 光标处只出现一条占位文本
  And 上传完成后占位被替换为 "![IMG_1234](/img/{yyyy}/{mm}/{id}_{w}x{h}_{rgb}.jpg#live)"
  And R2 中有该 jpg 与同名 ".live.mp4" 两个文件
  And 预览区该图片左上角显示 "LIVE" 标记
```

## BH-02: 拖入单张 HEIC，转为 JPEG 后作为普通图片插入

**SC-ID**: SC-LIVE-02

```gherkin
Given 我使用不支持显示 HEIC 的浏览器（如 Chrome）
When 我拖入 "IMG_5678.HEIC"
Then 上传到服务端的文件是 JPEG
  And 源码插入 "![IMG_5678](…_{w}x{h}_{rgb}.jpg)"，URL 不带 "#live"
  And 预览区正常显示图片
```

## BH-03: 拖入安卓动态照片，识别为实况照片

**SC-ID**: SC-LIVE-03

```gherkin
Given "PXL_0001.MP.jpg" 是 JPEG 内嵌 mp4 的动态照片（XMP 标注 MotionPhoto）
When 我拖入该文件
Then 内嵌视频被切出并作为配对视频上传
  And 源码插入的引用 URL 带 "#live"
```

## BH-04: 一批文件中混有实况照片与普通图片，各自按顺序插入

**SC-ID**: SC-LIVE-04

```gherkin
Given 我选中了 "a.png"、"IMG_1.HEIC"、"IMG_1.MOV"、"b.jpg" 四个文件
When 我一次拖入
Then 源码按 a、IMG_1、b 的顺序插入三条引用
  And 只有 IMG_1 的引用带 "#live"
```

## BH-05: 处理中与上传中的占位文本依次切换

**SC-ID**: SC-LIVE-05

```gherkin
Given 本次是首次处理 HEIC，处理组件尚未加载
When 我拖入 "IMG_1234.HEIC" 和 "IMG_1234.MOV"
Then 占位文本先显示 "处理中…"
  And 开始上传后变为 "上传中…"
  And 预览区对应位置显示占位块"图片上传中… IMG_1234"
```

## BH-06: 视频处理后超过 10MB，退回为普通图片插入

**SC-ID**: SC-LIVE-06

```gherkin
Given "IMG_2000.MOV" 处理后大小为 12MB
When 我拖入 "IMG_2000.HEIC" 和 "IMG_2000.MOV"
Then 只上传静态图
  And 源码插入的引用不带 "#live"
  And 显示提示 "实况视频超过 10MB，已作为普通图片插入"
```

## BH-07: 只拖入视频，没有同名照片，不上传

**SC-ID**: SC-LIVE-07

```gherkin
Given 源码区有内容 "正文"
When 我只拖入 "clip.mov"
Then 不发起上传请求
  And 源码保持 "正文"
  And 显示常驻错误提示 "视频需要与同名照片一起拖入"
```

## BH-08: 实况照片任一文件上传失败，两者都不保留

**SC-ID**: SC-LIVE-08

```gherkin
Given 上传接口对本次请求返回失败（或网络中断）
When 我拖入 "IMG_3000.HEIC" 和 "IMG_3000.MOV"
Then 占位文本被移除，源码其他内容不变
  And R2 中不存在这次的图片或视频
  And 显示常驻错误提示 "上传失败，请重试"（带文件名 IMG_3000）
```

## BH-09: 浏览器不支持 H.264 转码，保留原编码并提示

**SC-ID**: SC-LIVE-09

```gherkin
Given 当前浏览器的 VideoEncoder 不支持 avc1
  And "IMG_4000.MOV" 是 HEVC 编码
When 我拖入 "IMG_4000.HEIC" 和 "IMG_4000.MOV"
Then 视频以 HEVC 编码封装为 mp4 后上传
  And 引用带 "#live"
  And 显示提示 "该实况视频在部分浏览器中只显示静态图"
```

## BH-10: 预览中桌面悬停 / 手机长按播放实况照片

**SC-ID**: SC-LIVE-10

```gherkin
Given 预览区有一张实况照片，显示静态图与 "LIVE" 标记
When 我在桌面把鼠标移到图片上
Then 视频静音播放一次，"LIVE" 标记变为播放中样式
When 我移出图片
Then 回到静态图
```

手机：长按图片播放，松手回到静态图；长按不触发系统图片菜单。

## BH-11: 预览中视频播放失败，退回静态图并隐藏 LIVE 标记

**SC-ID**: SC-LIVE-11

```gherkin
Given 预览区有一张实况照片，其视频在当前浏览器无法解码
When 视频加载出错（或 canPlayType 判定不支持）
Then 图片只显示静态图
  And 不显示 "LIVE" 标记，悬停不再尝试播放
```

## BH-12: 通过"插入图片"多选同名图片与视频，同样配对

**SC-ID**: SC-LIVE-12

```gherkin
Given 我点击工具栏"插入图片"
When 我在文件选择器中同时选中 "IMG_5000.HEIC" 和 "IMG_5000.MOV"
Then 结果与拖入相同：只插入一条带 "#live" 的引用
```

## BH-13: HEIC 无法解码，提示并不上传

**SC-ID**: SC-LIVE-13

```gherkin
Given "broken.heic" 文件损坏
When 我拖入该文件
Then 占位文本被移除
  And 显示常驻错误提示 "无法读取 broken.heic，请换一张图片"
  And 不发起上传请求
```
