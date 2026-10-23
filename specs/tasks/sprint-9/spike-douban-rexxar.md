# spike-douban-rexxar: 豆瓣 Rexxar 可用性与字段验证

**Sprint**: Sprint 9
**序号**: 1
**状态**: completed
**类别**: SETUP（spike）
**架构层级**: 验证（临时脚本，不进产品代码）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: 在 Cloudflare 边缘（`wrangler dev --remote` 或临时部署的独立 Worker）实际请求豆瓣，确认 ADR-011 的六项风险；把每类真实响应录制为测试夹具
- **影响范围**: 新增 `tests/fixtures/douban/`、`scripts/spike/douban-rexxar.ts`（或独立 Worker 目录 `spike/douban/`）；不改 `src/`
- **不变量**: 不部署到生产 Worker；临时 Worker 用完删除
- **不在本任务**: 防腐层实现（任务 3）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| 风险 | [Backlog"技术风险"](../../backlog/media-douban-sync.md)、[ADR-011 后果·风险 ①–⑥](../../engineering/features/F-005-书影音/architecture/adr/ADR-011-shelf-domain-douban-recognition.md) |
| 成功指标 | feature-scope §5"识别成功率：样例链接标题与封面识别成功 ≥ 90%" |

## 验证清单（每项记录"成立 / 不成立 + 证据"）

| # | 假设 | 方法 |
|---|------|------|
| ① | Worker 出口可访问 `m.douban.com/rexxar/api/v2/*`（带 Referer 与移动端 UA） | 边缘请求书、电影、剧、游戏各 2 个条目，记录状态码与耗时 |
| ② | 书、游戏、桌游的 Rexxar 路径与字段（作者、出版年、开发商、发行日期、标签） | 对照录制 JSON，补全 domain-model §2.3 映射表的精确 JSON 路径 |
| ③ | 电影与剧的区分字段（`movie.douban.com/subject/{id}` 共用） | 同一入口请求一部电影、一部剧，比较字段 |
| ④ | 漫画标签、动画类型、桌游判定字段 | 各取 2 个样例 |
| ⑤ | App 分享文字的格式、短链主机与跳转形式（302 / 301 / meta） | 作者提供 2–3 段真实分享文字；边缘逐跳请求 |
| ⑥ | 封面字段（`pic.large` 等）、图片主机、带 Referer 的下载结果与大小 | 下载并检查文件头 |
| ⑦ | 10 个样例（每类至少 1 个）标题与封面识别成功率 | 统计 ≥ 9 / 10 |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `tests/fixtures/douban/` 下夹具齐全（TC-US02 录制夹具 `book-principles`…`game-board`、`book-no-year`、`no-title`、封面样本；跳转等异常响应由测试构造），并有 `README.md` 注明来源条目与录制日期 | 夹具检查（`tests/unit/shelf/douban-fixtures.test.ts`：每个夹具可解析为 JSON 且含 `title`，`no-title` 除外） |
| 2 | spike 结论表（本文件"结论"一节）七项全部填写 | 文档 |

## DoD（完成定义）

- [x] 七项假设均有结论与证据（状态码、字段截取、耗时）
- [x] ADR-011 状态改为 Accepted（全部成立）或修订对应行；domain-model §2.1 链接格式、§2.3 映射表补全精确 JSON 路径；`canonicalDoubanUrl` 游戏格式定稿
- [x] （不适用：① ⑦ 均成立）① 或 ⑦ 不成立 → 在 F-005 status.yaml `blockers` 追加 `needs-decision`，停下请作者在 Backlog 退路（全部手填 / 浏览器端打开链接）中选择，任务 3、6 暂停
- [x] 临时 Worker（如有）已删除（只用了 `wrangler dev --remote` 预览，未部署）

## 依赖

无

## 影响的文件

- `tests/fixtures/douban/*`（新建）、`tests/unit/shelf/douban-fixtures.test.ts`（新建）
- `scripts/spike/douban-rexxar.py`（新建，录制夹具；豆瓣改版时重跑）
- 文档：ADR-011、shelf domain-model §2

## 回滚策略

删除新增脚本与夹具；文档改动 git 还原

## 结论

2026-10-21 完成。本地（Python 脚本）+ Cloudflare 边缘（临时 Worker `wrangler dev --remote`，colo SIN）双路验证，临时 Worker 未部署、已停止。

| # | 结论 | 证据 |
|---|------|------|
| ① | ✅ 成立 | 边缘 7 个请求全部 200：冷启动 0.7–4.4 s，热 0.3–2.3 s；不带 Referer 也返回 JSON，图片才校验 Referer |
| ② | ✅ 成立 | 书 `book/{id}`：`author[]`（带"[美] "等国籍前缀）、`pubdate[0]`（"2018-1"）；**`tags` 在条目接口里为空**，需另请求 `book/{id}/tags`（返回 `{tags: string[]}`）；游戏 `game/{id}`：`developers[]`、`release_date`（"2011-04-19"）、`genres[]` |
| ③ | ✅ 成立 | `movie/{id}` 对剧同样 200，返回 `is_tv: true`、`type: "tv"`；`tv/{id}` 对电影 404。只需请求 `movie/{id}` 再看 `is_tv` |
| ④ | ✅ 成立 | 漫画：灌篮高手 `book/2025999/tags` 首个标签"漫画"；动画：葬送的芙莉莲 `is_tv: true` + `genres` 含"动画"；动画电影：千与千寻 `is_tv: false` + "动画" → movie；桌游：卡坦岛 `genres` 含"问答/桌游"（子串匹配"桌游"） |
| ⑤ | ✅ 成立（2026-10-22 作者确认） | 作者提供的真实 App 分享链接为 `https://www.douban.com/doubanapp/dispatch/movie/37501131`（韩剧《现在不是出轨的问题》，`movie/37501131` 返回 `is_tv: true`），与条目接口的 `sharing_url` 一致：可直接解析出条目、无需请求。**不做短链跳转**：识别接口不跟随任何重定向 |
| ⑥ | ✅ 成立 | `cover_url`（`img{n}.doubanio.com`，无签名）优先；游戏的 `pic.large` 是带签名的 `qnmob3-sign.doubanio.com`，不用。带 `Referer: https://m.douban.com/` 200（25–97 KB JPEG），不带 418 |
| ⑦ | ✅ 成立 | 10 个样例（原则、三体、灌篮高手、肖申克、千与千寻、请回答1988、芙莉莲、传送门2、卡坦岛 + 边缘复测）标题 10 / 10、封面 10 / 10 |

**对设计的影响**（已回写 ADR-011、shelf domain-model §2）：书类同时请求条目与标签（并行，标签失败按 book 处理）；作者去掉开头的国籍括号；封面取 `cover_url`；链接格式补 dispatch；去掉短链跳转（所有外发请求 `redirect: "manual"`，3xx 视为失败）；8 秒总时限保持不变（冷启动最坏约 4.4 s + 封面约 1 s）。
