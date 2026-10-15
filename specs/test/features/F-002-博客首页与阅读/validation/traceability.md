# 追溯报告：F-002 博客首页与阅读

**生成日期**: 2026-10-16（Sprint 5 后重新追溯）

> 来源：各 US 的验收用例索引表（TC → SC）。追溯方式：① 测试名或注释中带 TC 编号且与该 US 的 SC 前缀一致（含 tests/ 与 specs/test/features/*/e2e/ 下 verify 阶段运行的 playwright-skill 脚本）；② Sprint 任务文件中列出的 TC 与测试文件；③ 以上都没有的，逐条阅读测试断言判断（Sprint 1 的测试按领域单元规格与接口契约组织，不带 TC 编号）。"部分覆盖"指测了主要结果、缺少用例里列出的部分边界或变体。

## 覆盖率

| 指标 | 数值 |
|------|------|
| 验收用例（不含已删除） | 83 |
| 已覆盖 | 82（98%） |
| 线上 / 人工 | 1（1%） |

## 按 User Story

| US | 已覆盖 | 部分覆盖 | 无测试 | 线上 / 人工 | 已删除 |
|----|----|----|----|----|----|
| US-01 | 9 | — | — | — | — |
| US-02 | 4 | — | — | — | — |
| US-03 | 9 | — | — | 1 | — |
| US-04 | 10 | — | — | — | — |
| US-05 | 6 | — | — | — | — |
| US-06 | 9 | — | — | — | — |
| US-07 | 11 | — | — | — | — |
| US-08 | 9 | — | — | — | — |
| US-09 | 3 | — | — | — | — |
| US-10 | 12 | — | — | — | — |

## 缺口明细

| TC | US | 优先级 | 类型 | 场景 | 状态 | 已有测试 | 说明 |
|----|----|------|------|------|------|---------|------|
| TC-US03-10 | US-03 | P1 | performance | 线上发布到可见时长 | 线上 / 人工 | — | 线上发布到可见时长，部署后实测 |

## 全部用例

<details><summary>展开（83 条）</summary>

| TC | SC | 场景 | 状态 | 测试 |
|----|----|------|------|------|
| TC-US04-01 | SC-BROWSE-01 | 按发布日期倒序与总数 | 已覆盖 | `tests/e2e/reader-post-list.spec.ts` |
| TC-US04-02 | SC-BROWSE-02 | 卡片内容与链接 | 已覆盖 | `tests/e2e/reader-post-list.spec.ts`<br>`tests/unit/reader/cards.test.ts` |
| TC-US04-03 | SC-BROWSE-03 | 摘要来源与纯文本截取 | 已覆盖 | `tests/e2e/reader-post-card.spec.ts`<br>`tests/unit/reader/excerpt.test.ts` |
| TC-US04-04 | SC-BROWSE-03 | 摘要最多 3 行 | 已覆盖 | `tests/e2e/reader-post-card.spec.ts` |
| TC-US04-05 | SC-BROWSE-04 | 封面显示与无封面布局 | 已覆盖 | `tests/e2e/reader-post-card.spec.ts`<br>`tests/unit/components/post-card.test.tsx` |
| TC-US04-06 | SC-BROWSE-05 | 分页导航 | 已覆盖 | `tests/e2e/reader-post-list.spec.ts`<br>`tests/unit/reader/cards.test.ts` |
| TC-US04-07 | SC-BROWSE-06, SC-BROWSE-07 | 非法页码 404 | 已覆盖 | `tests/e2e/reader-post-list.spec.ts` |
| TC-US04-08 | SC-BROWSE-08 | 空列表 | 已覆盖 | `tests/build/reader-output.test.ts` |
| TC-US04-09 | SC-BROWSE-09 | 悬停错位、触屏与减弱动效 | 已覆盖 | `tests/e2e/reader-post-card.spec.ts` |
| TC-US04-10 | SC-BROWSE-10 | 标签索引 | 已覆盖 | `tests/e2e/reader-tags.spec.ts`<br>`tests/unit/reader/tags.test.ts` |
| TC-US05-01 | SC-TAG-01 | 标签页内容与页头 | 已覆盖 | `tests/e2e/reader-tags.spec.ts` |
| TC-US05-02 | SC-TAG-02 | 大小写合并与规范地址 | 已覆盖 | `tests/e2e/reader-tags.spec.ts` |
| TC-US05-03 | SC-TAG-03 | 特殊字符标签 | 已覆盖 | `tests/e2e/reader-tags.spec.ts` |
| TC-US05-04 | SC-TAG-04 | 标签页分页 | 已覆盖 | `tests/e2e/reader-tags.spec.ts` |
| TC-US05-05 | SC-TAG-05 | 只在草稿中的标签 404 | 已覆盖 | `tests/e2e/reader-tags.spec.ts` |
| TC-US05-06 | SC-TAG-02, SC-TAG-03 | 标签地址与显示名纯函数 | 已覆盖 | `tests/unit/reader/tags.test.ts` |
| TC-US06-01 | SC-COVER-01 | 选择图片上传封面 | 已覆盖 | `tests/e2e/editor-cover.spec.ts` |
| TC-US06-02 | SC-COVER-02 | 拖入图片设置封面 | 已覆盖 | `tests/e2e/editor-cover.spec.ts`<br>`tests/unit/components/cover-field.test.tsx` |
| TC-US06-03 | SC-COVER-03 | 更换与移除 | 已覆盖 | `tests/e2e/editor-cover.spec.ts` |
| TC-US06-04 | SC-COVER-04 | 上传失败保留原封面 | 已覆盖 | `tests/e2e/editor-cover.spec.ts` |
| TC-US06-05 | SC-COVER-05 | 已发布文章改封面 → 有未发布修改 | 已覆盖 | `tests/e2e/editor-cover.spec.ts`<br>`tests/integration/post/cover.test.ts` |
| TC-US06-06 | SC-COVER-06 | 接口返回 cover 字段 | 已覆盖 | `tests/integration/post/cover.test.ts` |
| TC-US06-07 | SC-COVER-07 | 动态照片作封面只传静态图 | 已覆盖 | `tests/e2e/editor-cover.spec.ts` |
| TC-US06-08 | SC-COVER-08 | 封面字段校验 | 已覆盖 | `tests/integration/post/cover.test.ts`<br>`tests/unit/post/cover.test.ts` |
| TC-US06-09 | SC-COVER-06 | 迁移后旧文章 cover 为 null | 已覆盖 | `tests/integration/post/cover.test.ts`<br>`tests/unit/post/cover.test.ts` |
| TC-US07-01 | SC-ARTICLE-01 | 读者页正文与预览同一渲染 | 已覆盖 | `tests/unit/reader/article-html.test.ts` |
| TC-US07-02 | SC-ARTICLE-01 | 详情页正文结构 | 已覆盖 | `tests/e2e/reader-article.spec.ts`<br>`tests/unit/reader/article-html.test.ts` |
| TC-US07-03 | SC-ARTICLE-02 | 代码高亮随主题切换 | 已覆盖 | `tests/e2e/reader-typography.spec.ts` |
| TC-US07-04 | SC-ARTICLE-03 | 标题区日期、字数与阅读时长、更新于、标签 | 已覆盖 | `tests/e2e/reader-article.spec.ts`<br>`tests/unit/reader/reading-stats.test.ts` |
| TC-US07-05 | SC-ARTICLE-03 | 更新于与字数纯函数 | 已覆盖 | `tests/unit/reader/reading-stats.test.ts` |
| TC-US07-06 | SC-ARTICLE-04 | 段首缩进与首字下沉 | 已覆盖 | `tests/e2e/reader-typography.spec.ts`<br>`tests/unit/reader/article-html.test.ts` |
| TC-US07-07 | SC-ARTICLE-05 | 首段不是文字时不下沉 | 已覆盖 | `tests/e2e/reader-typography.spec.ts`<br>`tests/unit/reader/article-html.test.ts` |
| TC-US07-08 | SC-ARTICLE-06 | 引用署名 | 已覆盖 | `tests/e2e/reader-typography.spec.ts` |
| TC-US07-09 | SC-ARTICLE-06 | 署名识别规则 | 已覆盖 | `tests/unit/markdown/quote-attribution.test.ts` |
| TC-US07-10 | SC-ARTICLE-07 | 正文 HTML 清洗 | 已覆盖 | `tests/unit/reader/article-html.test.ts` |
| TC-US07-11 | SC-ARTICLE-08 | 草稿 slug 与不存在 slug 404 | 已覆盖 | `tests/e2e/reader-article.spec.ts` |
| TC-US08-01 | SC-SIDEBAR-01 | 宽屏三栏结构 | 已覆盖 | `tests/e2e/reader-navigation.spec.ts`<br>`tests/e2e/reader-toc.spec.ts` |
| TC-US08-02 | SC-SIDEBAR-02 | 同标签文章排序与上限 | 已覆盖 | `tests/unit/reader/navigation.test.ts` |
| TC-US08-03 | SC-SIDEBAR-03 | 无同标签文章时不显示 | 已覆盖 | `tests/e2e/reader-navigation.spec.ts` |
| TC-US08-04 | SC-SIDEBAR-04 | 阅读进度 | 已覆盖 | `tests/e2e/reader-toc.spec.ts`<br>`tests/unit/reader/reading.test.ts` |
| TC-US08-05 | SC-SIDEBAR-05 | 目录高亮与点击跳转 | 已覆盖 | `tests/e2e/reader-toc.spec.ts`<br>`tests/unit/reader/reading.test.ts` |
| TC-US08-06 | SC-SIDEBAR-06 | 减弱动效直接跳转 | 已覆盖 | `tests/e2e/reader-toc.spec.ts`<br>`tests/unit/reader/reading.test.ts` |
| TC-US08-07 | SC-SIDEBAR-07, SC-SIDEBAR-09 | 窄屏进度条、目录抽屉与同标签移到文末 | 已覆盖 | `tests/e2e/reader-toc.spec.ts` |
| TC-US08-08 | SC-SIDEBAR-08 | 无标题时不显示目录 | 已覆盖 | `tests/e2e/reader-toc.spec.ts` |
| TC-US08-09 | SC-SIDEBAR-05 | 目录数据纯函数 | 已覆盖 | `tests/unit/reader/article-html.test.ts` |
| TC-US09-01 | SC-PREVNEXT-01, SC-PREVNEXT-05 | 文末相邻文章（跳过草稿与已撤回） | 已覆盖 | `tests/e2e/reader-navigation.spec.ts` |
| TC-US09-02 | SC-PREVNEXT-02, SC-PREVNEXT-03 | 首尾只显示一侧 | 已覆盖 | `tests/e2e/reader-navigation.spec.ts` |
| TC-US09-03 | SC-PREVNEXT-04 | 相邻计算纯函数 | 已覆盖 | `tests/unit/reader/navigation.test.ts` |
| TC-US10-01 | SC-LIGHTBOX-01 | 读者页图片展示与预览一致 | 已覆盖 | `tests/e2e/reader-images.spec.ts`<br>`tests/unit/reader/article-images.test.ts` |
| TC-US10-02 | SC-LIGHTBOX-01 | 图片加载不引起布局偏移 | 已覆盖 | `tests/e2e/reader-images.spec.ts` |
| TC-US10-03 | SC-LIGHTBOX-02 | 点击单图打开灯箱 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts`<br>`tests/unit/components/lightbox.test.tsx` |
| TC-US10-04 | SC-LIGHTBOX-03 | 网格与手风琴中的点击 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts`<br>`tests/unit/reader/article-images.test.ts` |
| TC-US10-05 | SC-LIGHTBOX-04 | 键盘、按钮与滑动切换 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts` |
| TC-US10-06 | SC-LIGHTBOX-05 | 首尾边界 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts` |
| TC-US10-07 | SC-LIGHTBOX-06 | 四种关闭方式与焦点还原 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts` |
| TC-US10-08 | SC-LIGHTBOX-07 | 灯箱内实况照片播放 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts` |
| TC-US10-09 | SC-LIGHTBOX-08 | 焦点循环与减弱动效 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts`<br>`tests/unit/components/lightbox.test.tsx` |
| TC-US10-10 | SC-LIGHTBOX-09 | 图片加载失败 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts` |
| TC-US10-11 | SC-LIGHTBOX-10 | 只有一张图片 | 已覆盖 | `tests/unit/components/lightbox.test.tsx` |
| TC-US10-12 | SC-LIGHTBOX-02 | 灯箱只在读者页启用 | 已覆盖 | `tests/e2e/reader-lightbox.spec.ts` |
| TC-US01-01 | SC-SHELL-01 | 桌面顶栏导航项、外链属性与当前项高亮 | 已覆盖 | `tests/e2e/reader-shell.spec.ts` |
| TC-US01-02 | SC-SHELL-02 | 主题翻转（扩散动画）并跨页保持 | 已覆盖 | `tests/e2e/reader-theme.spec.ts`<br>`tests/unit/reader/theme-toggle.test.ts` |
| TC-US01-03 | SC-SHELL-03 | 首屏即为已选主题（不闪烁） | 已覆盖 | `tests/e2e/reader-theme.spec.ts` |
| TC-US01-04 | SC-SHELL-04 | 跟随系统时随系统切换 | 已覆盖 | `tests/e2e/reader-theme.spec.ts` |
| TC-US01-05 | SC-SHELL-05 | 手机顶栏图标化与触控尺寸 | 已覆盖 | `tests/e2e/reader-shell.spec.ts` |
| TC-US01-06 | SC-SHELL-06, SC-SHELL-07 | 子页 `> cd ..` 目标与首页不显示 | 已覆盖 | `tests/e2e/reader-shell.spec.ts` |
| TC-US01-07 | SC-SHELL-08 | 未知路径返回 404 页 | 已覆盖 | `tests/e2e/reader-shell.spec.ts` |
| TC-US01-08 | SC-SHELL-09 | 读者端无后台入口 | 已覆盖 | `tests/e2e/reader-shell.spec.ts` |
| TC-US01-09 | SC-SHELL-02 | 读者页无交互区域不加载 React 运行时 | 已覆盖 | `tests/build/reader-output.test.ts` |
| TC-US02-01 | SC-HOME-01 | 首页内容来自配置且不列文章 | 已覆盖 | `tests/e2e/reader-home.spec.ts` |
| TC-US02-02 | SC-HOME-02 | 社交链接新标签页、邮箱为 mailto | 已覆盖 | `tests/e2e/reader-home.spec.ts` |
| TC-US02-03 | SC-HOME-03 | 空配置项不渲染 | 已覆盖 | `tests/e2e/reader-home.spec.ts`<br>`tests/unit/reader/site-config.test.ts` |
| TC-US02-04 | SC-HOME-04 | 非法配置让构建失败 | 已覆盖 | `tests/unit/reader/site-config.test.ts` |
| TC-US03-01 | SC-REBUILD-01 | 读者路由全部预渲染 | 已覆盖 | `tests/build/reader-output.test.ts` |
| TC-US03-02 | SC-REBUILD-02 | 发布成功后调用 Deploy Hook 一次 | 已覆盖 | `tests/integration/post/rebuild-hook.test.ts`<br>`tests/unit/rebuild/deploy-hook.test.ts` |
| TC-US03-03 | SC-REBUILD-03 | 发布更新、撤回、删除已发布文章各触发一次 | 已覆盖 | `tests/integration/post/rebuild-hook.test.ts` |
| TC-US03-04 | SC-REBUILD-04 | 删除从未发布的草稿不触发 | 已覆盖 | `tests/integration/post/rebuild-hook.test.ts` |
| TC-US03-05 | SC-REBUILD-05 | Deploy Hook 失败不影响发布 | 已覆盖 | `tests/integration/post/rebuild-hook.test.ts`<br>`tests/unit/rebuild/deploy-hook.test.ts` |
| TC-US03-06 | SC-REBUILD-06 | 未配置 Deploy Hook 时静默跳过 | 已覆盖 | `tests/integration/post/rebuild-hook.test.ts`<br>`tests/unit/rebuild/deploy-hook.test.ts` |
| TC-US03-07 | SC-REBUILD-07 | 空数据构建成功 | 已覆盖 | `tests/build/reader-output.test.ts` |
| TC-US03-08 | SC-REBUILD-08 | 数据源不可用时构建失败 | 已覆盖 | `tests/unit/reader/data-source.test.ts:49` |
| TC-US03-09 | SC-REBUILD-09 | 草稿与已撤回内容不进入产物 | 已覆盖 | `tests/build/reader-output.test.ts` |
| TC-US03-10 | SC-REBUILD-02 | 线上发布到可见时长 | 线上 / 人工 | — |

</details>
