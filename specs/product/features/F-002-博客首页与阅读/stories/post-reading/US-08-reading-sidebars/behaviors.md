# US-08 三栏：同标签文章、阅读进度与目录 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-SIDEBAR-01 | 宽屏三栏 | 正常 |
| BH-02 | SC-SIDEBAR-02 | 同标签文章排序与上限 | 边界 |
| BH-03 | SC-SIDEBAR-03 | 没有同标签文章时不显示左栏 | 边界 |
| BH-04 | SC-SIDEBAR-04 | 阅读进度 | 正常 |
| BH-05 | SC-SIDEBAR-05 | 目录高亮与跳转 | 正常 |
| BH-06 | SC-SIDEBAR-06 | 减弱动效时直接跳转 | UI |
| BH-07 | SC-SIDEBAR-07 | 窄屏收起侧栏 | UI |
| BH-08 | SC-SIDEBAR-08 | 没有标题时不显示目录 | 边界 |
| BH-09 | SC-SIDEBAR-09 | 目录键盘可用 | UI |

---

## BH-01: 宽屏三栏

**SC-ID**: SC-SIDEBAR-01

```gherkin
Given 屏幕宽 1440，文章含 3 个 h2、2 个 h3，存在同标签文章
When 我打开文章详情
Then 左栏显示"同标签文章"，中间正文，右栏显示进度"0%"与 5 项目录（h3 缩进）
```

## BH-02: 同标签文章排序与上限

**SC-ID**: SC-SIDEBAR-02

```gherkin
Given 本文标签 A、B；文章 X 带 A、B，Y 带 A（更新），共 10 篇与本文共享标签
When 我查看左栏
Then X 排在 Y 前，最多显示 8 篇，不含本文
```

## BH-03: 没有同标签文章时不显示左栏

**SC-ID**: SC-SIDEBAR-03

```gherkin
Given 本文没有标签，或没有其他文章共享标签
When 我打开文章详情
Then 不显示左栏，也不显示文末的同标签区块
```

## BH-04: 阅读进度

**SC-ID**: SC-SIDEBAR-04

```gherkin
Given 我在文章详情顶部
When 我滚动到正文一半
Then 进度约为 50%
When 我滚动到正文末尾
Then 进度为 100%
```

## BH-05: 目录高亮与跳转

**SC-ID**: SC-SIDEBAR-05

```gherkin
Given 我在文章详情
When 我滚动到第二个 h2 所在区域
Then 目录中该项高亮（aria-current="true"）
When 我点击目录中第三个 h2
Then 页面滚动到该标题，地址变为 #该标题锚点
```

## BH-06: 减弱动效时直接跳转

**SC-ID**: SC-SIDEBAR-06

```gherkin
Given 系统开启减弱动效
When 我点击目录项
Then 页面直接跳到目标位置，不平滑滚动
```

## BH-07: 窄屏收起侧栏

**SC-ID**: SC-SIDEBAR-07

```gherkin
Given 屏幕宽 390
When 我打开文章详情
Then 不显示左右栏，顶部有进度细条
  And 右下角有"目录"按钮（≥ 44×44）
When 我点"目录"
Then 打开目录抽屉，焦点移入
When 我点击某个目录项
Then 抽屉关闭并跳到该标题
  And 同标签文章显示在文末
```

## BH-08: 没有标题时不显示目录

**SC-ID**: SC-SIDEBAR-08

```gherkin
Given 正文没有 h2 / h3
When 我打开文章详情
Then 不显示目录与"目录"按钮，进度照常显示
```

## BH-09: 目录键盘可用

**SC-ID**: SC-SIDEBAR-09

```gherkin
Given 窄屏目录抽屉已打开
When 我按 Esc
Then 抽屉关闭，焦点回到"目录"按钮
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
