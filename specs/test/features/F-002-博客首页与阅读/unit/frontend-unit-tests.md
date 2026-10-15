# F-002 博客首页与阅读 前端组件单元测试规格

**Feature**: F-002-博客首页与阅读
**最后更新**: 2026-10-15
**Version Tag**: v1.0
**技术假设**: React 19 + Vitest 4.1（`unit` 项目，jsdom）+ @testing-library/react + user-event；Astro 组件用 `experimental_AstroContainer` 渲染为字符串断言

> **层级定位**：组件隔离层。不启动浏览器、不依赖后端与构建。端到端交互见 `acceptance/` 各 US。
> **编号**：UT-201 起，避免与 F-001 的 UT-01…152 重号。组件名以 design-ui / [components.md](../../../../ui/components.md) 为准，改名时只同步本文件组件标题。
> 纯函数（`excerptOf`、`tagSlug`、`groupTags`、`relatedPosts`、`extractToc`、`adjacentPosts`、`updatedDate`、`normalizeSiteConfig`）的用例写在验收文件的 `type: unit` TC 中，此处不重复。

---

## 约定

| 项 | 约定 |
|------|------|
| 分类 | R = 渲染；S = 内部状态 / 交互逻辑；A = 可访问性 |
| covers | 关联的 SC-ID |
| 独立性 | 每条用例独立 render；`afterEach` 清理 DOM、localStorage、`matchMedia` mock、fake timers |

---

## 1. ThemeToggle

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-201 | S | 轮换 | 初始\"亮色\"，点击依次为暗色 → 跟随系统 → 亮色；每次写入 localStorage 并设置 `html` 标记 | SC-SHELL-02 |
| UT-202 | S | 跟随系统 | 选\"跟随系统\"后 `matchMedia('(prefers-color-scheme: dark)')` 触发 change → `html` 标记随之变化；选亮 / 暗后不再跟随 | SC-SHELL-04 |
| UT-203 | S | 存储不可用 | localStorage 读写抛错时仍可切换（只在本次会话生效），不抛出 | SC-SHELL-02 |
| UT-204 | A | 名称 | 按钮可访问名称为\"主题：{当前}\"，图标 `aria-hidden` | SC-SHELL-02 |

## 2. ReaderHeader（Astro）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-205 | R | 当前项 | `current="posts"` 时\"文章\"带 `aria-current="page"`；`current` 为空时都没有 | SC-SHELL-01 |
| UT-206 | R | 外链与空配置 | GitHub / 摄影 `target="_blank" rel="noopener noreferrer"`；配置为空的项不渲染 | SC-SHELL-01, SC-HOME-03 |

## 3. PostCard（Astro）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-207 | R | 完整卡片 | 标题链接 `/posts/:slug`、摘要、`time[datetime]`、标签链接 `/tags/{tagSlug}`；标签链接不嵌套在标题链接内 | SC-BROWSE-02 |
| UT-208 | R | 封面 | 有 cover：`img` 128×128、`loading="lazy"`、`alt=""`、`decoding="async"`；无 cover：不渲染 `img` 与占位 | SC-BROWSE-04 |
| UT-209 | R | 无摘要 | 摘要为空字符串时不渲染摘要元素 | SC-BROWSE-03 |

## 4. Pagination（Astro）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-210 | R | 链接规则 | `base="/posts"`：第 1 页链接为 `/posts`，第 n 页为 `/posts/page/n`；标签页 base 同理 | SC-BROWSE-05, SC-TAG-04 |
| UT-211 | R | 首尾 | 第 1 页\"上一页\"为不可用（`aria-disabled="true"`，非链接）；末页\"下一页\"同理；总页数 1 时不渲染 | SC-BROWSE-05, SC-BROWSE-08 |
| UT-212 | A | 地标 | `nav` 名称\"分页\"，当前页 `aria-current="page"` | SC-BROWSE-05 |

## 5. ReadingProgress / TableOfContents

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-213 | S | 进度计算 | 纯函数 `progressOf(scrollY, articleTop, articleHeight, viewport)`：正文顶部之前为 0，正文底部到达视口底部为 100，中间线性、取整、夹在 0–100 | SC-SIDEBAR-04 |
| UT-214 | S | 当前章节 | 给定各标题 top 与阅读线位置，返回最后一个越过阅读线的标题；都未越过时返回第一个 | SC-SIDEBAR-05 |
| UT-215 | S | 点击跳转 | 点目录项调用 `scrollIntoView`（减弱动效时 `behavior: 'auto'`，否则 `smooth`），并 `history.replaceState` 更新 hash | SC-SIDEBAR-05, SC-SIDEBAR-06 |
| UT-216 | R | 空目录 | 条目为空时不渲染目录与\"目录\"按钮，进度照常渲染 | SC-SIDEBAR-08 |
| UT-217 | A | 进度与目录语义 | 进度 `role="progressbar"`、名称\"阅读进度\"、`aria-valuenow`；目录 `nav` 名称\"目录\"，当前项 `aria-current="true"` | SC-SIDEBAR-04, SC-SIDEBAR-05 |

## 6. TocDrawer（窄屏目录）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-218 | S | 开关 | 点\"目录\"打开 `dialog`\"目录\"，焦点到第一项；Esc / 点遮罩关闭，焦点回按钮；点目录项后关闭并跳转 | SC-SIDEBAR-07, SC-SIDEBAR-09 |
| UT-219 | A | 触控尺寸 | \"目录\"按钮与抽屉内条目最小高度 44px（类名 / 计算样式断言） | SC-SIDEBAR-07 |

## 7. Lightbox

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-220 | R | 初始 | `open` + `index=2` + 12 张：`dialog` 名称\"图片查看\"、`aria-modal`、计数\"3 / 12\"、当前图注 | SC-LIGHTBOX-02 |
| UT-221 | S | 切换与边界 | ← / → / 按钮切换；首张\"上一张\"disabled，末张\"下一张\"disabled；1 张时不渲染两个按钮 | SC-LIGHTBOX-04, SC-LIGHTBOX-05, SC-LIGHTBOX-10 |
| UT-222 | S | 关闭 | Esc、关闭按钮、点遮罩都调用 `onClose`；点图片本身不关闭 | SC-LIGHTBOX-06 |
| UT-223 | S | 下滑关闭 | 指针向下拖动超过阈值（120px 或速度 > 0.5px/ms）松开 → `onClose`；不足阈值回弹不关闭；横向拖动切换图片 | SC-LIGHTBOX-04, SC-LIGHTBOX-06 |
| UT-224 | S | 滚动锁 | 打开时 `body` `overflow: hidden`（保留滚动条宽度补偿），关闭后恢复原值 | SC-LIGHTBOX-02 |
| UT-225 | A | 焦点陷阱 | 打开时焦点到关闭按钮；Tab / Shift+Tab 在灯箱内循环 | SC-LIGHTBOX-08 |
| UT-226 | S | 减弱动效 | `prefers-reduced-motion: reduce` 时不创建 gsap 补间，直接设置位置 | SC-LIGHTBOX-08 |
| UT-227 | R | 加载失败 | 当前图片 `error` → 显示\"图片加载失败\"与\"重试\"；重试后 src 带 `?retry=1` | SC-LIGHTBOX-09 |

## 8. ArticleImages（读者页图片岛，接灯箱）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-228 | S | 图片索引 | 按正文顺序为单图、网格单元格、手风琴项、实况照片编号；点击网格第 2 张 → 打开灯箱 index 3（0 起） | SC-LIGHTBOX-02, SC-LIGHTBOX-03 |
| UT-229 | S | 手风琴点击 | 未展开项点击只展开；已展开项点击打开灯箱（`onActiveClick`） | SC-LIGHTBOX-03 |
| UT-230 | S | 焦点还原 | 灯箱关闭后焦点回到触发的图片元素 | SC-LIGHTBOX-06 |

## 9. CoverField（写文章页设置抽屉，F-001 增量）

| UT-ID | 类 | 用例 | 预期 | covers |
|------|------|------|------|------|
| UT-231 | R | 空 / 有封面 | 无封面：\"选择图片\"与拖放区；有封面：缩略图（`alt="封面"`）、\"更换\"\"移除\" | SC-COVER-01, SC-COVER-03 |
| UT-232 | S | 上传流程 | 选择文件 → 校验（复用 `validateFile`）→ \"上传中…\" → 成功调用 `onChange(url)`；失败显示错误、不调用 `onChange` | SC-COVER-01, SC-COVER-04 |
| UT-233 | S | 移除 | 点\"移除\"调用 `onChange(null)`，不调用删除接口 | SC-COVER-03 |
| UT-234 | S | 拖放 | `dragenter` 设 `data-dragover`，`dragleave` / `drop` 清除；多文件只取第一张图片 | SC-COVER-02 |
| UT-235 | S | 动态照片 | JPEG 动态照片只上传静态部分（复用 `extractMotionPhoto`，不调用视频处理） | SC-COVER-07 |
| UT-236 | A | 标签与错误 | 文件输入可访问名称\"选择封面图片\"；错误 `role="alert"` | SC-COVER-01, SC-COVER-04 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
