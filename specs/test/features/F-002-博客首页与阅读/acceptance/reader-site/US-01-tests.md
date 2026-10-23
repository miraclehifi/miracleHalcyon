# 读者端外壳 验收测试

**US ID**: US-01
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/reader-site/US-01-reader-shell/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/reader-site/US-01-reader-shell/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。数据见 [_fixtures.md](../_fixtures.md) `reader-fixture`；组件名以 design-ui 为准。
> 导航结构见 [site-map.md](../../../../../ui/site-map.md)"全局导航"。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US01-01 | SC-SHELL-01 | 桌面顶栏导航项、外链属性与当前项高亮 | P0 | e2e |
| TC-US01-02 | SC-SHELL-02 | 主题翻转（扩散动画）并跨页保持 | P0 | ui-interaction |
| TC-US01-03 | SC-SHELL-03 | 首屏即为已选主题（不闪烁） | P1 | e2e |
| TC-US01-04 | SC-SHELL-04 | 跟随系统时随系统切换 | P1 | e2e |
| TC-US01-05 | SC-SHELL-05 | 手机顶栏图标化与触控尺寸 | P1 | ui-interaction |
| TC-US01-06 | SC-SHELL-06, SC-SHELL-07 | 子页 `> cd ..` 目标与首页不显示 | P0 | ui-interaction |
| TC-US01-07 | SC-SHELL-08 | 未知路径返回 404 页 | P0 | e2e |
| TC-US01-08 | SC-SHELL-09 | 读者端无后台入口 | P1 | e2e |
| TC-US01-09 | SC-SHELL-02 | 读者页无交互区域不加载 React 运行时 | P1 | performance |

---

## 功能 / 接口测试

### TC-US01-01: 桌面顶栏导航项、外链属性与当前项高亮

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-01 |
| covers | SC-SHELL-01 |
| Scenario | 桌面顶栏导航项、外链属性与当前项高亮 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440×900 视口

**步骤：**
1. 访问 `/posts/hello`、`/tags/astro`、`/posts`、`/`，各自读取顶栏

**预期结果：**
- 顶栏依次为：站点名（`href="/"`）、文章、书影音（`/media`）、摄影、GitHub、RSS（`/rss.xml`）、主题切换
- `/posts`、`/posts/hello`、`/tags/astro` 上"文章"带 `aria-current="page"`；`/` 上没有任何项带 `aria-current`
- GitHub 链接 `target="_blank"`、`rel` 含 `noopener`、`noreferrer`
- 夹具中摄影站为空 → 不显示摄影链接（与 TC-US02-03 一致）

**清理：** 无（只读夹具）

---

### TC-US01-03: 首屏即为已选主题（不闪烁）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-03 |
| covers | SC-SHELL-03 |
| Scenario | 首屏即为已选主题（不闪烁） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】`colorScheme: 'light'`；`addInitScript` 预写 localStorage 主题为暗色

**步骤：**
1. 访问 `/posts/hello`，在 `DOMContentLoaded` 前（`page.on('domcontentloaded')` 之前的首个 `evaluate`）读取 `html` 标记

**预期结果：**
- `html` 在首次绘制前已带暗色标记（主题脚本内联在 `<head>`，不等待模块脚本）

**清理：** 无（只读夹具）

---

### TC-US01-04: 跟随系统时随系统切换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-04 |
| covers | SC-SHELL-04 |
| Scenario | 跟随系统时随系统切换 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】主题设为"跟随系统"，`colorScheme: 'light'`

**步骤：**
1. `page.emulateMedia({ colorScheme: 'dark' })`

**预期结果：**
- 无需刷新，页面背景变为暗色令牌；按钮名称仍为"主题：跟随系统"

**清理：** 无（只读夹具）

---

### TC-US01-07: 未知路径返回 404 页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-07 |
| covers | SC-SHELL-08 |
| Scenario | 未知路径返回 404 页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 路径 | `/media/music`（2026-10-22 F-005 上线 `/media`，改用未生成的分类）、`/rss.xml`、`/nope`、`/posts/nope/extra` |

**步骤：**
1. 逐个 `page.goto` 并记录响应状态

**预期结果：**
- 状态码 404
- 页面有读者端顶栏、标题"页面不存在"与"回首页"链接（`href="/"`）
- `/admin/**` 不受影响（仍按 F-001 跳转登录）

**清理：** 无（只读夹具）

---

### TC-US01-08: 读者端无后台入口

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-08 |
| covers | SC-SHELL-09 |
| Scenario | 读者端无后台入口 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 遍历 `/`、`/posts`、`/posts/hello`、`/tags/astro`、404 页，收集所有 `a[href]`

**预期结果：**
- 没有 `href` 以 `/admin` 开头的链接

**清理：** 无（只读夹具）

---

### TC-US01-09: 读者页无交互区域不加载 React 运行时

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-09 |
| covers | SC-SHELL-02 |
| Scenario | 读者页无交互区域不加载 React 运行时 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | performance |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】构建产物

**步骤：**
1. 访问 `/`，记录加载的脚本

**预期结果：**
- 只有内联主题脚本与顶栏所需的小脚本，不加载 React 运行时（全局 NFR"读者页面 JS 体积"）

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US01-02: 主题翻转（扩散动画）并跨页保持

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-02 |
| covers | SC-SHELL-02 |
| Scenario | 主题翻转（扩散动画）并跨页保持 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建；2026-10-15 v1.1 三态改两态 + 扩散动画（[animated-theme-toggle](../../../../../backlog/animated-theme-toggle.md)） |

**前置条件：**
- 【环境前置】`colorScheme: 'light'`，清空 localStorage

**步骤：**
1. 访问 `/posts`，点主题切换，切换过程中读取 `html` 是否带过渡标记；再点一次
2. 选"暗色"后刷新，再进入 `/posts/hello`
3. 以 `reducedMotion: 'reduce'` 再点一次

**预期结果：**
- 初始名称"主题：亮色"（跟随系统亮色）；点击后依次为"主题：暗色""主题：亮色"
- 支持 View Transitions 的浏览器在切换中 `html` 带 `data-theme-vt="active"`，动画结束后移除
- 减少动效时立即切换，不出现过渡标记
- 暗色时 `html` 带暗色标记（`data-theme="dark"`，以 design-ui 为准），背景色为暗色令牌
- 刷新与换页后仍为暗色

**playwright_hint：**
```ts
const toggle = page.getByRole('button', { name: /^主题：/ });
await toggle.click();
await expect(toggle).toHaveAccessibleName('主题：暗色');
await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
```

**清理：** 无（只读夹具）

---

### TC-US01-05: 手机顶栏图标化与触控尺寸

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-05 |
| covers | SC-SHELL-05 |
| Scenario | 手机顶栏图标化与触控尺寸 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】390×844 视口，`hasTouch: true`

**步骤：**
1. 访问 `/posts`，读取顶栏所有可见链接与按钮

**预期结果：**
- 文章、书影音显示为图标，可访问名称分别为"文章""书影音"
- GitHub、RSS 不可见
- 每个可见可点元素的 `boundingBox` 宽高 ≥ 44

**playwright_hint：**
```ts
for (const el of await page.getByRole('banner').locator('a:visible, button:visible').all()) {
  const box = await el.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}
```

**清理：** 无（只读夹具）

---

### TC-US01-06: 子页 `> cd ..` 目标与首页不显示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-06 |
| covers | SC-SHELL-06, SC-SHELL-07 |
| Scenario | 子页 `> cd ..` 目标与首页不显示 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440 视口

**步骤：**
1. 在 `/posts/hello`、`/posts`、`/tags/astro`、`/posts/page/2`、`/` 分别查找 `> cd ..` 链接

**预期结果：**
- `/posts/hello` → `href="/posts"`
- `/posts`、`/tags/astro`、`/posts/page/2` → `href="/"`
- `/` 不存在该链接

**playwright_hint：**
```ts
await expect(page.getByRole('link', { name: '> cd ..' })).toHaveAttribute('href', '/posts');
```

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-SHELL-01 | TC-US01-01 |
| SC-SHELL-02 | TC-US01-02, TC-US01-09 |
| SC-SHELL-03 | TC-US01-03 |
| SC-SHELL-04 | TC-US01-04 |
| SC-SHELL-05 | TC-US01-05 |
| SC-SHELL-06 | TC-US01-06 |
| SC-SHELL-07 | TC-US01-06 |
| SC-SHELL-08 | TC-US01-07 |
| SC-SHELL-09 | TC-US01-08 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
