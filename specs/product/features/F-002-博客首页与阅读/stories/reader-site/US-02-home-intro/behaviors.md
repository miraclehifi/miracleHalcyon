# US-02 首页自我介绍 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-HOME-01 | 首页显示自我介绍 | 正常 |
| BH-02 | SC-HOME-02 | 社交链接与邮箱的打开方式 | UI |
| BH-03 | SC-HOME-03 | 空配置项不显示 | 边界 |
| BH-04 | SC-HOME-04 | 配置非法时构建失败 | 错误 |

---

## BH-01: 首页显示自我介绍

**SC-ID**: SC-HOME-01

```gherkin
Given site.ts 配置了头像、名字、3 段简介、GitHub 与邮箱
When 我访问 /
Then 看到头像（有 alt）、名字、3 段简介、社交链接与邮箱
  And 页面不列出文章
```

## BH-02: 社交链接与邮箱的打开方式

**SC-ID**: SC-HOME-02

```gherkin
Given 首页有 GitHub 链接与邮箱 me@example.com
When 我查看链接属性
Then GitHub 链接 target="_blank"、rel="noopener noreferrer"
  And 邮箱链接为 mailto:me@example.com
```

## BH-03: 空配置项不显示

**SC-ID**: SC-HOME-03

```gherkin
Given site.ts 中摄影站地址为空
When 我访问 /
Then 首页与顶栏都不显示摄影链接，也没有 href 为空的链接
```

## BH-04: 配置非法时构建失败

**SC-ID**: SC-HOME-04

```gherkin
Given site.ts 中某个链接不是 http(s) 地址，或邮箱格式错误
When 执行构建
Then 构建失败并指出出错的配置项
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
