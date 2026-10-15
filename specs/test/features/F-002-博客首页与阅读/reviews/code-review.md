# 代码审查报告：F-002 博客首页与阅读

## 摘要

- 审查日期：2026-10-15
- 审查范围：Sprint 4（21 个任务，含追加的 animate-theme-toggle、add-local-dev-script）；对 F-001 的增量（封面、Deploy Hook）计入 [F-001 审查报告](../../F-001-文章写作/reviews/code-review.md)
- 方式：单人模式结构化自审，与 F-001 一起审查（修复先在并行会话中完成，接手后补记本报告并跑回归）
- MUST-FIX：4 项（均已修复）
- CONCERN：2 项（1 项已修复，1 项保留）
- POSITIVE：5 项

## 审查维度

### 1. 安全

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/integrations/reader-data.ts`、构建产物检查 | 读者页只取已发布快照；`test:build` 确认构建产物不含草稿与已撤回文章，Worker 包不含读者数据 | POSITIVE | — |
| `src/lib/rebuild/deploy-hook.ts` | Deploy Hook 地址只放在 Secret 中，失败日志不打印地址 | POSITIVE | — |

### 2. 边界条件

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/lib/reader/article-html.ts` | 目录收录了引用、列表、脚注区里的 h2 / h3，并覆盖了脚注区标题原有的 id（`aria-describedby` 失效）；空标题也进了目录 | MUST-FIX | 已修复 |
| `src/components/reader/Lightbox.tsx` | 焦点在轮播区时按 ← / →：轮播自己切一张，事件冒泡到对话框又切一张，一次跳两张 | MUST-FIX | 已修复 |
| `src/components/reader/Lightbox.tsx` | 点图注、计数等不可聚焦区域后焦点落到 `body`，Esc 关闭与焦点陷阱失效 | MUST-FIX | 已修复 |
| `src/components/reader/Lightbox.tsx` | 灯箱懒加载，首次打开时初始焦点在 `useEffect` 中设置、晚于绘制：灯箱已可见但焦点仍在原图上，这段时间按 Esc 无效（WebKit 约 100ms；回归中 TC-US10-07 在 WebKit 上稳定复现） | MUST-FIX | 已修复 |

### 3. API 契约对齐

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/pages/api/posts/*` | 公开列表 / 详情新增 `cover`，与 api-contract 一致，F-001 集成测试期望值已同步 | POSITIVE | — |

### 4. 错误处理

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| 发布 / 撤回 / 删除路由 | 重建钩子在 `waitUntil` 中执行，失败只记日志，不影响作者的操作结果 | POSITIVE | — |

### 5. 依赖

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/components/vendor/react-bits/*` | 从 react-bits 拷入的组件在文件头逐条列出了改动，许可证已核对 | POSITIVE | — |

### 6. 架构一致性

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| 读者页 | 符合 ADR-007（构建时预渲染，虚拟模块取数）与 ADR-008（原生脚本优先）：首页、404、无图文章不加载 React | — | 已由 `test:build` 覆盖 |

### 7. 代码质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| `src/components/vendor/react-bits/AccordionGallery.tsx` | 面板是 `div`，聚焦后按 Enter / 空格不会触发 click，只能用鼠标打开灯箱（键盘可访问性缺口） | CONCERN | 已修复（改动 8） |
| `src/components/vendor/react-bits/*` | vendor 组件按上游写法在渲染期写 ref，lint 用逐行注释放行 | CONCERN | 保留，与上游保持一致便于对照 |

### 8. 测试质量

| 文件 | 发现 | 分类 | 状态 |
|------|------|------|------|
| 每项修复 | 都补了先红后绿的测试（见下表） | — | — |

## MUST-FIX 修复记录

| # | 维度 | 问题 | 修复方式 | 测试 |
|---|------|------|---------|------|
| 1 | 边界 | 目录收录非顶层标题、覆盖脚注 id | 只收正文顶层的 h2 / h3，已有 id 的不覆盖，空标题跳过；reader module-spec §2 同步 | `tests/unit/reader/article-html.test.ts` |
| 2 | 边界 | 灯箱方向键一次切两张 | 事件已被轮播 `preventDefault` 时不再处理 | `tests/unit/components/lightbox.test.tsx`（TC-US10-05） |
| 3 | 边界 | 灯箱焦点落到 body | 对话框根节点 `tabIndex={-1}` | `tests/unit/components/lightbox.test.tsx`（TC-US10-09） |
| 4 | 边界 | 打开后焦点移入有空窗 | 初始焦点改在 `useLayoutEffect` 中设置（绘制前） | E2E TC-US10-07（WebKit 单 worker 连跑 3 轮通过） |
| — | 代码质量 | 手风琴图集键盘打不开灯箱 | 无 link 的面板 Enter / 空格调用 `onActiveClick` | `tests/unit/components/accordion-gallery.test.tsx` |

## 回归结果（2026-10-15，F-001 + F-002 一起）

- `npm run lint`：0 问题；`npm run check`：0 错误
- `npm test`：121 个文件 / 331 个用例全过
- `npm run test:e2e`：296 通过 / 13 失败 / 5 跳过 / 4 未运行（计时项目依赖失败未运行），失败全在 WebKit。TC-US10-07 单独跑也失败 → 定位为上面第 4 项并修复；其余 12 个（TC-US06-07、TC-US09-02、TC-US10-09 手机长按、TC-US12-10 / 11 / 12、TC-US11-23、Sprint 1 主干、TC-US09-14、TC-US10-03 / 04 / 05+06）单独重跑全部通过，属全量并行负载下超时（与 Sprint 4 统一测试时的现象相同）。修复后灯箱用例 WebKit 单 worker 连跑 3 轮 29 / 30 通过（1 个冷启动点击超时，单独重跑 2 / 2 通过），chromium 全过

## 结论

通过。4 项 MUST-FIX 已修复，回归通过（WebKit 全量并行负载下的超时为已知现象，见回归结果）。下一步 verify。
