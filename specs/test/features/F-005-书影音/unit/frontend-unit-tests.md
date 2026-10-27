# F-005 前端单元测试规格

**最后更新**: 2026-10-23

> 组件隔离层（jsdom，不依赖后端）。端到端交互见 acceptance/。组件名在 design-ui 后以 [components.md](../../../../ui/components.md) 为准（已登记：`MediaTypeTab`、`MediaRow`、`MediaCard`、`MediaHeader`、`MediaList`；后台组件待 design-ui 补）。

| UT ID | 对象 | 用例 | 来源 |
|-------|------|------|------|
| UT-01 | `statusLabel(type, status)` | book/comic → 读过 / 在读；movie/series → 看过 / 在看；game/boardgame → 玩过 / 在玩；6 × 2 全覆盖 | SC-MANAGE-09、SC-SHELF-04 |
| UT-02 | `countLabel(type, total, inProgress)` | `(book, 10, 2)` → `10 本 · 在读 2`；`(movie, 5, 0)` → `5 部`；`(boardgame, 0, 0)` → `0 款`；`(series, 3, 1)` → `3 部 · 在看 1` | SC-SHELF-03、12 |
| UT-03 | `sortEntries` | 进行中在前、组内标记日期倒序、同日按创建时间倒序；输入顺序打乱结果不变；空数组 → 空数组 | SC-MANAGE-02、SC-SHELF-04 |
| UT-04 | `extractDoubanUrl(text)`（若前端预校验） | 取第一个豆瓣链接；中文标点结尾截断；无链接 → `null`；`douban.com.evil.example` → `null` | SC-RECOG-05、06、13 |
| UT-05 | `formatMarkedMonth` | `2026-10-01` → `2026-10` | shared-field-formats"标记年月" |
| UT-06 | 星级组件（`StarRating`） | `rating=4` → 5 颗星，前 4 颗点亮、第 5 颗为占位，`aria-label="评分 4 / 5"`；`readOnly` 且 `null` → 不渲染；可输入且 `null` → 5 颗全为占位（"未评分"） | SC-SHELF-05、07 |
| UT-07 | 条目表单校验 | 标题空白 → "请填写标题"；年份 `23` / `20231` → "年份为 4 位数字"；年份空 → 通过；评分只能为 1–5 或空 | SC-MANAGE-07、08 |
| UT-08 | 条目表单默认值 | `defaultType="movie"`、今天 2026-10-21 → 分类 movie、状态 completed、日期 2026-10-21 | SC-MANAGE-04 |
| UT-09 | 识别结果合并 `applyRecognized(form, result)` | 只覆盖 `fields` 中非 `null` 的条目字段；状态、评分、日期、短评永不变；`missing` 中的字段保持原值；返回被填入字段列表用于高亮与"已识别"文案 | SC-RECOG-07、08、22 |
| UT-10 | 识别提示文案 | `filled: [type,title,cover,creator]` → "已识别：分类、标题、封面、作者"；`missing: [year]` → "未识别：年份，请手动填写"；`missing: [cover]` → "未识别：封面，可手动上传"（`type: game` 时为"未识别：封面，游戏封面请粘贴 IGDB 图片链接"）；错误码 → 对应中文提示（NOT_DOUBAN_LINK / NOT_SUBJECT_LINK / FETCH_FAILED / PARSE_FAILED / 其他） | SC-RECOG-03、08、13–15 |
| UT-11 | 识别框 | 空白 → "识别"禁用；非空 → 可用并显示清空按钮；`loading` → `aria-busy="true"`、禁用 | SC-RECOG-01、16、17 |
| UT-12 | 封面占位 | 无 `cover` → 渲染占位（`role="img"`、`aria-label="图片不可用"`）；`<img>` 触发 `error` 后切换为占位，尺寸不变 | SC-SHELF-11 |
| UT-13 | `MediaRow` / `MediaCard` 链接 | 有 `doubanUrl` → 外层 `<a target="_blank" rel="noopener noreferrer">` + "豆瓣 ↗"；无 → 无 `<a>`、无"豆瓣 ↗" | SC-SHELF-08、09 |
| UT-14 | 删除确认框键盘 | 打开时焦点在"取消"；Tab 在框内循环；Esc 关闭并把焦点还给触发按钮 | SC-MANAGE-16 |
| UT-15 | `groupByTime(entries, today)`（`src/lib/reader/shelf-time.ts`） | today = 2026-10-22：进行中 → "在看"；2026-10-05 → "本月"；2026-09-30 → "上个月"；2026-03-01 → "本年"；2025-12-31 → "去年"；2024-06-01 → "2024"；单独输入 2026-11-01（晚于今天）→ "本月"；段顺序固定、空段不出现、段内按 `sortEntries`；meta（上述每段各 1 条）："10 月 · 1 部"、"9 月 · 1 部"、"2026 · 1 部"、"2025 · 1 部"、"1 部"。today = 2026-01-15：2025-12-20 → "上个月"（不是"去年"），2025-11-01 → "去年"；today 为 3 月 1 日、闰年 2 月 29 日 → "上个月"。游戏：进行中段标签"在玩"，量词"款"（"10 月 · 1 款"） | SC-SHELF-20 |
| UT-16 | `MediaPosterWall` / `MediaPoster` 交互 | 只允许一张翻开（翻 B 时 A 的 `aria-pressed` 回 `false`）；Esc 翻回；未翻开时"豆瓣 ↗" `tabIndex=-1` 且 `aria-hidden`，翻开后可聚焦；无 `doubanUrl` 不渲染链接；背面不含 `creator` 文本；正面不渲染状态徽标；"按时间"按钮切换 `aria-pressed` 并写 `localStorage` `media:by-time`（`"0"` / `"marked"` / `"release"`，读到旧值 `"1"` 视为 `"marked"`），`localStorage` 抛错时按关闭渲染；打开后渲染 `MediaTimeBasis`（文案随分类：看过时间 / 上映年份、看过时间 / 首播年份、玩过时间 / 发售年份），切换依据写入存储；切换开关或依据时已翻开的海报翻回 | SC-SHELF-19、20 |
| UT-17 | `posterAspect(type, cover)`（`src/lib/reader/shelf.ts`） | `book` / `comic` / `movie` / `series` → `2 / 3`（不看封面宽高）；`boardgame` → `1 / 1`；`game` + `{ width: 810, height: 1080 }` → `810 / 1080`；`game` + 600×900 → `600 / 900`；`game` 无封面或宽高缺失 → `3 / 4`；宽或高为 0 → `3 / 4` | SC-SHELF-21、22 |
| UT-18 | 游戏海报与 `PlatformBadge` | `YearBadge`：只渲染四位数字、`aria-hidden`；`PlatformBadge platform=…` 5 种：文字依次 PS5 / PS4 / Switch / Switch 2 / Steam，`aria-label="平台：…"`，PS5 / PS4 用 PlayStation 标志、Switch / Switch 2 用 Switch 标志、Steam 用 Steam 标志（按 `data-icon` 断言）；`MediaPoster` 游戏模式：正面不渲染名称浮层（无 `data-poster-caption`），渲染默认隐藏的左上角平台与右下角年份（无 `year` 不渲染年份）；背面不渲染平台、不含 `creator`；翻面控件 `aria-label="《名称》，PS5，2024"`；`<img>` 为 `object-fit: contain` 且带 `width` / `height` 属性；无封面时占位显示游戏名、徽标容器仍在；电影模式不渲染徽标 | SC-SHELF-21、22 |
| UT-19 | 条目表单游戏字段 | 分类 `game`：渲染"平台"下拉（默认 `ps5`，选项顺序 ps5 / ps4 / switch / switch2 / steam）与"封面链接（IGDB）"输入，不渲染上传按钮；分类改为 `book`：两者隐藏、上传恢复，再改回 `game` 时平台与链接值保留；前端校验 `https://example.com/a.jpg` → "请粘贴 images.igdb.com 的封面图片地址"、空串通过；提交 `fields` 在 `game` 时含 `platform`、`coverUrl`，非游戏时不含 | SC-MANAGE-23、24、25 |
| UT-20 | `isValidDoubanUid(uid)`（前后端共用） | `189806038`、`ahbei`、`a_b.c-d`、64 位 → true；空串、65 位、`../x`、`a/b`、`a?b`、`a%2Fb`、`张三`、含空格 → false | SC-IMPORT-02、20 |
| UT-21 | 导入顺序与进度 `importPlan` / 进度文案 | 步骤固定为 影视·看过 → 影视·在看 → 书·读过 → 书·在读 → 游戏·玩过 → 游戏·在玩；全量或该类无水位：进度"影视 · 看过 40 / 614"（已处理 = min(nextStart, total)）；增量且有水位："影视 · 看过 已同步 3 条"（累计 created + updated + failed）；汇总"导入完成：新增 3、更新 2、失败 1、封面失败 0"，增量前缀"同步完成："，停止时前缀"已停止："；`categorySyncLabel(categories, type)` 取该类别看过、在看两项 `syncedAt` 中较早者按本地时区格式化 `MM-dd HH:mm`，任一为空 → "未同步"；`hasAnySync(categories)` 决定默认按钮；`importPlan(types)` 只生成包含勾选类别的大类步骤，每步带该大类内勾选的 `types`（只勾漫画 → 只有 book 两步、`types: [comic]`；空 → 无步骤）；错误码 → 中文提示（VALIDATION_FAILED / DOUBAN_USER_NOT_FOUND / DOUBAN_FORBIDDEN / FETCH_FAILED / 其他）；失败原因 PARSE_FAILED → "解析不出条目信息" | SC-IMPORT-12、13、15、17–19 |
| UT-22 | 导入面板 | 6 个类别勾选项每次打开都全勾；全部取消 → "至少选择一个类别"且两个按钮禁用；打开时调用状态接口带出 ID 与各类别上次同步时间（接口失败时 ID 为空、只显示"全量导入"，不阻断）；无同步记录 → 只有"全量导入"；有 → 主按钮"同步新标记" + 次要"全量导入"；输入框改成与状态 `uid` 不同的 ID 时重新查询该 ID 的状态（防抖 300ms）；第 2 页起请求带第 1 页返回的 `head`；进行中输入框与两个导入按钮禁用、"停止"可用、进度区域 `aria-live="polite"`；错误用 `role="alert"` | SC-IMPORT-01、02、12、25、27 |
| UT-20 | `groupByReleaseYear(entries)`（`src/lib/reader/shelf-time.ts`） | 年份 2026、2024、2023、2023（在玩）、`null`：段顺序 2026 → 2024 → 2023 → "未知年份"；段内进行中在前、其余按标记日期倒序；晚于今年的年份照常成段；空输入 → 空数组；meta 量词随分类（游戏"款"、电影 / 剧集"部"）；不产生"在看 / 在玩"段 | SC-SHELF-23 |

读者页组件为 Astro 组件时，UT-06、12 改由 build 用例（acceptance US-03）覆盖，不强行写成 React 单测；UT-13（`MediaRow` / `MediaCard` 链接）随两组件废弃而作废，豆瓣链接由 UT-16 与 TC-US03-07 覆盖（2026-10-23 [media-wall-all-types](../../../../backlog/media-wall-all-types.md)）；海报墙是 React 岛，UT-16、UT-18 在 jsdom 中测（Masonry 依赖 `ResizeObserver` / `IntersectionObserver`，测试里打桩并让砖块立即显示）。
