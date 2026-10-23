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
| UT-16 | `MediaPosterWall` / `MediaPoster` 交互 | 只允许一张翻开（翻 B 时 A 的 `aria-pressed` 回 `false`）；Esc 翻回；未翻开时"豆瓣 ↗" `tabIndex=-1` 且 `aria-hidden`，翻开后可聚焦；无 `doubanUrl` 不渲染链接；背面不含 `creator` 文本；正面不渲染状态徽标；"按时间"按钮切换 `aria-pressed` 并写 `localStorage` `media:by-time`，`localStorage` 抛错时按关闭渲染；切换时已翻开的海报翻回 | SC-SHELF-19、20 |
| UT-17 | `posterAspect(type, cover)`（`src/lib/reader/shelf.ts`） | `movie` / `series` → `2 / 3`（不看封面宽高）；`game` + `{ width: 810, height: 1080 }` → `810 / 1080`；`game` + 600×900 → `600 / 900`；`game` 无封面或宽高缺失 → `3 / 4`；宽或高为 0 → `3 / 4` | SC-SHELF-21、22 |
| UT-18 | 游戏海报与 `PlatformBadge` | `PlatformBadge platform=…` 5 种：文字依次 PS5 / PS4 / Switch / Switch 2 / Steam，`aria-label="平台：…"`，PS5 / PS4 用 PlayStation 标志、Switch / Switch 2 用 Switch 标志、Steam 用 Steam 标志（按 `data-icon` 断言）；`MediaPoster` 游戏模式：正面不渲染名称浮层（无 `data-poster-caption`），渲染默认隐藏的徽标容器；背面渲染徽标、不含 `creator`；`<img>` 为 `object-fit: contain` 且带 `width` / `height` 属性；无封面时占位显示游戏名、徽标容器仍在；电影模式不渲染徽标 | SC-SHELF-21、22 |
| UT-19 | 条目表单游戏字段 | 分类 `game`：渲染"平台"下拉（默认 `ps5`，选项顺序 ps5 / ps4 / switch / switch2 / steam）与"封面链接（IGDB）"输入，不渲染上传按钮；分类改为 `book`：两者隐藏、上传恢复，再改回 `game` 时平台与链接值保留；前端校验 `https://example.com/a.jpg` → "请粘贴 images.igdb.com 的封面图片地址"、空串通过；提交 `fields` 在 `game` 时含 `platform`、`coverUrl`，非游戏时不含 | SC-MANAGE-23、24、25 |

读者页组件为 Astro 组件时，UT-06、12、13 改由 build 用例（acceptance US-03）覆盖，不强行写成 React 单测；海报墙是 React 岛，UT-16、UT-18 在 jsdom 中测（Masonry 依赖 `ResizeObserver` / `IntersectionObserver`，测试里打桩并让砖块立即显示）。
