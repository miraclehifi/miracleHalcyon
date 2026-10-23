# 读者浏览书影音 验收测试

**US ID**: US-03
**Story**: [story.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/behaviors.md)
**最后更新**: 2026-10-23
**Version Tag**: v1.0

> 验收规格（非可执行代码）。分类路由按 [reader-media.md](../../../../../ui/pages/reader-media.md)：`/media` = 书，其余 `/media/{type}`（design-ui 2026-10-21 定稿），下文 `{分类地址}` 即此路径。
> 读者页构建时预渲染，数据在构建时读取：**build 类用例**走 `npm run test:build`（夹具数据真实构建后检查产物），**e2e 类**走 `astro preview` 下的构建产物。
> 未特别注明的 TC：Version Tag v1.0、Automation Feasibility ✅、Change History "2026-10-21 v1.0 初始创建"。

## 测试数据（构建夹具 Seed，只读）

| 分类 | 条目（标题 · 状态 · 标记日期 · 评分 · 其他） |
|------|---------------------------------------------|
| book | 原则 · 读过 · 2026-10-01 · 4 · 作者瑞·达利欧、短评"值得反复读"、有封面、有豆瓣；三体 · 在读 · 2026-08-01 · — · 有豆瓣；隐书 · 读过 · 2026-05-01 · 3 · **隐藏**；手记 · 读过 · 2026-03-01 · 5 · **无豆瓣链接、无封面** |
| movie | 肖申克的救赎 · 看过 · 2026-08-20 · 5 · 导演弗兰克·德拉邦特、有豆瓣；无名片 · 看过 · 2026-07-01 · — · 封面地址指向不存在的对象 |
| series | A · 看过 · 2026-03-01；B · 在看 · 2026-01-10；C · 看过 · 2026-09-15 |
| game | 黑神话：悟空 · 玩过 · 2025-08-20 · 4 · 平台 ps5、开发商 Game Science、有豆瓣、IGDB `co8h3y` 810×1080；塞尔达传说：王国之泪 · 在玩 · 2026-05-01 · 5 · 平台 switch、IGDB `co5vmg` 811×1080；博德之门 3 · 玩过 · 2024-02-10 · 5 · 平台 steam、IGDB `cobg300` 600×900；某款老游戏 · 玩过 · 2019-03-01 · — · 平台 ps4、**无封面**；断链游戏 · 玩过 · 2023-01-01 · — · 平台 switch2、IGDB `conope0` 810×1080（E2E 中返回 404） |
| comic | **无条目**（空状态） |
| boardgame | 卡坦岛 · 玩过 · 2026-06-01 · 5 · 开发商 Klaus Teuber、有豆瓣；无评桌游 · 玩过 · 2026-04-01 · — |

Seed 中标题含 `<b>` 的条目 1 条（book，读过 · 2026-01-01），用于转义检查。

E2E 中 `page.route("https://images.igdb.com/**")` 返回 `tests/fixtures/igdb/` 下对应尺寸的夹具图片（`conope0` 返回 404），不访问外网。2026-10-23 起游戏由列表行改为海报墙，原游戏夹具移到桌游、漫画改为空分类（[game-case-shelf](../../../../../backlog/game-case-shelf.md)）。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US03-01 | SC-SHELF-01 | 顶栏进入 /media，默认书 | P0 | e2e |
| TC-US03-02 | SC-SHELF-02, SC-SHELF-13 | 分类切换与直接访问分类地址 | P0 | e2e |
| TC-US03-03 | SC-SHELF-03, SC-SHELF-10, SC-SHELF-12 | 页头数量、量词与进行中数（等价类） | P0 | build |
| TC-US03-04 | SC-SHELF-04 | 排序与进行中标记 | P0 | build |
| TC-US03-05 | SC-SHELF-05 | 书 / 漫画卡片内容 | P0 | build |
| TC-US03-06 | SC-SHELF-06, SC-SHELF-07 | 列表行（桌游）内容与无评分对齐 | P1 | build |
| TC-US03-07 | SC-SHELF-08, SC-SHELF-09 | 豆瓣外链与不可点击条目 | P0 | build |
| TC-US03-08 | SC-SHELF-10 | 隐藏条目不进产物 | P0 | build |
| TC-US03-09 | SC-SHELF-14 | 未知分类回退 | P1 | e2e |
| TC-US03-10 | SC-SHELF-16 | 不请求豆瓣域名，外链图片只有 IGDB | P0 | e2e |
| TC-US03-11 | SC-SHELF-17 | 静态预渲染、只有分类导航与海报墙岛 | P0 | build |
| TC-US03-12 | SC-SHELF-18 | 重建后可见（写后触发构建） | P1 | e2e |
| TC-US03-13 | SC-SHELF-05 | 错误猜测：HTML 转义、超长标题、多行短评 | P1 | build |
| TC-US03-14 | SC-SHELF-01 | 性能：LCP < 2.5s | P2 | performance |
| TC-US03-15 | SC-SHELF-11 | 封面缺失 / 加载失败占位 | P1 | ui-interaction |
| TC-US03-16 | SC-SHELF-12 | 空分类空状态 | P1 | ui-interaction |
| TC-US03-17 | SC-SHELF-15 | 手机 390px 布局与标签横滑 | P1 | ui-interaction |
| TC-US03-18 | SC-SHELF-02 | 分类标签键盘操作与可访问性 | P2 | ui-interaction |
| TC-US03-19 | SC-SHELF-19 | 海报墙悬停片名与翻面看详情 | P1 | ui-interaction |
| TC-US03-20 | SC-SHELF-20 | 海报墙按时间分段开关 | P1 | ui-interaction |
| TC-US03-21 | SC-SHELF-21 | 游戏海报墙产物：IGDB 地址、原比例、平台、背面不含开发商 | P0 | build |
| TC-US03-22 | SC-SHELF-21 | 游戏海报：原比例不裁切、悬停只显示平台、翻面看详情 | P1 | ui-interaction |
| TC-US03-23 | SC-SHELF-22 | 游戏无封面 / 加载失败占位 | P1 | ui-interaction |

**覆盖目标**：需求覆盖 100%（AC1–AC14）、行为覆盖 100%（SC-SHELF-01 – 22）。

---

## 功能测试

### TC-US03-01: 顶栏进入 /media，默认书

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-01 | P0 | e2e |

**步骤：** 打开 `/`，点顶栏"书影音"

**预期结果：** 响应 200；URL 为 `/media`；"书"标签为当前项；显示书分类条目；顶栏"书影音"为当前项

### TC-US03-02: 分类切换与直接访问分类地址

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-02, SC-SHELF-13 | P0 | e2e |

**步骤：** 1. 在 `/media` 点"电影"　2. 浏览器后退　3. 新标签直接打开剧集的 `{分类地址}`

**预期结果：** 1：只显示电影条目，"电影"高亮、"书"不高亮，URL 为电影的 `{分类地址}`；2：回到书分类；3：显示剧集分类、"剧集"高亮

### TC-US03-03: 页头数量、量词与进行中数

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-03, SC-SHELF-10, SC-SHELF-12 | P0 | build |

| 分类 | 期望页头 |
|------|---------|
| book | `4 本 · 在读 1`（原则、三体、手记、`<b>` 条目；隐书隐藏不计） |
| movie | `2 部`（无进行中，不显示"在看 0"） |
| series | `3 部 · 在看 1` |
| game | `5 款 · 在玩 1` |
| comic | `0 本` |
| boardgame | `2 款` |

### TC-US03-04: 排序与进行中标记

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-04 | P0 | build |

**预期结果：** series 顺序为 B、C、A，B 带"在看"标记；book 顺序为 三体（在读）、原则、手记、`<b>` 条目

### TC-US03-05: 书 / 漫画卡片内容

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-05 | P0 | build |

**预期结果：**
- "原则"卡片：封面 `<img>` 指向站内 R2 路径、标题、"瑞·达利欧"、4 颗实心星（`aria-label="评分 4 / 5"`）、短评"值得反复读"、底部"读过 · 2026-10"与"豆瓣 ↗"
- "三体"卡片：底部为"在读"标记，无日期，无星级

### TC-US03-06: 列表行内容与无评分对齐

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-06, SC-SHELF-07 | P1 | build + e2e |

**预期结果：** 桌游分类中"卡坦岛"行含封面、标题、开发商、星级（5 颗星元素且全部点亮，`aria-label="评分 5 / 5"`）、`2026-06`；"无评桌游"行无星级元素但保留评分列占位；e2e 中两行的年月列左边缘 x 坐标相同（±1px）（只有桌游用 `MediaRow`；电影、剧集、游戏为海报墙，见 TC-US03-19、21。2026-10-22 由电影改为游戏，2026-10-23 [game-case-shelf](../../../../../backlog/game-case-shelf.md) 由游戏改为桌游）

### TC-US03-07: 豆瓣外链与不可点击条目

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-08, SC-SHELF-09 | P0 | build |

**预期结果：**
- "原则"由 `<a href="https://book.douban.com/subject/…/" target="_blank" rel="noopener noreferrer">` 包裹，含"豆瓣 ↗"
- "手记"不在任何 `<a>` 内，不含"豆瓣 ↗"，无 `cursor: pointer`
- 产物中所有指向豆瓣的 `<a>` 都带 `rel="noopener noreferrer"`

### TC-US03-08: 隐藏条目不进产物

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-10 | P0 | build |

**预期结果：** 全部 `/media` 相关产物（HTML 及任何内联 / 外部数据文件）中都不含"隐书"

### TC-US03-09: 未知分类回退

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-14 | P1 | e2e |

**步骤：** 访问 `/media/music`、`/media/anime`、`/media/book`

**预期结果：** 均返回站点 404 页（`/media/anime` 为已去掉的分类，不生成；`/media/book` 不生成，书只在 `/media`）

### TC-US03-10: 不请求豆瓣域名

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-16 | P0 | e2e |

**步骤：** 监听全部请求，打开 `/media` 并依次切换 6 个分类、滚动到底

**预期结果：** 无主机名匹配 `douban.com` 或 `doubanio.com` 的请求；站外图片请求只有 `images.igdb.com`，且只出现在游戏页；产物 HTML 中 `<img src>` 除游戏封面（`https://images.igdb.com/igdb/image/upload/t_1080p/…`）外均为站内路径

### TC-US03-11: 静态预渲染、只有分类导航岛

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-17 | P0 | build |

**预期结果：** 产物中存在 `/media` 与 5 个 `/media/{type}` 的静态 HTML，包含全部显示中条目的标题；每页都有分类导航岛（`MediaTypeTabs`，`client="load"`），其服务端输出含分类 `<a href>` 且当前项 `aria-current="page"`（无 JS 可用）；电影、剧集、游戏页另有且仅有一个海报墙岛（`MediaPosterWall`，`client="load"`），其服务端输出为 `[data-poster-static]` 静态网格，含该分类全部显示中条目的标题、短评、`yyyy-MM-dd` 标记日期与豆瓣链接（不含导演）；书、漫画、桌游页不出现其他岛；只允许封面失败占位的内联 `onerror`（2026-10-22 [gooey-media-tabs](../../../../../backlog/gooey-media-tabs.md)、[media-poster-wall](../../../../../backlog/media-poster-wall.md)，原为"不引用 React 运行时 chunk"）

### TC-US03-12: 重建后可见

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-18 | P1 | e2e（手工 / verify） |

**步骤：** 后台新增条目 → 确认 Deploy Hook 被调用；本地以重新构建模拟重建后访问 `/media`

**预期结果：** 新条目可见。线上"P95 ≤ 5 分钟"在 verify 阶段真实链路核对。Automation Feasibility：部分适合（触发可自动断言，线上时延人工记录）

### TC-US03-13: 错误猜测：HTML 转义、超长标题、多行短评

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-05 | P1 | build |

**预期结果：** 标题 `<b>` 以文本出现（产物含 `&lt;b&gt;`）；200 字标题在卡片中最多 2 行省略、不撑破布局；多行短评保留换行，超过 4 行省略

### TC-US03-14: 性能：LCP < 2.5s

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-01 | P2 | performance |

**步骤：** Lighthouse 移动端模拟，书分类含 50 条带封面条目

**预期结果：** LCP < 2.5s，Performance ≥ 90；首屏以下封面 `loading="lazy"`。Automation Feasibility：verify 阶段手动执行

---

## UI 交互测试

### TC-US03-15: 封面缺失 / 加载失败占位

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-11 | P1 | ui-interaction |

**预期结果：** "手记"（无封面）与"无名片"（封面 404）显示 `surface-sunken` 底与 `image-off` 图标，尺寸与正常封面相同；行 / 卡片高度与其他条目一致

**playwright_hint：** `const ph = page.getByRole('img', { name: '图片不可用' }).first(); await expect(ph).toBeVisible(); expect((await ph.boundingBox()).width).toBe((await normalCover.boundingBox()).width)`

### TC-US03-16: 空分类空状态

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-12 | P1 | ui-interaction |

**预期结果：** 切到漫画显示"还没有记录漫画"，页头"0 本"，无条目元素（2026-10-23 起桌游有夹具数据，空分类改用漫画）

**playwright_hint：** `await page.getByRole('link', { name: '漫画' }).click(); await expect(page.getByText('还没有记录漫画')).toBeVisible()`

### TC-US03-17: 手机 390px 布局与标签横滑

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-15 | P1 | ui-interaction |

**预期结果：** `document.documentElement.scrollWidth <= 390`；分类标签容器 `scrollWidth > clientWidth` 且可横向滚动，点"桌游"前自动或手动滚动可见；列表行（桌游）为封面 44×66 在左、右侧两行；书卡片单列；游戏海报墙 2 列

**playwright_hint：** `await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)`

### TC-US03-18: 分类标签键盘操作与可访问性

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-02 | P2 | ui-interaction |

**预期结果：** 分类导航为 `<nav aria-label="书影音分类">` 内的链接：每个标签可 Tab 聚焦、Enter 跳转，当前项 `aria-current="page"`

**playwright_hint：** `await expect(page.getByRole('link', { name: '书' })).toHaveAttribute('aria-current', 'page')`

### TC-US03-19: 海报墙悬停片名与翻面看详情

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-19 | P1 | ui-interaction |

**前置条件：** 打开电影的 `{分类地址}`（不分段），`waitForHydration`

**步骤：** 1. 指针移到"肖申克的救赎"海报上　2. 点它　3. 点"豆瓣 ↗"　4. 点"无名片"海报　5. 按 Esc　6. Tab 聚焦"肖申克的救赎"，按 Enter

**预期结果：** 初始：`[data-poster-wall]` 内 2 张海报，翻面控件 `aria-pressed="false"`，正面无"在看"徽标，"豆瓣 ↗"不可聚焦；1：海报底部片名浮层可见，文字为"肖申克的救赎"，不含"弗兰克·德拉邦特"；2：`aria-pressed="true"`，背面可见"肖申克的救赎"、`评分 5 / 5`、"看过 · 2026-08-20"，背面不含"弗兰克·德拉邦特"，"豆瓣 ↗"可见可聚焦；3：新标签页打开豆瓣地址（`target="_blank"`），海报不翻回；4："无名片"翻开（背面无星级），"肖申克的救赎"自动翻回；5：两张都 `aria-pressed="false"`；6："肖申克的救赎"翻开，片名浮层可见（键盘聚焦）。另：`emulateMedia({ reducedMotion: 'reduce' })` 下点击后背面立即可见（无翻转动画）；`emulateMedia({ colorScheme: 'dark' })` 下背面底色为 `rgb(39, 39, 42)`

**playwright_hint：** `const card = page.getByRole('button', { name: '《肖申克的救赎》' }); await card.hover(); await card.click(); await expect(card).toHaveAttribute('aria-pressed', 'true')`

### TC-US03-20: 海报墙按时间分段开关

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-20 | P1 | ui-interaction |

**前置条件：** `page.clock.setFixedTime(new Date('2026-09-15T10:00:00'))`，清空 `localStorage`，打开电影的 `{分类地址}`，`waitForHydration`

**步骤：** 1. 观察初始状态　2. 点"按时间"　3. 刷新页面　4. 再点"按时间"　5. 视口 390×844 重开页面

**预期结果：** 1：无分段标题（`h2` 0 个），按钮 `aria-pressed="false"`；2：按钮 `aria-pressed="true"`，依次出现 `h2`"上个月"（meta "8 月 · 1 部"，段内"肖申克的救赎"）、"本年"（meta "2026 · 1 部"，段内"无名片"），没有"在看""本月""去年"段；3：仍分段；4：恢复不分段；5：按钮在标题行（`MediaHeader` 内），海报 2 列。另：滚动到"本年"段下方时其标题 `getBoundingClientRect().top` 为 0（吸顶）

**playwright_hint：** `await page.getByRole('button', { name: '按时间' }).click(); await expect(page.getByRole('heading', { level: 2 })).toHaveText(['上个月', '本年'])`

### TC-US03-21: 游戏海报墙产物：IGDB 地址、原比例、平台、背面不含开发商

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-21 | P0 | build |

**预期结果：** `/media/game` 有一个 `MediaPosterWall` 岛，`[data-poster-static]` 静态网格含 5 个游戏（顺序：塞尔达传说：王国之泪（在玩）、黑神话：悟空、断链游戏、博德之门 3、某款老游戏）；
- "黑神话：悟空"`<img src>` = `https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg`，砖块 `style` 含 `aspect-ratio: 810 / 1080`，`<img>` 带 `width="810" height="1080"`、`object-fit: contain`；"博德之门 3"为 `600 / 900`；"某款老游戏"无 `<img>`、砖块 `aspect-ratio: 3 / 4`
- 每张海报含平台徽标文本与 `aria-label`：`平台：PS5` / `平台：Switch` / `平台：Steam` / `平台：PS4` / `平台：Switch 2`
- 背面含"黑神话：悟空"、`评分 4 / 5`、"玩过 · 2025-08-20"、豆瓣链接；整页不含"Game Science"
- 海报正面不含游戏名浮层元素（`data-poster-caption` 不存在）
- 页头"5 款 · 在玩 1"

### TC-US03-22: 游戏海报：原比例不裁切、悬停只显示平台、翻面看详情

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-21 | P1 | ui-interaction |

**前置条件：** 打开 `/media/game`（不分段），`waitForHydration`

**步骤：** 1. 量每张有封面的海报　2. 指针移到"黑神话：悟空"　3. 指针移到"博德之门 3"　4. 点"黑神话：悟空"　5. 视口 390×844 重开　6. 点"按时间"

**预期结果：** 1："黑神话：悟空"砖块宽高比 = 810/1080、"博德之门 3" = 600/900（各 ±1%），图片 `naturalWidth / naturalHeight` 与砖块宽高比一致（未裁切）；2：左下角平台徽标可见、文字"PS5"，页面上没有可见的"黑神话：悟空"浮层文字（徽标外）；3：徽标文字"Steam"；4：翻到背面，可见"黑神话：悟空"、PS5 徽标、`评分 4 / 5`、"玩过 · 2025-08-20"、"豆瓣 ↗"，不含"Game Science"；5：2 列，正面不显示徽标（`hover: none`），翻面后背面有平台；6：出现"在玩"段（meta "1 款"）

**playwright_hint：** `const card = page.getByRole('button', { name: '《黑神话：悟空》' }); await card.hover(); await expect(card.getByLabel('平台：PS5')).toBeVisible()`

### TC-US03-23: 游戏无封面 / 加载失败占位

| covers | Priority | type |
|--------|----------|------|
| SC-SHELF-22 | P1 | ui-interaction |

**预期结果：** "某款老游戏"砖块宽高比 3:4，"断链游戏"（IGDB 返回 404）宽高比 810:1080，两者都显示 `role="img"` `aria-label="图片不可用"` 占位与游戏名；图片失败前后砖块尺寸不变（`boundingBox` 相同）；悬停显示平台徽标（PS4 / Switch 2），可翻面

---

## 追溯矩阵

| AC | Behaviors | TC |
|----|-----------|----|
| AC1 进入 /media | SC-SHELF-01 | TC-01, 14 |
| AC2 分类切换 / 页头 | SC-SHELF-02, 03, 13 | TC-02, 03, 18 |
| AC3 排序 | SC-SHELF-04 | TC-04 |
| AC4 条目内容 | SC-SHELF-05, 06, 07 | TC-05, 06, 13, 21 |
| AC5 豆瓣外链 | SC-SHELF-08 | TC-07 |
| AC6 无豆瓣不可点 | SC-SHELF-09 | TC-07 |
| AC7 隐藏 | SC-SHELF-10 | TC-03, 08 |
| AC8 封面占位 | SC-SHELF-11 | TC-15 |
| AC9 空状态 | SC-SHELF-12 | TC-16 |
| AC10 手机 | SC-SHELF-15 | TC-17 |
| AC11 重建 | SC-SHELF-18 | TC-12 |
| AC12 海报墙悬停与翻面 | SC-SHELF-19 | TC-11, 19 |
| AC13 按时间分段 | SC-SHELF-20 | TC-20, 22 |
| AC14 游戏海报墙 | SC-SHELF-21, 22 | TC-21, 22, 23 |
| 约束：预渲染 / 零豆瓣请求 / 未知分类 | SC-SHELF-14, 16, 17 | TC-09, 10, 11 |
