# add-admin-media-form: 书影音录入 / 编辑页

**Sprint**: Sprint 9
**序号**: 5
**状态**: completed（2026-10-22）
**类别**: FRONTEND
**架构层级**: 表现层（`src/pages/admin/media/new.astro`、`[id].astro`、`src/components/admin/media/`、`src/components/ui/StarRating.tsx`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: 页面 `new.astro`（`defaultType` 取 `?type=`）、`[id].astro`（服务端取条目，不存在 404）；`MediaEntryForm`（条目信息 / 我的记录两区、分类下拉、作者标签随分类、状态分段控件动词随分类、日期、`StarRating`、短评计数、豆瓣链接只读行与清除、前端校验复用 `normalizeEntryInput`、multipart 保存、保存中禁用、失败保留、`beforeunload` 与取消确认、编辑页删除）；`ShelfCoverField`（2:3 缩略图、选择 / 拖入、类型与 5 MB 前端校验、移除；保存时作为 `cover` 文件或 `coverAction=remove`）；`StarRating`（radiogroup、方向键、清除）；`shelf-client.ts` 增加 create / update
- **影响范围**: 新增为主；`shelf-client.ts` 扩展
- **不变量**: 表单不提交任何外部封面地址；`MediaEntryForm` 预留 `RecognizeBox` 插槽但本任务不实现识别
- **不在本任务**: 识别框（任务 6）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md) AC2–AC6、AC9；BH-04–BH-13、BH-17、BH-18、BH-20 |
| 设计依据 | [admin-media.md §二](../../ui/pages/admin-media.md) · [components.md](../../ui/components.md) `StarRating`、`MediaEntryForm` · admin.pen 11 / 11m · [feature-architecture §4.2](../../engineering/features/F-005-书影音/architecture/feature-architecture.md)（`ShelfCoverField` 不复用 `CoverField` 的理由） · [design-tokens"输入框质感"](../../ui/design-tokens.md) · [components.md"评分动效参数"](../../ui/components.md)（`StarRating` 表情星） |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-06、07、08：星级、表单校验、默认值；`StarRating` 键盘（`tests/unit/admin/media-entry-form.test.tsx`、`tests/unit/components/star-rating.test.tsx`） | 单元 |
| 2 | TC-US01-16、18、19、20（`tests/e2e/admin-media-form.spec.ts`；`page.clock` 固定日期） | E2E |
| 3 | TC-US01-21、24、25（同文件；保存延迟 / 失败用 `page.route`，计时用例打 `@timing`） | E2E |
| 4 | 编辑页：在读 → 读过保存后列表顺序变化；换封面后缩略图地址变化；编辑页删除回列表（同文件） | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 11 / 11m 一致（桌面卡片容器 + 头部图标块、封面列 + 字段、"我的记录"全宽两列；手机无卡片边框、单栏、底部固定栏、输入 16px；[media-form-card-layout](../../backlog/media-form-card-layout.md)）
- [x] `StarRating` 按"评分动效参数"实现表情星与切换动效（含 `size="sm"` + `readOnly` 只读形态，供任务 8 读者端使用；无"清除"按钮，再点当前星取消）
- [x] 后台列表 `MediaEntryRow`（任务 4 产出，桌面评分列与手机"作者 · 评分 · 状态"行）的 ★☆ 字符改为 `StarRating size="sm" readOnly`（有评分时 5 颗，前 N 颗点亮、其余占位；无评分不渲染；现手机行只输出 ★ × 分值、没有占位，一并修正）；同步 `tests/unit/admin/media-entry-row.test.tsx`（参考 [stars-rating-animation](../../../references/code/stars-rating-animation/)，不引入 jQuery），减弱动效时直接换色
- [x] `Field` 按"输入框质感"改样式（标签 `ink`、轻投影、`accent` 悬停光晕、触屏 / 减弱动效不显示）；共享组件，完成前补跑登录页与设置抽屉相关测试
- [x] 测试清单全部由红变绿；影响范围：任务 4 的 `tests/e2e/admin-media-list.spec.ts` chromium 通过

## 依赖

2（接口）、4（`shelf-client.ts`、列表页作为保存后去向）

## 影响的文件

- `src/pages/admin/media/new.astro`、`[id].astro`（新建）
- `src/components/admin/media/{MediaEntryForm,ShelfCoverField}.tsx`（新建）、`src/components/ui/StarRating.tsx`（新建）
- `src/lib/admin/shelf-client.ts`
- `tests/unit/...`、`tests/e2e/admin-media-form.spec.ts`（新建）

## 回滚策略

删除新文件；`shelf-client.ts` 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-media.md §二、components.md（`StarRating`、`MediaEntryForm`） | 标注已实现 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |

## 实现记录（2026-10-22）

- 纯逻辑 `src/lib/admin/shelf-form.ts`（默认值、回填、前端校验、转接口字段、本地日期）；跨页提示 `src/lib/admin/flash.ts`（保存 / 编辑页删除后回列表显示一次）
- 新增页 `client:only`：标记日期默认浏览器本地的今天（Workers 为 UTC，作者在 UTC+8）；编辑页 SSR 读条目，不存在 404
- 共享组件改动：`Field` 加悬停光晕（`useFieldGlow`，外圈 2px、`@property` 过渡半径）；`SegmentedControl` 加 `className`；`StarRating` 新建（SVG 表情，动效 CSS 在 global.css）
- 未断言 TC-US01-16 的 `deployHookStub` 计数（E2E 环境钩子为空实现；触发已由集成测试覆盖）

