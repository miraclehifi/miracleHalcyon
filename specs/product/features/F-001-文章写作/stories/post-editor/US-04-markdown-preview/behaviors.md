# US-04 Markdown 实时预览 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-PREVIEW-01 | 输入 GFM 语法后预览更新 | 正常 |
| BH-02 | SC-PREVIEW-02 | 代码块按语言语法高亮 | 正常 |
| BH-03 | SC-PREVIEW-03 | 危险 HTML 被过滤不执行 | 错误 |
| BH-04 | SC-PREVIEW-04 | 万字文章预览更新 < 300ms | 边界 |
| BH-05 | SC-PREVIEW-05 | 空正文显示预览占位 | 边界 |
| BH-09 | SC-PREVIEW-09 | 渲染失败时保留上次预览并提示，继续输入后恢复 | 错误 |
| BH-06 | SC-PREVIEW-06 | 宽屏并排，可切换仅编辑/仅预览 | UI |
| BH-07 | SC-PREVIEW-07 | 窄屏以 Tab 切换编辑与预览 | UI |
| BH-08 | SC-PREVIEW-08 | 编辑区滚动时预览同步滚动 | UI |

---

## BH-01: 输入 GFM 语法后预览更新

**SC-ID**: SC-PREVIEW-01

```gherkin
Given 我在写文章页
When 我输入包含 "# 标题"、"- [ ] 任务"、表格、"> 引用"、链接的 Markdown
Then 预览区分别渲染为 h1、复选框列表、表格、引用块、可点击链接
```

## BH-02: 代码块按语言语法高亮

**SC-ID**: SC-PREVIEW-02

```gherkin
Given 我在写文章页
When 我输入一个 ```ts 代码块
Then 预览区代码块带 TypeScript 语法高亮
  And 高亮主题与读者端一致，随亮/暗色模式切换
```

## BH-03: 危险 HTML 被过滤不执行

**SC-ID**: SC-PREVIEW-03

```gherkin
Given 我在写文章页
When 我输入 <script>alert(1)</script> 和 <img src=x onerror=alert(1)>
Then 预览区不执行任何脚本
  And script 标签与 onerror 属性被移除
```

## BH-04: 万字文章预览更新 < 300ms

**SC-ID**: SC-PREVIEW-04

```gherkin
Given 正文已有约 10000 字，含 20 个代码块
When 我在末尾输入一个字符
Then 预览区在 300ms 内更新
  And 输入过程不卡顿
```

## BH-05: 空正文显示预览占位

**SC-ID**: SC-PREVIEW-05

```gherkin
Given 正文为空
When 我查看预览区
Then 显示占位文字"在左侧开始写作，这里会显示预览"
```

## BH-09: 渲染失败时保留上次预览并提示，继续输入后恢复

**SC-ID**: SC-PREVIEW-09

```gherkin
Given 预览区已显示上一次的渲染结果
When 后台渲染出错
Then 预览区保留上一次的渲染结果
  And 显示错误提示"预览渲染失败，继续编辑会自动重试"
When 我继续输入且渲染成功
Then 提示消失，预览显示最新内容
```

## BH-06: 宽屏并排，可切换仅编辑/仅预览

**SC-ID**: SC-PREVIEW-06

```gherkin
Given 视口宽度 ≥ 768px
When 我打开写文章页
Then 编辑区与预览区左右并排
When 我点击视图切换"仅编辑"
Then 预览区隐藏，编辑区占满宽度
```

## BH-07: 窄屏以 Tab 切换编辑与预览

**SC-ID**: SC-PREVIEW-07

```gherkin
Given 视口宽度 < 768px
When 我打开写文章页
Then 默认显示"编辑" Tab
When 我点击"预览" Tab
Then 显示渲染结果
```

## BH-08: 编辑区滚动时预览同步滚动

**SC-ID**: SC-PREVIEW-08

```gherkin
Given 正文长于一屏且处于并排视图
When 我把编辑区滚动到第 3 个二级标题处
Then 预览区滚动到对应的第 3 个二级标题附近
```
