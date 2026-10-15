# US-10 文章图片展示与灯箱 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-LIGHTBOX-01 | 读者页图片与预览一致 | 正常 |
| BH-02 | SC-LIGHTBOX-02 | 点击图片打开灯箱 | 正常 |
| BH-03 | SC-LIGHTBOX-03 | 网格与手风琴中的图片 | 正常 |
| BH-04 | SC-LIGHTBOX-04 | 切换图片 | 正常 |
| BH-05 | SC-LIGHTBOX-05 | 首尾不可再切 | 边界 |
| BH-06 | SC-LIGHTBOX-06 | 关闭灯箱焦点回原图 | UI |
| BH-07 | SC-LIGHTBOX-07 | 灯箱内实况照片播放 | 正常 |
| BH-08 | SC-LIGHTBOX-08 | 灯箱焦点循环与减弱动效 | UI |
| BH-09 | SC-LIGHTBOX-09 | 图片加载失败 | 错误 |
| BH-10 | SC-LIGHTBOX-10 | 只有一张图片 | 边界 |

---

## BH-01: 读者页图片与预览一致

**SC-ID**: SC-LIGHTBOX-01

```gherkin
Given 文章含单图（带 title）、宽图、3 张网格组图、实况照片
When 我访问文章详情
Then 单图显示图注，宽图扩出纸张内边距，组图为网格，实况照片带 LIVE 标记
  And 每张图片在加载前已按宽高比占位（CLS < 0.1）
```

## BH-02: 点击图片打开灯箱

**SC-ID**: SC-LIGHTBOX-02

```gherkin
Given 文章共 12 张图片
When 我点击第 3 张
Then 打开名为"图片查看"的模态灯箱，显示第 3 张、计数"3 / 12"与其图注
  And 背景页面不滚动
```

## BH-03: 网格与手风琴中的图片

**SC-ID**: SC-LIGHTBOX-03

```gherkin
Given 文章含网格组图与手风琴组图
When 我点击网格中的第 2 张
Then 灯箱显示该图
When 我点击手风琴中未展开的一张
Then 只展开该张，不打开灯箱
When 我再点击已展开的这张
Then 打开灯箱显示该图
```

## BH-04: 切换图片

**SC-ID**: SC-LIGHTBOX-04

```gherkin
Given 灯箱显示 "3 / 12"
When 我按 → 或点"下一张"
Then 显示 "4 / 12"
When 我在手机上向右滑
Then 回到 "3 / 12"
```

## BH-05: 首尾不可再切

**SC-ID**: SC-LIGHTBOX-05

```gherkin
Given 灯箱显示 "1 / 12"
When 我查看按钮
Then "上一张"不可用，按 ← 无变化
Given 灯箱显示 "12 / 12"
Then "下一张"不可用
```

## BH-06: 关闭灯箱焦点回原图

**SC-ID**: SC-LIGHTBOX-06

```gherkin
Given 我用键盘在第 3 张图片上按 Enter 打开灯箱
When 我按 Esc，或点关闭按钮，或点遮罩，或在手机上下滑超过阈值
Then 灯箱关闭，焦点回到第 3 张图片，背景恢复滚动
```

## BH-07: 灯箱内实况照片播放

**SC-ID**: SC-LIGHTBOX-07

```gherkin
Given 灯箱当前为实况照片
When 我悬停 0.3 秒或长按
Then 播放视频（静音、一次），移出或松开回到静态图
```

## BH-08: 灯箱焦点循环与减弱动效

**SC-ID**: SC-LIGHTBOX-08

```gherkin
Given 灯箱已打开
When 我连续按 Tab
Then 焦点只在灯箱内的控件间循环
Given 系统开启减弱动效
When 我切换图片
Then 没有层叠位移动画，直接切换
```

## BH-09: 图片加载失败

**SC-ID**: SC-LIGHTBOX-09

```gherkin
Given 第 5 张图片地址返回 404
When 我在灯箱中切到第 5 张
Then 显示"图片加载失败"与"重试"，其他图片可继续切换
```

## BH-10: 只有一张图片

**SC-ID**: SC-LIGHTBOX-10

```gherkin
Given 文章只有 1 张图片
When 我打开灯箱
Then 计数为 "1 / 1"，不显示左右切换按钮
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
