# US-03 构建时预渲染与发布后重建 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-REBUILD-01 | 读者页全部为预渲染 | 正常 |
| BH-02 | SC-REBUILD-02 | 发布后触发重建 | 正常 |
| BH-03 | SC-REBUILD-03 | 更新、撤回、删除都触发重建 | 正常 |
| BH-04 | SC-REBUILD-04 | 删除草稿不触发重建 | 边界 |
| BH-05 | SC-REBUILD-05 | Deploy Hook 失败不影响发布 | 错误 |
| BH-06 | SC-REBUILD-06 | 未配置 Deploy Hook | 边界 |
| BH-07 | SC-REBUILD-07 | 无已发布文章时构建 | 边界 |
| BH-08 | SC-REBUILD-08 | 构建拿不到数据时失败 | 错误 |
| BH-09 | SC-REBUILD-09 | 草稿不进入构建产物 | 边界 |

---

## BH-01: 读者页全部为预渲染

**SC-ID**: SC-REBUILD-01

```gherkin
Given 线上有 3 篇已发布文章
When 执行 npm run build
Then 构建产物包含 /、/posts、3 个 /posts/:slug、各标签页的静态 HTML
  And 这些路由不进入 Worker 的按需渲染路由表
```

## BH-02: 发布后触发重建

**SC-ID**: SC-REBUILD-02

```gherkin
Given 配置了 Deploy Hook
When 我发布一篇草稿
Then 服务端向 Deploy Hook 发送一次 POST
  And 重建完成后读者在 /posts 看到该文章
```

## BH-03: 更新、撤回、删除都触发重建

**SC-ID**: SC-REBUILD-03

```gherkin
Given 配置了 Deploy Hook
When 我分别执行发布更新、撤回为草稿、删除已发布文章
Then 每次操作成功后各发送一次 POST
```

## BH-04: 删除草稿不触发重建

**SC-ID**: SC-REBUILD-04

```gherkin
Given 一篇从未发布的草稿
When 我删除它
Then 不发送 Deploy Hook 请求
```

## BH-05: Deploy Hook 失败不影响发布

**SC-ID**: SC-REBUILD-05

```gherkin
Given Deploy Hook 返回 500 或网络失败
When 我发布文章
Then 发布接口照常返回成功
  And 服务端记录一条包含状态的错误日志（不含 Hook 地址）
```

## BH-06: 未配置 Deploy Hook

**SC-ID**: SC-REBUILD-06

```gherkin
Given 环境中没有 Deploy Hook 地址（本地开发）
When 我发布文章
Then 不发送请求，发布成功
```

## BH-07: 无已发布文章时构建

**SC-ID**: SC-REBUILD-07

```gherkin
Given 线上公开接口返回 0 篇文章
When 执行构建
Then 构建成功，/posts 为空态，不生成详情页与标签页
```

## BH-08: 构建拿不到数据时失败

**SC-ID**: SC-REBUILD-08

```gherkin
Given 公开接口不可达或返回非 200
When 执行构建
Then 构建失败并报出接口地址与状态（不发布一个空站点覆盖线上）
```

## BH-09: 草稿不进入构建产物

**SC-ID**: SC-REBUILD-09

```gherkin
Given 有 1 篇草稿、1 篇已撤回、1 篇已发布文章
When 执行构建
Then 产物中只有已发布文章的标题、正文与 slug
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
