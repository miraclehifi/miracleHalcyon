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

跳转响应、封面异常（svg / 超大 / 超时 / 非豆瓣域）由测试代码按需构造，不录制。App 分享链接即 dispatch 条目链接，不涉及短链。
