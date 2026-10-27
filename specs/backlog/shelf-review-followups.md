# 书影音代码审查遗留项

| 字段 | 值 |
|------|-----|
| 状态 | triaged |
| 类型 | Tech Debt |
| 优先级 | P3-Low（第 1 项 P2，需作者决定） |
| 来源 | F-005 code-review（[报告](../test/features/F-005-书影音/reviews/code-review.md)） |
| 日期 | 2026-10-23（2026-10-27 补入任务 12–20 的审查遗留项） |
| 创建者 | miraclehifi |

## 描述

Sprint 9 代码审查中不阻塞 verify、未在审查阶段修复的问题。第一轮审查任务 1–11（2026-10-23），第二轮审查任务 12–20（2026-10-27），第二轮的条目标"（12–20）"。

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
- 豆瓣导入弹窗（12–20）：
  - 中途 401 时跳过 `finish`（现在会再弹出误导性的"触发重建失败"），提示重新登录；状态接口 401 时不要静默按首次处理
  - 等 `finish` 返回期间"停止"仍可点
  - 首次状态请求返回慢时会覆盖已输入的 ID
  - `Checkbox` 的 hint 改用 `aria-describedby`，不并入可访问名称
  - 分页循环加防御：`nextStart <= 当前 start` 时结束
  - 类别区与进度区的先后顺序与规格不一致，需对照设计稿 11i
- `src/lib/dom/modal.ts`（12–20）：ConfirmDialog 仍是自己的一份实现；`FOCUSABLE` 缺 `select`、`textarea`、`[tabindex]`；背景设为 inert 后，弹窗打开期间的 Toast 不会被读屏播报
- 外链 IGDB `<img>`（录入预览、后台列表、读者页）加 `referrerPolicy="no-referrer"`（12–20）

**后端**
- 请求体大小只看 Content-Length：按流累计字节，超限中止
- 并发 PUT 换封面的孤儿对象：UPDATE 用 `RETURNING` 取旧 `cover_key`
- 识别：书标签请求单独设更短时限（如 2 秒）；作者 / 标题超过 200 字时截断或提示
- `GET /api/admin/shelf/entries` 同一请求查了两次 `listByType`
- `GET /api/shelf`：考虑构建令牌或短缓存

- 读者页体积（2026-10-27 任务 20 真实导入后发现）：作者全量导入 1,023 条后 `/media/movie.html` 5.5 MB（405 张海报）、`/media/series.html` 3.0 MB；考虑分页 / 按时间段懒渲染 / 精简每张海报的内联数据
- 导入（12–20）：
  - `create()` 在封面 `put` 之后、insert 之前超时，R2 封面没有回收
  - `touch` 在豆瓣列表请求之前执行，用户不存在（404）或无权限（403）时也会把错误的 ID 记为"上次使用"
  - 未勾选类别的坏数据仍会进 `failed[]`；影视可以先按 `subject.type` 过滤
  - 下一页起点固定为 `start + 20`，依赖豆瓣的 start 是位置偏移，需在 ADR-014 注明
  - `stateRepo.complete` 失败时本页已写入，但前端只看到 500
  - `import/state?uid=`（空串）返回 400，契约没写
  - `douban/client.ts` 反向依赖 `import.ts` 的 `isValidDoubanUid`
  - 64 KB 内读不到 SOF 的 jpg 会被误报为"封面链接打不开"
- 读者端（12–20）：
  - 构建校验没有按分类约束字段：非游戏条目也允许 IGDB 封面和平台
  - `posterAspect` 没有比例上下限（建议限制在 1/3–3）
  - `year` 为 0 时浮层会渲染出 "0"；构建校验应限定 1000–9999
  - 年份徽标嵌在 `platform &&` 里，没有平台的游戏不显示年份
- 导入：本页有 `FETCH_FAILED` / `WRITE_FAILED` 的条目时，增量水位仍会在本步结束时前移（按 ADR-014 §1.1 原文实现），这些条目之后只能靠"全量导入"补回；可考虑本步有此类失败时不前移水位

**测试**
- 并发插入同一豆瓣 ID → `D1ShelfRepo.insert` 抛 `DuplicateDoubanError`
- `/covers` 路由参数直接传 `../img/x.jpg`、`2026/10/%2e%2e`；鉴权矩阵补 `GET /api/admin/shelf/entries/1`
- 后台前端：保存 409、401、编辑页移除封面、隐藏 / 删除失败 toast
- （12–20）：
  - 导入弹窗 E2E：进行中 Esc / 遮罩无效、完成后可关闭、焦点回到"从豆瓣导入"
  - IGDB 预览 404 时回到虚线框
  - 键盘聚焦游戏海报时徽标淡入
  - 导入后已有游戏被识别为桌游时，平台和封面链接是否清空
- `tests/unit/markdown` 代码高亮快照在全量并发负载下偶发失败（2026-10-27 全量 1 次，单独重跑通过）

**文档**
- api-contract：游戏相关字段与错误码标"待实现（ADR-013）"；§4 的 401 错误码改为 `UNAUTHENTICATED`

## 估算

- **规模**: M（第 1 项决策后另估）
