# 书影音代码审查遗留项

| 字段 | 值 |
|------|-----|
| 状态 | triaged |
| 类型 | Tech Debt |
| 优先级 | P3-Low（第 1 项 P2，需作者决定） |
| 来源 | F-005 code-review（[报告](../test/features/F-005-书影音/reviews/code-review.md)） |
| 日期 | 2026-10-23 |
| 创建者 | miraclehifi |

## 描述

Sprint 9 代码审查中不阻塞 verify、未在审查阶段修复的问题。

## 待决策

1. **编辑页重新识别豆瓣链接**：界面会显示新链接，但服务端按 api-contract"豆瓣字段只能保持或清除"静默保留原值（原值为空时也不绑定）。可选：① 允许原值为空时绑定新链接、或整体替换（走去重）；② 编辑页识别不覆盖豆瓣字段并提示"豆瓣链接不会更改"。

## 待修复

**后台前端**
- 保存 / 识别遇到 401 时只提示"失败，请重试"：参照文章编辑器暂存表单后跳登录页
- `maxLength` 按 UTF-16 计数（标题、作者、短评），与服务端码点规则不一致
- 年份前端补 1000–9999 范围检查；日期清空时给具体提示
- `MediaEntryList` 的 `busy` 改为集合；删除成功后焦点移到下一行或"新增条目"
- `/admin/media/[id]` 只把 NotFound 显示为"条目不存在"，其他异常照常抛出
- `createEntry` 遇到 2xx 但响应不是 JSON 时按成功处理

**后端**
- 请求体大小只看 Content-Length：按流累计字节，超限中止
- 并发 PUT 换封面的孤儿对象：UPDATE 用 `RETURNING` 取旧 `cover_key`
- 识别：书标签请求单独设更短时限（如 2 秒）；作者 / 标题超过 200 字时截断或提示
- `GET /api/admin/shelf/entries` 同一请求查了两次 `listByType`
- `GET /api/shelf`：考虑构建令牌或短缓存

- 读者页体积（2026-10-27 任务 20 真实导入后发现）：作者全量导入 1,023 条后 `/media/movie.html` 5.5 MB（405 张海报）、`/media/series.html` 3.0 MB；考虑分页 / 按时间段懒渲染 / 精简每张海报的内联数据
- 导入：本页有 `FETCH_FAILED` / `WRITE_FAILED` 的条目时，增量水位仍会在本步结束时前移（按 ADR-014 §1.1 原文实现），这些条目之后只能靠"全量导入"补回；可考虑本步有此类失败时不前移水位

**测试**
- 并发插入同一豆瓣 ID → `D1ShelfRepo.insert` 抛 `DuplicateDoubanError`
- `/covers` 路由参数直接传 `../img/x.jpg`、`2026/10/%2e%2e`；鉴权矩阵补 `GET /api/admin/shelf/entries/1`
- 后台前端：保存 409、401、编辑页移除封面、隐藏 / 删除失败 toast

**文档**
- api-contract：游戏相关字段与错误码标"待实现（ADR-013）"；§4 的 401 错误码改为 `UNAUTHENTICATED`

## 估算

- **规模**: M（第 1 项决策后另估）
