# 文章写作 User Stories 索引

**Feature ID**: F-001
**最后更新**: 2026-10-12

---

## 1. Story 分组概览

| 分组 | 说明 | US 数量 | 状态 |
|------|------|---------|------|
| admin-auth | 管理员登录、登出与后台访问保护 | 2 | draft |
| post-editor | 写文章页：信息表单、实时预览、图片上传、自动保存、格式工具栏、实况照片、图片排版 | 7 | draft |
| post-management | 文章管理列表、发布/更新/撤回、删除 | 3 | draft |

---

## 2. 所有 User Stories

### admin-auth

> 只有作者本人能进入后台和调用写接口。

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-01 | admin-login | implemented | 账号密码登录（含失败限流）；未登录访问后台跳转登录页 |
| US-02 | admin-logout | implemented | 登出并使会话失效 |

### post-editor

> 写文章页的核心写作体验。

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-03 | edit-post-info | implemented | 新建/编辑文章：标题、slug、标签、摘要、发布日期、正文 |
| US-04 | markdown-preview | implemented | 正文 Markdown 实时预览（GFM、代码高亮） |
| US-05 | image-upload | implemented | 粘贴/拖入图片上传 R2 并插入引用 |
| US-06 | autosave-draft | draft | 停止输入后自动保存，显示保存状态，重开恢复 |
| US-10 | format-toolbar | implemented | 工具栏格式命令、格式快捷键、按钮悬停提示 |
| US-11 | live-photo-upload | draft | 安卓动态照片（JPEG 内嵌视频）识别为实况照片上传 |
| US-12 | image-layout-marks | in_progress | 宽图、组图网格 / 手风琴写法，预览图片菜单（已实现：预览单图 `ArticleImage`、宽图、图注） |

### post-management

> 后台文章的整体管理与状态流转。

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-07 | post-list | in_progress | 后台文章列表（含草稿），新建入口，进入编辑（Sprint 1 列表 / 筛选 / 搜索 / 分页 / 空态已实现；入场动效 Sprint 2） |
| US-08 | publish-post | implemented | 发布、更新已发布文章、撤回为草稿 |
| US-09 | delete-post | implemented | 删除文章（列表左滑 + 撤销；写文章页二次确认） |

---

## 3. US 依赖关系

```
US-01 admin-login（基础：所有后台功能的前提）
  ├─ US-02 admin-logout
  └─ US-03 edit-post-info（创建文章）
       ├─ US-04 markdown-preview
       ├─ US-05 image-upload
       │    └─ US-11 live-photo-upload
       ├─ US-12 image-layout-marks（依赖 US-04 预览）
       ├─ US-06 autosave-draft
       ├─ US-10 format-toolbar
       ├─ US-07 post-list
       │    └─ US-09 delete-post
       └─ US-08 publish-post
```

分组依赖：`admin-auth` → `post-editor` → `post-management`

---

## 4. 实现顺序建议

| 顺序 | US ID | 名称 | 原因 |
|------|-------|------|------|
| 1 | US-01 | admin-login | 所有后台功能的前提 |
| 2 | US-03 | edit-post-info | 文章数据模型与创建，被大多数 US 依赖 |
| 3 | US-07 | post-list | 进入编辑的入口，主干闭环 |
| 4 | US-08 | publish-post | 完成"写→发布"主干，F-002 依赖已发布文章 |
| 5 | US-06 | autosave-draft | 核心价值"草稿不丢失" |
| 6 | US-04 | markdown-preview | 写作体验 |
| 7 | US-10 | format-toolbar | 写作体验，依赖源码区（US-03） |
| 8 | US-05 | image-upload | 依赖 R2 绑定 |
| 9 | US-11 | live-photo-upload | 依赖 US-05 上传链路 |
| 10 | US-12 | image-layout-marks | 依赖 US-04 预览与图片组件 |
| 11 | US-02 | admin-logout | 简单独立 |
| 12 | US-09 | delete-post | 边缘操作 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-12 | 1.1 | 新增 US-10 format-toolbar（[Backlog](../../../../backlog/editor-warm-tooltip.md)） | miraclehifi |
| 2026-10-12 | 1.2 | 新增 US-11 live-photo-upload、US-12 image-layout-marks（design-arch 范围变更，[Backlog](../../../../backlog/article-image-display.md)） | miraclehifi |
| 2026-10-15 | 1.3 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../backlog/drop-apple-live-photo.md)） | miraclehifi |
