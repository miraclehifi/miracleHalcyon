# 任务总览

**最后更新**: 2026-10-22

## Sprint 列表

| Sprint | 状态 | 目标 | 范围 | 任务 |
|--------|------|------|------|------|
| [Sprint 1](sprint-1/_index.md) | completed | 主干打通 | F-001：spike、项目骨架、auth、post 全部接口、基础组件、文章列表、写文章页（自动保存、预览、发布 / 更新 / 撤回） | 72 |
| [Sprint 2](sprint-2/_index.md) | completed（code-review 完成，待 verify） | 写作体验 | F-001：US-02 登出；US-05 普通图片上传（media 后端 + 前端链路）；US-10 工具栏与悬停提示；US-04 视图切换、窄屏 Tab、同步滚动；US-06 本地暂存与恢复横幅、401 暂存跳转；US-07 入场动效；US-09 删除（写文章页确认框、列表左滑 + 撤销） | 18 |
| [Sprint 3](sprint-3/_index.md) | completed（code-review 完成，待 verify） | 图片增强 | F-001：US-11 安卓动态照片（Motion Photo）实况照片上传（含上传接口视频字段；2026-10-15 去掉 HEIC / iPhone）；US-12 图片插件、`ArticleImage`（RefineFrame）/ `ImageGallery` / `LiveBadge` / `ImageMenu`、图片写法说明；插入图片上限 50MB、大元数据 JPEG 两项 | 14 |
| [Sprint 4](sprint-4/_index.md) | completed（code-review 完成，待 verify） | 博客首页与阅读 | F-002：读者端外壳与主题、首页、`/posts` 与标签页、文章详情（排版、三栏、上一篇 / 下一篇、图片与灯箱）、构建时预渲染与 Deploy Hook 重建、文章封面（F-001 增量）、主题切换动画；本地一键启动脚本；测试统一在 Sprint 末 | 21 |
| [Sprint 5](sprint-5/_index.md) | completed | F-001 P0 验收测试补齐 | F-001：verify 发现的 4 个无测试 P0（登录提交中 / 失败状态、非法 slug 行内提示、未保存离开确认）补 E2E；验收文档期望值同步现行契约（[f001-p0-test-gaps](../backlog/f001-p0-test-gaps.md)） | 4 |
| [Sprint 6](sprint-6/_index.md) | completed（待 code-review） | 图片上传体验升级 | F-001 增量：浏览器端压缩、上传进度卡片（失败重试 / 移除、已中断）、读者页不渲染上传占位、实况照片开关（默认关）与"仅转为静态图"、图片菜单实况项（[media-upload-experience](../backlog/media-upload-experience.md)） | 9 |
| [Sprint 7](sprint-7/_index.md) | in_progress | 媒体存储清理 | F-006：后台 `/admin/storage` 未引用图片 / 实况视频检测与一键清理（检测接口、清理接口、存储页、清理流程；与 Sprint 6 并行，文件不重叠） | 4 |
| [Sprint 8](sprint-8/_index.md) | completed（已发布） | Afilmory 外链照片 | F-001 增量 US-13：照片信息接口、外链照片渲染、缩略图 → 主图加载、粘贴分享代码、外链实况、灯箱主图（[afilmory-photo-embed](../backlog/afilmory-photo-embed.md)） | 6 |
| [Sprint 9](sprint-9/_index.md) | in_progress（19 / 20；2026-10-23 插入游戏海报墙任务 12–14、按发行年份分段任务 15、统一海报墙任务 16、豆瓣批量导入任务 19–20） | 书影音 | F-005：豆瓣 Rexxar spike、条目接口（迁移 0004、封面 `/covers/*`）、识别接口、后台列表与录入表单、识别框、读者构建数据与 `/media` 页面（[media-douban-sync](../backlog/media-douban-sync.md)）；插入：强调色改蓝、电影 / 剧集海报墙（[media-poster-wall](../backlog/media-poster-wall.md)） | 10 |

规划方式：迭代递进（2026-10-13 作者选择）——只详细拆当前 Sprint，下一个 Sprint 在上一个完成后基于最新设计拆分。
