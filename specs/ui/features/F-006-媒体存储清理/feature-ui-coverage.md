# F-006 媒体存储清理 — UI 覆盖度

**最后更新**: 2026-10-16

## 涉及页面

| 页面 | 路由 | 规格 | 设计稿 | 改动 |
|------|------|------|--------|------|
| 存储 | `/admin/storage` | [admin-storage.md](../../pages/admin-storage.md) | admin.pen 09 / 09m / 09b | 新增 |
| 文章列表 | `/admin` | [admin-post-list.md](../../pages/admin-post-list.md) | admin.pen 02 / 02m | 顶栏出现"文章 / 存储"导航（当前项"文章"），其余不变 |

## Story → 页面 / 组件

| US | AC | 页面区域 | 组件 |
|----|----|---------|------|
| US-01 | AC1 进入与统计 | 顶栏"存储"、统计区、说明行 | `AdminHeader`、`PageHeader`、`StatCard`、`StatCard/Highlight` |
| US-01 | AC2–AC6 引用判定 | 统计区数字（规则在服务端） | `StatCard` |
| US-01 | AC7 保护期 | 统计区下方提示 | 文本 |
| US-01 | AC8 重新检测 | 标题行右侧 | `Button/Secondary` / `IconButton/Ghost`（手机） |
| US-01 | AC9 不加载媒体 | 全页（无 `<img>` / `<video>`） | — |
| US-01 | AC10 未登录 | 中间件跳转登录页 | — |
| US-01 | 加载 / 失败态 | 统计区 | `StatCard`（`loading`）、`Alert/Error` |
| US-02 | AC1 无候选禁用 | 操作区 | `Button/Danger`（禁用）+ 良好状态文案 |
| US-02 | AC2 确认 | 弹层 | `ConfirmDialog/Danger` |
| US-02 | AC3 清理结果 | 底部提示、统计刷新 | `Toast/Success` |
| US-02 | AC4 重新判定 | 结果提示按接口返回 | `Toast/Success` |
| US-02 | AC5 失败 | 底部提示 | `Toast/Error` |
| US-02 | AC6 视频已清理 | 写文章页预览 / 读者页（F-001 / F-002 现有降级） | `ArticleImage`（不改） |

## 覆盖结论

两个 US 的全部 AC 都有界面承载；新增组件 1 个（`StatCard`，含 `/Highlight`），改动组件 1 个（`AdminHeader`），其余复用。

## 可用性自查

- 用词：界面只用"未引用""实况视频""释放"，不出现 key、R2、D1 等内部术语
- 识别而非回忆：确认框写清楚数量与体积，不需要记住页面数字
- 信息最小化：不列文件清单、不显示缩略图（也是需求）
- 容错：清理有二次确认；保护期与"正在使用"规则在按钮下方说明；不可撤销已明示
