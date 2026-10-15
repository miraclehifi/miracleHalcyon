# 文章图片展示与灯箱 验收测试

**US ID**: US-10
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-10-image-lightbox/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-10-image-lightbox/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。灯箱组件 `Lightbox`（外壳）+ DepthCarousel（层叠）参数见 [components.md](../../../../../ui/components.md)"灯箱层叠参数"。图片组件沿用 F-001 `ArticleImage` / `ImageGallery` / `LiveBadge`。
> `hello` 共 12 张图片，第 12 张为不存在的 key。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US10-01 | SC-LIGHTBOX-01 | 读者页图片展示与预览一致 | P0 | e2e |
| TC-US10-02 | SC-LIGHTBOX-01 | 图片加载不引起布局偏移 | P1 | performance |
| TC-US10-03 | SC-LIGHTBOX-02 | 点击单图打开灯箱 | P0 | ui-interaction |
| TC-US10-04 | SC-LIGHTBOX-03 | 网格与手风琴中的点击 | P0 | ui-interaction |
| TC-US10-05 | SC-LIGHTBOX-04 | 键盘、按钮与滑动切换 | P0 | ui-interaction |
| TC-US10-06 | SC-LIGHTBOX-05 | 首尾边界 | P1 | ui-interaction |
| TC-US10-07 | SC-LIGHTBOX-06 | 四种关闭方式与焦点还原 | P0 | ui-interaction |
| TC-US10-08 | SC-LIGHTBOX-07 | 灯箱内实况照片播放 | P1 | ui-interaction |
| TC-US10-09 | SC-LIGHTBOX-08 | 焦点循环与减弱动效 | P1 | ui-interaction |
| TC-US10-10 | SC-LIGHTBOX-09 | 图片加载失败 | P1 | ui-interaction |
| TC-US10-11 | SC-LIGHTBOX-10 | 只有一张图片 | P2 | unit |
| TC-US10-12 | SC-LIGHTBOX-02 | 灯箱只在读者页启用 | P1 | e2e |

---

## 功能 / 接口测试

### TC-US10-01: 读者页图片展示与预览一致

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-01 |
| covers | SC-LIGHTBOX-01 |
| Scenario | 读者页图片展示与预览一致 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440 视口

**步骤：**
1. 访问 `/posts/hello`，读取各图片区块

**预期结果：**
- 第 1 张有图注"图注一"（`figcaption`）
- 宽图 `data-wide` 且宽度大于正文宽度
- 3 张网格 `figure[data-image-gallery]` 列数 3；5 张手风琴默认展开第 3 张
- 实况照片带 LIVE 标记，悬停 0.3s 后播放
- 每个图片容器在图片加载前已有 `aspect-ratio`

**清理：** 无（只读夹具）

---

### TC-US10-02: 图片加载不引起布局偏移

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-02 |
| covers | SC-LIGHTBOX-01 |
| Scenario | 图片加载不引起布局偏移 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | performance |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】390 视口，网络节流（Slow 4G）

**步骤：**
1. 用 `PerformanceObserver('layout-shift')` 记录 `/posts/hello` 加载过程

**预期结果：**
- 累计 CLS < 0.1

**清理：** 无（只读夹具）

---

### TC-US10-11: 只有一张图片

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-11 |
| covers | SC-LIGHTBOX-10 |
| Scenario | 只有一张图片 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 渲染 `Lightbox` 传入 1 张图片

**预期结果：**
- 计数"1 / 1"，不渲染"上一张""下一张"，←→ 无效

**清理：** 无（只读夹具）

---

### TC-US10-12: 灯箱只在读者页启用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-12 |
| covers | SC-LIGHTBOX-02 |
| Scenario | 灯箱只在读者页启用 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录，写文章页预览含图片

**步骤：**
1. 在预览中点击图片

**预期结果：**
- 预览中不打开灯箱（F-001 预览不传点击回调，仍是图片菜单行为）

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US10-03: 点击单图打开灯箱

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-03 |
| covers | SC-LIGHTBOX-02 |
| Scenario | 点击单图打开灯箱 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440 视口

**步骤：**
1. 点击第 1 张（单图）

**预期结果：**
- 出现 `role="dialog"`、`aria-modal="true"`、名称"图片查看"
- 显示计数"1 / 12"与图注"图注一"
- `body` 不可滚动（滚轮不改变 `scrollY`）

**playwright_hint：**
```ts
await page.getByRole('img', { name: /./ }).first().click();
const lb = page.getByRole('dialog', { name: '图片查看' });
await expect(lb.getByText('1 / 12')).toBeVisible();
```

**清理：** 无（只读夹具）

---

### TC-US10-04: 网格与手风琴中的点击

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-04 |
| covers | SC-LIGHTBOX-03 |
| Scenario | 网格与手风琴中的点击 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 点网格第 2 张；关闭；点手风琴未展开的第 1 张；再点它

**预期结果：**
- 网格第 2 张 → 灯箱"4 / 12"（第 1 张单图、第 2 张宽图之后）
- 手风琴（触屏）第一次轻点只展开该张，无灯箱；桌面悬停即展开（`trigger: "hover"`），点击即打开
- 再次点击已展开项 → 灯箱"6 / 12"

**清理：** 无（只读夹具）

---

### TC-US10-05: 键盘、按钮与滑动切换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-05 |
| covers | SC-LIGHTBOX-04 |
| Scenario | 键盘、按钮与滑动切换 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 灯箱显示"3 / 12"

**步骤：**
1. 按 →；点"上一张"；在 390 `hasTouch` 视口左滑一次

**预期结果：**
- 依次为"4 / 12""3 / 12""4 / 12"
- 图注随当前图片更新（无 title 的图片不显示图注）

**playwright_hint：**
```ts
await page.keyboard.press('ArrowRight');
await expect(lb.getByText('4 / 12')).toBeVisible();
```

**清理：** 无（只读夹具）

---

### TC-US10-06: 首尾边界

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-06 |
| covers | SC-LIGHTBOX-05 |
| Scenario | 首尾边界 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 打开第 1 张；按 ←；切到第 12 张；按 →

**预期结果：**
- 第 1 张时"上一张"`disabled`，← 无变化
- 第 12 张时"下一张"`disabled`，→ 无变化

**清理：** 无（只读夹具）

---

### TC-US10-07: 四种关闭方式与焦点还原

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-07 |
| covers | SC-LIGHTBOX-06 |
| Scenario | 四种关闭方式与焦点还原 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】键盘 Tab 到第 3 张图片并按 Enter 打开

**步骤：**
1. 分别用 Esc、关闭按钮、点遮罩、390 触屏下滑 120px 关闭（每种前重新打开）

**预期结果：**
- 灯箱消失
- 焦点回到第 3 张图片的可聚焦元素
- `body` 恢复滚动；下滑不足阈值时回弹不关闭

**playwright_hint：**
```ts
await page.keyboard.press('Escape');
await expect(lb).toBeHidden();
await expect(thirdImage).toBeFocused();
```

**清理：** 无（只读夹具）

---

### TC-US10-08: 灯箱内实况照片播放

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-08 |
| covers | SC-LIGHTBOX-07 |
| Scenario | 灯箱内实况照片播放 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 打开实况照片（第 11 张）；悬停 0.3s；移出
2. 390 触屏长按 600ms 后松开

**预期结果：**
- 悬停 / 长按时 `video` 播放（`paused === false`，`muted`）
- 移出 / 松开后暂停并回到首帧

**清理：** 无（只读夹具）

---

### TC-US10-09: 焦点循环与减弱动效

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-09 |
| covers | SC-LIGHTBOX-08 |
| Scenario | 焦点循环与减弱动效 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 灯箱已打开

**步骤：**
1. 连续按 Tab 10 次，记录焦点元素
2. `reducedMotion: 'reduce'` 下点"下一张"，读取层叠卡片的 transition

**预期结果：**
- 焦点始终在灯箱内（关闭、上一张、下一张循环）
- 减弱动效下无位移过渡（`transition-duration` 为 0 或无 gsap 补间）

**清理：** 无（只读夹具）

---

### TC-US10-10: 图片加载失败

| 字段 | 值 |
|------|------|
| TC-ID | TC-US10-10 |
| covers | SC-LIGHTBOX-09 |
| Scenario | 图片加载失败 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 在灯箱中切到第 12 张；点"重试"；再按 ←

**预期结果：**
- 显示"图片加载失败"与"重试"（`role="alert"` 只播报一次）
- 重试重新请求（URL 带 `?retry=1`）
- 可继续切换到第 11 张

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-LIGHTBOX-01 | TC-US10-01, TC-US10-02 |
| SC-LIGHTBOX-02 | TC-US10-03, TC-US10-12 |
| SC-LIGHTBOX-03 | TC-US10-04 |
| SC-LIGHTBOX-04 | TC-US10-05 |
| SC-LIGHTBOX-05 | TC-US10-06 |
| SC-LIGHTBOX-06 | TC-US10-07 |
| SC-LIGHTBOX-07 | TC-US10-08 |
| SC-LIGHTBOX-08 | TC-US10-09 |
| SC-LIGHTBOX-09 | TC-US10-10 |
| SC-LIGHTBOX-10 | TC-US10-11 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
