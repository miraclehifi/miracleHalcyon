# US-12 图片排版标记 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-LAYOUT-01 | URL 带 #wide 的图片在预览中显示为宽图 | 正常 |
| BH-02 | SC-LAYOUT-02 | 只含多张图片的段落显示为组图网格 | 正常 |
| BH-03 | SC-LAYOUT-03 | 首张带 #accordion 且 3–7 张时显示为手风琴 | 正常 |
| BH-04 | SC-LAYOUT-04 | 手风琴张数超出 3–7，退回网格 | 边界 |
| BH-05 | SC-LAYOUT-05 | 段落中图片混有文字，不成组 | 边界 |
| BH-06 | SC-LAYOUT-06 | title 显示为图注，alt 只作无障碍文本 | 正常 |
| BH-07 | SC-LAYOUT-07 | 预览单图菜单切换宽图，改写源码并可撤销 | UI |
| BH-08 | SC-LAYOUT-08 | 预览组图菜单切换网格 / 手风琴 / 拆成单图 | UI |
| BH-09 | SC-LAYOUT-09 | 手机上点按图片出现菜单 | UI |
| BH-10 | SC-LAYOUT-10 | 未知标记、外链或无尺寸图片按普通图片显示 | 错误 |
| BH-11 | SC-LAYOUT-11 | 源码中图片被删改后，菜单操作不误改其他内容 | 错误 |
| BH-12 | SC-LAYOUT-12 | 底栏写法帮助展示各写法示例 | UI |
| BH-13 | SC-LAYOUT-13 | 输入时已加载的图片不重复播放加载动画 | UI |
| BH-14 | SC-LAYOUT-14 | 单图菜单取消 / 恢复实况，保留其他标记并可撤销 | UI |
| BH-15 | SC-LAYOUT-15 | 没有实况视频的图片，菜单不显示"实况"项 | 边界 |

---

## BH-01: URL 带 #wide 的图片在预览中显示为宽图

**SC-ID**: SC-LAYOUT-01

```gherkin
Given 源码为 "![山](/img/2026/10/a1b2c3d4e5_1600x900_556677.jpg#wide)"
When 预览渲染
Then 该图片以宽图形态显示（向两侧扩出正文宽度）
  And 图片按 1600:900 预留宽高比
```

## BH-02: 只含多张图片的段落显示为组图网格

**SC-ID**: SC-LAYOUT-02

```gherkin
Given 源码中一个段落为三行，每行一张图片，行间无空行
When 预览渲染
Then 三张图片显示为一个组图网格
```

## BH-03: 首张带 #accordion 且 3–7 张时显示为手风琴

**SC-ID**: SC-LAYOUT-03

```gherkin
Given 一个只含 4 张图片的段落，第一张 URL 带 "#accordion"
When 预览渲染
Then 显示为手风琴组图
```

## BH-04: 手风琴张数超出 3–7，退回网格

**SC-ID**: SC-LAYOUT-04

```gherkin
Given 一个只含 2 张图片的段落，第一张 URL 带 "#accordion"
When 预览渲染
Then 显示为组图网格
```

8 张同理退回网格；网格超过 9 张时按 9 张一组折行继续排列。

## BH-05: 段落中图片混有文字，不成组

**SC-ID**: SC-LAYOUT-05

```gherkin
Given 一个段落为 "见下图" 加两张图片（无空行）
When 预览渲染
Then 两张图片各自按单图显示，不组成组图
```

## BH-06: title 显示为图注，alt 只作无障碍文本

**SC-ID**: SC-LAYOUT-06

```gherkin
Given 源码为 '![一只猫](/img/…jpg "窗台上的猫")'
When 预览渲染
Then 图片下方居中显示 "窗台上的猫"
  And 图片的 alt 为 "一只猫"
Given 没有写 title
Then 不显示图注
```

## BH-07: 预览单图菜单切换宽图，改写源码并可撤销

**SC-ID**: SC-LAYOUT-07

```gherkin
Given 源码第 5 行为 "![山](/img/…_1600x900_556677.jpg)"
When 我在桌面把鼠标移到预览中的这张图片上
Then 图片右上角出现图片菜单
When 我点击"宽图"
Then 第 5 行变为 "![山](/img/…_1600x900_556677.jpg#wide)"
  And 预览显示为宽图，菜单中"宽图"为按下态
When 我在源码区按 ⌘Z / Ctrl+Z
Then 第 5 行恢复原样
```

已有其他标记时合并（`#live` → `#live,wide`），关闭宽图时只去掉 `wide`。

## BH-08: 预览组图菜单切换网格 / 手风琴 / 拆成单图

**SC-ID**: SC-LAYOUT-08

```gherkin
Given 源码有一个 4 张图片的组图段落，显示为网格
When 我在组图菜单中选"手风琴"
Then 第一张图片 URL 加上 "#accordion"，预览变为手风琴
When 我选"网格"
Then "#accordion" 被去掉
When 我选"拆成单图"
Then 4 张图片之间各插入一个空行，预览变为 4 张单图
```

组图少于 3 张或多于 7 张时，菜单中"手风琴"不可用（`aria-disabled`，提示"手风琴需要 3–7 张图片"）。

## BH-09: 手机上点按图片出现菜单

**SC-ID**: SC-LAYOUT-09

```gherkin
Given 我在手机的"预览"Tab
When 我点按一张图片
Then 出现图片菜单（可点区域 ≥ 44×44）
When 我点按菜单外的区域
Then 菜单关闭
```

## BH-10: 未知标记、外链或无尺寸图片按普通图片显示

**SC-ID**: SC-LAYOUT-10

```gherkin
Given 源码含 "![a](https://example.com/a.png#foo)" 和 "![b](/img/2026/10/bad-name.jpg)"
When 预览渲染
Then 两张图片都按普通图片显示，不预留宽高比
  And 不出现报错，其余正文正常渲染
```

## BH-11: 源码中图片被删改后，菜单操作不误改其他内容

**SC-ID**: SC-LAYOUT-11

```gherkin
Given 预览中的图片菜单已打开
  And 我随后在源码区删除了这张图片所在的行
When 预览更新
Then 图片菜单关闭
  And 源码不被改写
```

菜单操作按图片的源码位置与 URL 双重定位，定位不到时不改写。

## BH-12: 底栏写法帮助展示各写法示例

**SC-ID**: SC-LAYOUT-12

```gherkin
Given 我在写文章页
When 我点击编辑区底栏的"图片写法"
Then 弹出说明，列出宽图、实况照片、图注、组图网格、手风琴的写法示例
When 我按 Esc 或点击外部
Then 说明关闭，焦点回到触发按钮
```

## BH-13: 输入时已加载的图片不重复播放加载动画

**SC-ID**: SC-LAYOUT-13

```gherkin
Given 预览中有一张已加载完成的图片
When 我在源码区其他位置继续输入，预览重新渲染
Then 该图片保持已加载状态，不重新出现马赛克渐显
```

## BH-14: 单图菜单取消 / 恢复实况，保留其他标记并可撤销

**SC-ID**: SC-LAYOUT-14

```gherkin
Given 源码第 5 行为 "![海](/img/…_1600x1200_334455.jpg#wide,live)"
  And R2 中存在该图的 ".live.mp4"
When 我把鼠标移到预览中的这张图片上
Then 图片菜单中有 "宽图"（按下态）和 "实况"（勾选态）两项
When 我取消勾选 "实况"
Then 第 5 行变为 "![海](/img/…_1600x1200_334455.jpg#wide)"
  And 预览中该图不再显示 "LIVE" 标记，仍为宽图
When 我再次勾选 "实况"
Then 第 5 行变回带 "#wide,live" 的写法
When 我在源码区按 ⌘Z / Ctrl+Z
Then 第 5 行回到上一步的写法
```

## BH-15: 没有实况视频的图片，菜单不显示"实况"项

**SC-ID**: SC-LAYOUT-15

```gherkin
Given 源码中有普通图片 "![山](/img/…_1600x900_556677.jpg)"，R2 中没有对应的 ".live.mp4"
  And 另一张图片 "![湖](/img/…jpg#live)" 的视频已被清理
When 我分别打开这两张图片的菜单
Then 两个菜单都只有 "宽图"，没有 "实况"
  And 同一张图第二次打开菜单时不再发起视频检查请求（本次会话内缓存）
```

