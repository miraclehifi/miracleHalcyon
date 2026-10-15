# US-09 上一篇 / 下一篇 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-PREVNEXT-01 | 文末显示相邻文章 | 正常 |
| BH-02 | SC-PREVNEXT-02 | 最早一篇只有下一篇 | 边界 |
| BH-03 | SC-PREVNEXT-03 | 最新一篇只有上一篇 | 边界 |
| BH-04 | SC-PREVNEXT-04 | 只有一篇文章 | 边界 |
| BH-05 | SC-PREVNEXT-05 | 草稿不参与相邻计算 | 错误 |

---

## BH-01: 文末显示相邻文章

**SC-ID**: SC-PREVNEXT-01

```gherkin
Given 已发布文章 A（10-01）、B（10-05）、C（10-10）
When 我读 B 到文末
Then "上一篇"为 A、"下一篇"为 C，各显示标题与日期，点击进入对应文章
```

## BH-02: 最早一篇只有下一篇

**SC-ID**: SC-PREVNEXT-02

```gherkin
Given 同上
When 我读 A 到文末
Then 只显示"下一篇" B
```

## BH-03: 最新一篇只有上一篇

**SC-ID**: SC-PREVNEXT-03

```gherkin
Given 同上
When 我读 C 到文末
Then 只显示"上一篇" B
```

## BH-04: 只有一篇文章

**SC-ID**: SC-PREVNEXT-04

```gherkin
Given 只有一篇已发布文章
When 我读到文末
Then 不显示上一篇 / 下一篇区块
```

## BH-05: 草稿不参与相邻计算

**SC-ID**: SC-PREVNEXT-05

```gherkin
Given A（10-01）已发布、D（10-03）为草稿或已撤回、B（10-05）已发布
When 我读 B 到文末
Then "上一篇"为 A
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
