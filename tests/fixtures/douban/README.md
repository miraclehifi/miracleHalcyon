# 豆瓣 Rexxar 夹具（F-005）

由 `python scripts/spike/douban-rexxar.py` 于 2026-10-21 从 `https://m.douban.com/rexxar/api/v2/` 录制（带 `Referer: https://m.douban.com/` 与移动端 UA），只保留识别用到的字段。

| 文件 | 来源 | 识别期望 |
|------|------|---------|
| `book-principles.json` / `-tags.json` | `book/27608239`（原则） | book |
| `book-manga.json` / `-tags.json` | `book/2025999`（灌篮高手全 31 卷） | comic（标签含"漫画"） |
| `movie-shawshank.json` | `movie/1292052` | movie |
| `movie-animated.json` | `movie/1291561`（千与千寻，`genres` 含"动画"、`is_tv: false`） | movie |
| `tv-drama.json` | `movie/26302614`（请回答1988，`is_tv: true`） | series |
| `tv-anime.json` | `movie/36093351`（葬送的芙莉莲，`is_tv: true` + "动画"） | series（2026-10-22 起动画剧集归剧集，[drop-anime-type](../../../specs/backlog/drop-anime-type.md)） |
| `tv-dispatch.json` | `movie/37501131`（现在不是出轨的问题；作者 2026-10-22 提供的真实 App 分享链接 `https://www.douban.com/doubanapp/dispatch/movie/37501131`） | series |
| `game-video.json` | `game/10734307`（传送门2） | game，creator = `developers` |
| `game-board.json` | `game/10757298`（卡坦岛，`genres` 含"问答/桌游"） | boardgame |
| `book-no-year.json` | 由原则去掉 `pubdate` | missing 含 year |
| `no-title.json` | 由原则去掉 `title` | PARSE_FAILED |
| `cover-ok.jpg` | 原则封面 `img2.doubanio.com`（带 Referer 200；不带 418） | — |

## 导入夹具（US-04）

由 `python scripts/spike/douban-rexxar.py interests` 于 2026-10-27 从 `user/189806038/interests`（作者公开账号）录制，只保留导入用到的字段（标记：`id`、`status`、`rating.value`、`create_time`、`comment`、`platforms[].abbreviation`；条目：`id`、`type`、`title`、`year`、`pubdate`、`author`、`directors[].name`、`genres`、`release_date`、`cover_url`、`pic.large`、`url`），每页按 `create_time` 倒序。标"构造"的是脚本在真实条目上改出来的样本。

| 文件 | 内容 | 用于 |
|------|------|------|
| `interests-movie-done.json` | 影视看过 5 条，`total: 45`：评 4 星带短评的电影（25765735）、剧集（30513783，`create_time` = `2026-10-18 08:25:08`）、未评分电影（25786060）；构造 `status: mark`（1305724）、缺标题（1401524） | TC-US04-01、04、05、07、08 |
| `interests-movie-done-p2.json` / `-p3.json` | 同列表 `start` 20 / 40（3 条 / 2 条） | TC-US04-06、08 |
| `interests-movie-doing.json` | 在看剧集 1 条（36189165，`rating: null`） | TC-US04-01 |
| `interests-book-done.json` | 书 4 条：作者"[哥伦比亚] 加西亚·马尔克斯"、`pubdate` 2012-9-1；`pubdate` 2024-1；`pubdate: []`；漫画（36484713，测试打桩 tags 含"漫画"） | TC-US04-02 |
| `interests-game-done.json` | 游戏 5 条：平台 PS5 / PC / NS 2 / 空；构造 `genres: ["问答/桌游"]`（26436096） | TC-US04-03 |
| `interests-movie-done-incr.json` | 构造标记时间：3 条晚于 `2026-10-18 08:25:08`、2 条恰为该时间、1 条更早；`total: 614` | TC-US04-18、25 |
| `interests-movie-done-doing2done.json` | 构造：在看剧集 36189165 以看过标记（`2026-10-26 20:00:00`、5 星）排在最前 | TC-US04-21 |
| `interests-movie-done-mixed.json` | 真实看过页中 12 部电影 + 8 部剧集，`total: 20` | TC-US04-24 |
| `interests-book-done-manga.json` | 真实读过页前 20 本；测试按 ID 打桩 36484713、36265242、36145936 为漫画，35929511 的 tags 请求失败（导入时进 failed） | TC-US04-13、24 |

跳转响应、封面异常（svg / 超大 / 超时 / 非豆瓣域）由测试代码按需构造，不录制。App 分享链接即 dispatch 条目链接，不涉及短链。导入的错误响应（404 / 403 / 要求登录 / 超时）由测试代码构造。
