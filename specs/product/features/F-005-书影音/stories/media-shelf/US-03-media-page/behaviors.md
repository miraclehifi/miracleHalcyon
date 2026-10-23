# US-03 读者浏览书影音 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-SHELF-01 | 从顶栏进入 /media，默认显示书 | 正常 |
| BH-02 | SC-SHELF-02 | 切换分类，当前标签高亮 | 正常 |
| BH-03 | SC-SHELF-03 | 页头显示数量与进行中数量 | 正常 |
| BH-04 | SC-SHELF-04 | 进行中置顶带标记，其余按标记日期倒序 | 正常 |
| BH-05 | SC-SHELF-05 | 书、漫画以卡片显示短评与状态行 | 正常 |
| BH-06 | SC-SHELF-06 | 桌游以列表行显示 | 正常 |
| BH-07 | SC-SHELF-07 | 无评分时不显示星级但保持对齐 | 边界 |
| BH-08 | SC-SHELF-08 | 有豆瓣链接的条目在新标签页打开豆瓣 | 正常 |
| BH-09 | SC-SHELF-09 | 没有豆瓣链接的条目不可点击 | 边界 |
| BH-10 | SC-SHELF-10 | 隐藏条目不显示也不计数 | 边界 |
| BH-11 | SC-SHELF-11 | 封面缺失或加载失败显示占位 | 错误 |
| BH-12 | SC-SHELF-12 | 分类为空时显示空状态 | UI |
| BH-13 | SC-SHELF-13 | 直接访问分类地址显示该分类 | 边界 |
| BH-14 | SC-SHELF-14 | 未知分类返回 404 | 错误 |
| BH-15 | SC-SHELF-15 | 手机宽度布局，分类标签横向滚动 | UI |
| BH-16 | SC-SHELF-16 | 页面不请求豆瓣域名资源 | 边界 |
| BH-17 | SC-SHELF-17 | 页面为静态预渲染，只有分类导航与海报墙加载 React | 边界 |
| BH-18 | SC-SHELF-18 | 条目变更重建后可见 | 正常 |
| BH-19 | SC-SHELF-19 | 电影、剧集海报墙悬停显示片名、点击翻面看详情 | 正常 |
| BH-20 | SC-SHELF-20 | 电影、剧集、游戏海报墙按时间分段开关 | 正常 |
| BH-21 | SC-SHELF-21 | 游戏海报墙：封面保持原比例、悬停显示平台、背面看详情 | 正常 |
| BH-22 | SC-SHELF-22 | 游戏无封面或封面加载失败时显示占位 | 错误 |

---

## BH-01: 从顶栏进入 /media，默认显示书

**SC-ID**: SC-SHELF-01

```gherkin
Given 我在首页
When 我点顶栏"书影音"
Then 进入 /media，返回 200（不是 404）
  And "书"标签高亮，显示书分类的条目
```

## BH-02: 切换分类，当前标签高亮

**SC-ID**: SC-SHELF-02

```gherkin
Given 我在 /media
When 我点"电影"标签
Then 显示电影分类的条目，"电影"标签高亮，"书"标签不再高亮
  And 地址变为 /media/movie
```

## BH-03: 页头显示数量与进行中数量

**SC-ID**: SC-SHELF-03

```gherkin
Given 书分类有 10 条显示中的条目，其中 2 条在读
When 我查看书分类
Then 页头显示"10 本 · 在读 2"
Given 电影分类有 5 条，没有在看的
When 我查看电影分类
Then 页头显示"5 部"，不显示"在看 0"
```

量词按分类：书 / 漫画"本"，电影 / 剧集"部"，游戏 / 桌游"款"。

## BH-04: 进行中置顶带标记，其余按标记日期倒序

**SC-ID**: SC-SHELF-04

```gherkin
Given 剧集分类有：A 看过 2026-03-01、B 在看 2026-01-10、C 看过 2026-09-15
When 我查看剧集分类
Then 顺序为 B、C、A
  And B 带"在看"标记
```

## BH-05: 书、漫画以卡片显示短评与状态行

**SC-ID**: SC-SHELF-05

```gherkin
Given 书条目"原则"：作者"瑞·达利欧"、评分 4、短评"值得反复读"、读过 2026-10-01、有豆瓣链接
When 我查看书分类
Then "原则"以卡片显示封面、标题、作者、4 颗星、短评
  And 底部显示"读过 · 2026-10"和"豆瓣 ↗"
Given 书条目"三体"在读
Then 卡片底部显示"在读"标记而不是日期
```

## BH-06: 桌游以列表行显示

**SC-ID**: SC-SHELF-06

```gherkin
Given 桌游条目"卡坦岛"：设计者"Klaus Teuber"、评分 5、玩过 2026-06-01
When 我查看桌游分类
Then 它以列表行显示封面、标题、设计者、5 颗星、标记年月"2026-06"
```

只有桌游用列表行；电影、剧集自 2026-10-22 改为海报墙（BH-19，[media-poster-wall](../../../../../../backlog/media-poster-wall.md)），游戏自 2026-10-23 改为海报墙（BH-21，[game-case-shelf](../../../../../../backlog/game-case-shelf.md)）。列表行的第三列标签沿用"开发商"字段（`creator`）。

## BH-07: 无评分时不显示星级但保持对齐

**SC-ID**: SC-SHELF-07

```gherkin
Given 电影分类中条目 A 有评分、条目 B 无评分
When 我查看电影分类
Then B 不显示星级
  And A 显示 5 颗星，前 N 颗为点亮的实心星，其余为灰色占位
  And B 的标记年月列与 A 的对齐
```

## BH-08: 有豆瓣链接的条目在新标签页打开豆瓣

**SC-ID**: SC-SHELF-08

```gherkin
Given 条目 X 的豆瓣链接为 "https://movie.douban.com/subject/1292052/"
When 我点击 X
Then 在新标签页打开该链接（链接带 rel="noopener noreferrer"）
```

## BH-09: 没有豆瓣链接的条目不可点击

**SC-ID**: SC-SHELF-09

```gherkin
Given 条目 Y 没有豆瓣链接
When 我查看 Y
Then Y 不是链接，悬停无手型指针
  And 不显示"豆瓣 ↗"
```

## BH-10: 隐藏条目不显示也不计数

**SC-ID**: SC-SHELF-10

```gherkin
Given 书分类有 3 条条目，其中 1 条被作者隐藏
When 我查看书分类
Then 只显示 2 条，页头数量为"2 本"
```

## BH-11: 封面缺失或加载失败显示占位

**SC-ID**: SC-SHELF-11

```gherkin
Given 条目 A 没有封面，条目 B 的封面地址加载失败
When 我查看它们所在分类
Then A、B 的封面位置显示占位底色与"图片不可用"图标，尺寸与正常封面一致
```

## BH-12: 分类为空时显示空状态

**SC-ID**: SC-SHELF-12

```gherkin
Given 桌游分类没有显示中的条目
When 我切到桌游
Then 显示空状态提示（如"还没有记录桌游"），页头显示"0 款"
```

## BH-13: 直接访问分类地址显示该分类

**SC-ID**: SC-SHELF-13

```gherkin
Given 我拿到剧集分类的地址 /media/series
When 我在新标签页直接打开
Then 显示剧集分类，"剧集"标签高亮
```

## BH-14: 未知分类返回 404

**SC-ID**: SC-SHELF-14

```gherkin
Given 我访问一个不存在的分类地址（如 /media/music，或已去掉的 /media/anime）
When 页面加载
Then 显示站点 404 页
```

## BH-15: 手机宽度布局，分类标签横向滚动

**SC-ID**: SC-SHELF-15

```gherkin
Given 视口宽度 390px
When 我打开 /media
Then 分类标签可横向滚动，页面本身无横向滚动
  And 列表行为封面在左、右侧上为标题、下为"作者 · 评分 · 年月"
  And 书 / 漫画卡片单列显示
```

## BH-16: 页面不请求豆瓣域名资源

**SC-ID**: SC-SHELF-16

```gherkin
Given 有封面的条目若干
When 我打开 /media 并切换全部分类
Then 页面没有向任何 douban.com / doubanio.com 域名发出请求
  And 除游戏封面指向 images.igdb.com 外，图片请求都指向站内
```

## BH-17: 页面为静态预渲染，只有分类导航与海报墙加载 React

**SC-ID**: SC-SHELF-17

```gherkin
Given 构建完成
When 检查 /media 的构建产物
Then 页面是预渲染的静态 HTML，包含全部显示中的条目
  And 只有分类导航岛（MediaTypeTabs）与电影、剧集、游戏页的海报墙岛（MediaPosterWall）引用 React 运行时脚本
```

分类切换仍是链接（无 JS 可用）；2026-10-22 起分类导航改用 GooeyNav 动效、电影与剧集改为可翻面的海报墙，为此加载 React（[gooey-media-tabs](../../../../../../backlog/gooey-media-tabs.md)、[media-poster-wall](../../../../../../backlog/media-poster-wall.md)，原为"不引用 React 运行时脚本"）。海报墙的条目在静态 HTML 中完整输出。

## BH-18: 条目变更重建后可见

**SC-ID**: SC-SHELF-18

```gherkin
Given 作者在后台新增了条目 Z
When 重建完成后我访问 /media
Then 能看到 Z
```

## BH-19: 电影、剧集海报墙悬停显示片名、点击翻面看详情

**SC-ID**: SC-SHELF-19

```gherkin
Given 电影分类有"肖申克的救赎"（导演"弗兰克·德拉邦特"、评分 5、看过 2026-08-20、有豆瓣链接）和"无名片"
When 我把指针移到"肖申克的救赎"的海报上
Then 海报底部浮出片名"肖申克的救赎"，不显示导演
When 我点"肖申克的救赎"的海报
Then 海报原地翻到背面，显示片名、5 颗星、"看过 · 2026-08-20"和"豆瓣 ↗"，不显示导演
When 我再点"无名片"的海报
Then "无名片"翻开，"肖申克的救赎"自动翻回正面
When 我按 Esc
Then 翻开的海报翻回正面
```

海报正面不显示"在看"徽标；正面时"豆瓣 ↗"不可点、不可聚焦；无 JS 时海报不能翻面，"豆瓣 ↗"固定显示（[media-poster-wall](../../../../../../backlog/media-poster-wall.md)）。

## BH-20: 电影、剧集、游戏海报墙按时间分段开关

**SC-ID**: SC-SHELF-20

```gherkin
Given 今天是 2026-09-15，电影分类有"肖申克的救赎"（看过 2026-08-20）和"无名片"（看过 2026-07-01），我从未切换过"按时间"
When 我打开电影分类
Then 海报不分段，"按时间"按钮为未按下
When 我点"按时间"
Then 出现"上个月"段（含"肖申克的救赎"，标题 meta "8 月 · 1 部"）和"本年"段（含"无名片"，meta "2026 · 1 部"），不出现空段
When 我刷新页面
Then 仍按时间分段
When 我再点"按时间"
Then 恢复不分段
```

分段在浏览器按当天本地日期计算：1 月时上一年 12 月归"上个月"；晚于今天的日期归"本月"；进行中的条目归"在看"（游戏为"在玩"，量词"款"）（规则见 [reader-media.md](../../../../../../ui/pages/reader-media.md)"按时间分段"）。

## BH-21: 游戏海报墙：封面保持原比例、悬停显示平台、背面看详情

**SC-ID**: SC-SHELF-21

```gherkin
Given 游戏分类有"黑神话：悟空"（平台 PS5、开发商 Game Science、评分 4、玩过 2025-08-20、有豆瓣链接、IGDB 封面 810×1080）
  And "塞尔达传说：王国之泪"（平台 Switch、IGDB 封面 811×1080）和"博德之门 3"（平台 Steam、IGDB 封面 600×900）
When 我打开游戏分类
Then 海报墙与电影同版式（满宽、等宽列、按时间开关）
  And 每张封面的显示宽高比与它的 IGDB 大图一致（810:1080、811:1080、600:900），画面完整、不裁切
  And 封面图片地址为 images.igdb.com 的 t_1080p 大图
When 我把指针移到"黑神话：悟空"上
Then 左下角出现"PS5"平台徽标
  And 不出现游戏名浮层
When 我把指针移到"博德之门 3"上
Then 左下角出现"Steam"平台徽标
When 我点"黑神话：悟空"
Then 翻到背面，显示"黑神话：悟空"、PS5 平台徽标、4 颗星、"玩过 · 2025-08-20"和"豆瓣 ↗"，不显示"Game Science"
```

触屏设备没有悬停，正面不显示平台；平台在背面查看。翻面、只翻一张、Esc 翻回、无 JS 兜底同 BH-19。

## BH-22: 游戏无封面或封面加载失败时显示占位

**SC-ID**: SC-SHELF-22

```gherkin
Given 游戏条目"某款老游戏"没有封面，条目"断链游戏"的 IGDB 封面（810×1080）加载失败
When 我打开游戏分类
Then "某款老游戏"按 3:4 显示占位，"断链游戏"按记录的 810:1080 显示占位，砖块尺寸不跳动
  And 占位为底色、"图片不可用"图标与游戏名；悬停仍显示平台徽标，仍可翻面
```
