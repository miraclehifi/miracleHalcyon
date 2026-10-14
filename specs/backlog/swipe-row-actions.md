# 后台文章列表操作改用 SwipeRow 左滑抽屉

| 字段 | 值 |
|------|-----|
| 状态 | ready |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

后台文章列表 `/admin` 的行操作参考 [React Bits SwipeRow](https://reactbits.dev)（TypeScript + Tailwind 版）：卡片向左拖动露出操作抽屉（编辑、删除），拖过 60% 行宽时红色删除块跃出铺满整行，松手即删除，删除后可撤销。桌面、手机统一用这一套，替代原来的"桌面悬停显示图标按钮"和"手机长按弹出菜单"。

## 目标与验收

**目标**: 列表操作在桌面和手机上是同一套手势，删除不再需要确认框，误删可以撤销。

**验收条件**:
- [x] [components.md](../ui/components.md) 写明 `PostListItem` 底层使用 SwipeRow，以及参数对照和需要改的源码；删除只在长按菜单中使用的 `DropdownMenu` / `MenuItem`
- [x] [admin-post-list.md](../ui/pages/admin-post-list.md) 写明滑动操作、键盘操作、删除与撤销；删除"手机长按操作菜单"
- [x] [design-tokens.md](../ui/design-tokens.md)"焦点与交互"把行滑动列为过渡的例外，轻提示补"带撤销"一类
- [x] US-09 story / behaviors / 验收测试同步：列表删除改为"立即移除 + 撤销"，写文章页删除仍走确认框
- [x] [admin.pen](../ui/admin.pen) 02 / 02m 画出抽屉展开态与全滑态，删除长按菜单稿
- [x] 鼠标拖动、触摸滑动、`⋯` 按钮、键盘都能打开抽屉；同一时间只有一行抽屉是打开的
- [x] 拖动结束后不会触发卡片链接跳转；抽屉打开时点卡片只收起抽屉
- [ ] 全滑或点"删除"后行折叠消失，提示"已删除《标题》"带"撤销"，6 秒内撤销则原位恢复、不发删除请求
- [ ] 删除请求失败时行原位恢复，并给出常驻错误提示
- [x] `prefers-reduced-motion` 时无回弹、无跃出动画，只做 0.2s 位移和折叠

## 影响分析

- **影响范围**: `specs/ui/components.md`、`specs/ui/design-tokens.md`、`specs/ui/pages/admin-post-list.md`、`specs/ui/features/F-001-文章写作/feature-ui-coverage.md`、US-09 story / behaviors / 验收测试；implement 阶段新增 `SwipeRow` 底层组件，依赖 `motion`（AnimatedList 已引入），不引入 `@hugeicons/*`
- **设计稿**: [admin.pen](../ui/admin.pen) `02 文章列表`、`02m 文章列表（移动）`；组件区删除 `MenuItem`
- **依赖项**: [animated-list.md](animated-list.md)（同一列表，行由 AnimatedList `renderItem` 渲染）
- **被依赖**: F-001 design-arch（删除改为延迟提交，见下）、implement
- **决策**（2026-10-12 与作者确认）:
  - 范围：桌面 + 手机都用 SwipeRow；只改后台列表，读者端 `PostCard` 不变
  - 抽屉：两个操作，最外侧"删除"（全滑动作），内侧"编辑"
  - 全滑：直接删除 + 撤销，列表里不再弹确认框；写文章页设置抽屉的"删除文章"保留确认框
  - 桌面入口（AI 补充，作者可改）：SwipeRow 原本只在键盘聚焦时出现的切换按钮，改为卡片悬停 / 聚焦时显示的 `⋯` 图标按钮，鼠标点它展开抽屉，解决"不知道能拖"
  - 撤销实现（AI 补充，作者可改）：前端延迟提交——行先移除，6 秒后（或离开页面时）才发删除请求；撤销 = 取消请求。不新增软删除，不改数据模型

## 待 design-arch 解决

- **延迟提交的可靠性**：离开页面时用 `fetch(..., { keepalive: true })` 或 `sendBeacon` 发出待删除请求；关标签页、断网时可能丢失（结果是文章没删掉，可接受）。确认删除接口需支持 keepalive（带 Cookie、同源校验 Origin）
- **连续删除**：第二次删除时立即提交上一条待删除，提示条替换为新一条
- **删除后补位**：待删除期间当前页少一行；提交成功后重新拉取当前页补齐，当前页变空时退回上一页（TC-US09-13）

## 估算

- **规模**: M

## 备注

- 当前处于 F-001 `ui_design` 阶段，本条先更新设计规格；代码在 plan-tasks 之后按 Sprint 任务实现
