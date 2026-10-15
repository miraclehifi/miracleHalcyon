# US-01 读者端外壳 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-SHELL-01 | 桌面顶栏导航与当前项高亮 | 正常 |
| BH-02 | SC-SHELL-02 | 主题切换轮换并持久 | 正常 |
| BH-03 | SC-SHELL-03 | 首屏不闪主题 | 边界 |
| BH-04 | SC-SHELL-04 | 跟随系统时随系统变化 | 边界 |
| BH-05 | SC-SHELL-05 | 手机顶栏换成图标 | UI |
| BH-06 | SC-SHELL-06 | 子页底部返回上一级 | 正常 |
| BH-07 | SC-SHELL-07 | 首页不显示返回 | 边界 |
| BH-08 | SC-SHELL-08 | 不存在的路径显示 404 | 错误 |
| BH-09 | SC-SHELL-09 | 读者端无后台入口 | 边界 |

---

## BH-01: 桌面顶栏导航与当前项高亮

**SC-ID**: SC-SHELL-01

```gherkin
Given 我用 1440 宽屏幕访问 /posts/hello
When 我查看顶栏
Then 依次看到站点名（链接 /）、文章、书影音、摄影、GitHub、RSS、主题切换
  And "文章"带 aria-current="page" 并高亮
  And 摄影、GitHub 链接带 target="_blank" 与 rel="noopener noreferrer"
```

## BH-02: 主题切换轮换并持久

**SC-ID**: SC-SHELL-02

```gherkin
Given 我从未切换过主题，系统为亮色
When 我点击主题切换
Then 页面变为暗色，按钮名称为"主题：暗色"
When 我再点击
Then 变为"跟随系统"
When 我刷新页面或进入另一读者页
Then 保持上次选择
```

## BH-03: 首屏不闪主题

**SC-ID**: SC-SHELL-03

```gherkin
Given 我上次选择了暗色，系统为亮色
When 我打开任意读者页
Then 首次绘制即为暗色（html 在样式加载前已带暗色标记）
```

## BH-04: 跟随系统时随系统变化

**SC-ID**: SC-SHELL-04

```gherkin
Given 主题为"跟随系统"
When 系统从亮色切到暗色
Then 页面无需刷新即变为暗色
```

## BH-05: 手机顶栏换成图标

**SC-ID**: SC-SHELL-05

```gherkin
Given 我用 390 宽屏幕访问任意读者页
When 我查看顶栏
Then 文章、书影音显示为带无障碍名称的图标，GitHub、RSS 不显示
  And 每个可点区域不小于 44×44
```

## BH-06: 子页底部返回上一级

**SC-ID**: SC-SHELL-06

```gherkin
Given 我在 /posts/hello
When 我点击底部 "> cd .."
Then 跳转到 /posts
Given 我在 /posts 或 /tags/astro
When 我点击 "> cd .."
Then 跳转到 /
```

## BH-07: 首页不显示返回

**SC-ID**: SC-SHELL-07

```gherkin
Given 我在 /
When 我滚到底部
Then 不显示 "> cd .."
```

## BH-08: 不存在的路径显示 404

**SC-ID**: SC-SHELL-08

```gherkin
Given 路径 /media、/rss.xml、/nope 都没有页面
When 我访问其中任一
Then 返回 HTTP 404 与读者端 404 页（带顶栏与"回首页"链接）
```

## BH-09: 读者端无后台入口

**SC-ID**: SC-SHELL-09

```gherkin
Given 我在任意读者页
When 我查找页面中的链接
Then 没有指向 /admin 的链接
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
