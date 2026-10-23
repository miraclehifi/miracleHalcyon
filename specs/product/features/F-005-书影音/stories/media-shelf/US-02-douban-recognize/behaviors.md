# US-02 粘贴豆瓣链接识别填表 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-RECOG-01 | 识别框的初始状态 | UI |
| BH-02 | SC-RECOG-02 | 粘贴后不自动识别 | UI |
| BH-03 | SC-RECOG-03 | 识别书条目链接并填表 | 正常 |
| BH-04 | SC-RECOG-04 | 识别电影条目链接并填表 | 正常 |
| BH-05 | SC-RECOG-05 | 识别 App 分享链接 | 正常 |
| BH-06 | SC-RECOG-06 | 分享文字含多个链接时取第一个豆瓣链接 | 边界 |
| BH-07 | SC-RECOG-07 | 识别不覆盖状态、评分、日期、短评 | 边界 |
| BH-08 | SC-RECOG-08 | 部分识别时提示未识别字段，原值保留 | 边界 |
| BH-09 | SC-RECOG-09 | 分类推断：剧集 / 电影（含动画） | 正常 |
| BH-10 | SC-RECOG-10 | 分类推断：漫画 | 正常 |
| BH-11 | SC-RECOG-11 | 分类推断：游戏 / 桌游 | 正常 |
| BH-12 | SC-RECOG-12 | 识别后可修改任意字段 | 正常 |
| BH-13 | SC-RECOG-13 | 内容里没有豆瓣链接 | 错误 |
| BH-14 | SC-RECOG-14 | 链接打不开或超时 | 错误 |
| BH-15 | SC-RECOG-15 | 解析不出条目信息 | 错误 |
| BH-16 | SC-RECOG-16 | 识别框为空时"识别"不可用 | UI |
| BH-17 | SC-RECOG-17 | 识别中加载态，表单不锁定 | UI |
| BH-18 | SC-RECOG-18 | 重复条目提示并可去编辑 | 正常 |
| BH-19 | SC-RECOG-19 | 编辑条目自身时识别同一链接不算重复 | 边界 |
| BH-20 | SC-RECOG-20 | 识别时下载封面预览，保存后存入 R2 | 正常 |
| BH-21 | SC-RECOG-21 | 封面下载失败时封面留空并提示 | 错误 |
| BH-22 | SC-RECOG-22 | 清空后再次识别覆盖上次结果 | 正常 |
| BH-23 | SC-RECOG-23 | 识别接口只请求豆瓣白名单域名 | 错误 |
| BH-24 | SC-RECOG-24 | 未登录或跨站调用识别接口被拒 | 错误 |

---

## BH-01: 识别框的初始状态

**SC-ID**: SC-RECOG-01

```gherkin
Given 我打开录入表单（新增或编辑）
Then 表单顶部有多行识别框，占位文字"粘贴豆瓣分享链接或分享文字，自动识别条目信息"
  And 右侧有"识别"按钮，识别框为空时没有清空按钮
```

## BH-02: 粘贴后不自动识别

**SC-ID**: SC-RECOG-02

```gherkin
Given 我在录入表单
When 我在识别框粘贴 "https://book.douban.com/subject/1234567/"
Then 不发出识别请求，表单字段不变
  And 识别框出现清空按钮
```

## BH-03: 识别书条目链接并填表

**SC-ID**: SC-RECOG-03

```gherkin
Given 识别框内容为 "https://book.douban.com/subject/1234567/"
  And 该豆瓣条目为书《原则》，作者"瑞·达利欧"，出版年 2018，有封面
When 我点"识别"
Then 分类为"书"、标题"原则"、作者"瑞·达利欧"、年份 2018、封面显示豆瓣封面预览
  And 豆瓣链接显示 "https://book.douban.com/subject/1234567/"
  And 被填入的字段短暂高亮
  And 识别框下方提示"已识别：分类、标题、封面、作者、年份"
```

## BH-04: 识别电影条目链接并填表

**SC-ID**: SC-RECOG-04

```gherkin
Given 识别框内容为 "https://movie.douban.com/subject/1292052/"
  And 该条目为电影《肖申克的救赎》，导演"弗兰克·德拉邦特"，年份 1994
When 我点"识别"
Then 分类为"电影"、标题"肖申克的救赎"、导演"弗兰克·德拉邦特"、年份 1994，封面已填
```

## BH-05: 识别 App 分享链接

**SC-ID**: SC-RECOG-05

```gherkin
Given 识别框内容为豆瓣 App 分享链接 "https://www.douban.com/doubanapp/dispatch/movie/37501131"
  And 该条目为电视剧《现在不是出轨的问题》
When 我点"识别"
Then 分类为"剧集"，标题、导演、年份、封面被填入
  And 豆瓣链接存为规范条目链接 "https://movie.douban.com/subject/37501131/"
  And 服务端没有为解析链接发出额外请求
```

## BH-06: 分享文字含多个链接时取第一个豆瓣链接

**SC-ID**: SC-RECOG-06

```gherkin
Given 识别框内容为 "推荐 https://example.com/a 和 https://book.douban.com/subject/111/ 还有 https://book.douban.com/subject/222/"
When 我点"识别"
Then 识别的是 subject 111
```

## BH-07: 识别不覆盖状态、评分、日期、短评

**SC-ID**: SC-RECOG-07

```gherkin
Given 我已在表单选状态"在读"、评分 4、标记日期 2026-09-01、短评"还行"
When 我识别一个豆瓣书链接成功
Then 状态、评分、标记日期、短评保持不变
```

## BH-08: 部分识别时提示未识别字段，原值保留

**SC-ID**: SC-RECOG-08

```gherkin
Given 我已手动填年份 2020
  And 豆瓣条目没有年份信息
When 我识别该条目
Then 标题等识别到的字段被覆盖，年份仍为 2020
  And 提示"已识别：分类、标题、封面、作者"及"未识别：年份，请手动填写"
```

## BH-09: 分类推断：剧集 / 电影（含动画）

**SC-ID**: SC-RECOG-09

```gherkin
Given 豆瓣电视剧条目 A 的类型为"剧情 / 悬疑"，电视剧条目 B 的类型含"动画"
  And 电影条目 C 的类型含"动画"
When 我分别识别 A、B、C
Then A、B 的分类都为"剧集"，C 为"电影"
```

## BH-10: 分类推断：漫画

**SC-ID**: SC-RECOG-10

```gherkin
Given 豆瓣书条目 D 带"漫画"标签，书条目 E 不带
When 我分别识别 D、E
Then D 的分类为"漫画"，E 为"书"
```

## BH-11: 分类推断：游戏 / 桌游

**SC-ID**: SC-RECOG-11

```gherkin
Given 豆瓣游戏条目 F 为电子游戏，游戏条目 G 按平台 / 类型字段为桌游
When 我分别识别 F、G
Then F 的分类为"游戏"，作者字段填开发商；G 为"桌游"
```

桌游的判定字段由 spike 确认；若豆瓣数据无法区分，G 识别为"游戏"，由作者手动改分类。

## BH-12: 识别后可修改任意字段

**SC-ID**: SC-RECOG-12

```gherkin
Given 识别已把分类填为"剧集"、标题填为"XXX 第一季"
When 我把分类改成"电影"、标题改成"XXX"，并保存
Then 条目以我修改后的值保存，豆瓣链接保留
```

## BH-13: 内容里没有豆瓣链接

**SC-ID**: SC-RECOG-13

```gherkin
Given 识别框内容为 "https://example.com/book/1" 或一段不含链接的文字
When 我点"识别"
Then 提示"不是豆瓣链接"，表单字段不变
```

豆瓣链接但不是条目页（如豆瓣首页、豆列）同样提示"不是豆瓣条目链接"。

## BH-14: 链接打不开或超时

**SC-ID**: SC-RECOG-14

```gherkin
Given 识别框内容为一个豆瓣条目链接
  And 服务端请求豆瓣返回 404、被拦截，或超过 8 秒无响应
When 我点"识别"
Then 提示"链接打不开"，表单字段不变，可继续手填并保存
```

## BH-15: 解析不出条目信息

**SC-ID**: SC-RECOG-15

```gherkin
Given 豆瓣返回了内容，但其中没有标题
When 我点"识别"
Then 提示"解析不出条目信息"，表单字段不变
```

## BH-16: 识别框为空时"识别"不可用

**SC-ID**: SC-RECOG-16

```gherkin
Given 识别框为空或只有空白
Then "识别"按钮禁用
```

## BH-17: 识别中加载态，表单不锁定

**SC-ID**: SC-RECOG-17

```gherkin
Given 我点了"识别"且请求未返回
Then "识别"按钮显示加载态并禁用
  And 我仍可以在短评、评分等字段输入
When 识别成功返回
Then 只覆盖识别到的条目字段，我在等待期间输入的短评、评分不变
```

## BH-18: 重复条目提示并可去编辑

**SC-ID**: SC-RECOG-18

```gherkin
Given 已有条目 X 的豆瓣条目 ID 为 1234567
  And 我在新增表单
When 我识别 "https://book.douban.com/subject/1234567/"
Then 提示"这条已经录入过"和"去编辑"入口，表单字段不变
When 我点"去编辑"
Then 打开 X 的编辑表单
```

## BH-19: 编辑条目自身时识别同一链接不算重复

**SC-ID**: SC-RECOG-19

```gherkin
Given 我正在编辑条目 X（豆瓣条目 ID 1234567）
When 我识别 "https://book.douban.com/subject/1234567/"
Then 不提示重复，正常把识别结果填入表单
```

## BH-20: 识别时下载封面预览，保存后存入 R2

**SC-ID**: SC-RECOG-20

```gherkin
Given 豆瓣条目有封面
When 我识别该条目
Then 服务端带豆瓣 Referer 下载封面、按文件头校验，表单显示封面预览
  And 浏览器没有向豆瓣图片域名发出请求
When 我保存条目
Then 封面存入 R2，条目封面指向站内地址，不保存豆瓣封面地址
```

## BH-21: 封面下载失败时封面留空并提示

**SC-ID**: SC-RECOG-21

```gherkin
Given 豆瓣条目有封面
  And 下载封面失败、超时、不是 jpg / png / webp，或超过 5 MB
When 我识别该条目
Then 其他字段照常填入，封面保持原值
  And 提示"未识别：封面，可手动上传"
  And 我可以手动上传封面后保存
```

识别出的分类为"游戏"时不下载封面（`missing` 含 `cover`），提示改为"未识别：封面，游戏封面请粘贴 IGDB 图片链接"；平台不识别，保持表单当前值（新增时为 PS5）。桌游仍下载豆瓣封面（[game-case-shelf](../../../../../../backlog/game-case-shelf.md)）。

## BH-22: 清空后再次识别覆盖上次结果

**SC-ID**: SC-RECOG-22

```gherkin
Given 我已识别书 A，表单填入了 A 的信息
When 我点识别框的清空按钮，粘贴书 B 的链接并识别
Then 识别框被清空过一次；表单的标题、作者、年份、封面、豆瓣链接变为 B 的信息
```

## BH-23: 识别接口只请求豆瓣白名单域名

**SC-ID**: SC-RECOG-23

```gherkin
Given 豆瓣接口返回 302 跳转到非豆瓣域名
When 识别
Then 服务端不跟随跳转，提示"链接打不开"
Given 调用识别接口时直接传入内网地址或非豆瓣地址
When 识别
Then 服务端不发出该请求，返回"不是豆瓣链接"
```

## BH-24: 未登录或跨站调用识别接口被拒

**SC-ID**: SC-RECOG-24

```gherkin
Given 我未登录
When 调用识别接口
Then 返回 401，服务端不请求豆瓣
Given 我已登录但请求的 Origin 不是本站
When 调用识别接口
Then 返回 403
```
