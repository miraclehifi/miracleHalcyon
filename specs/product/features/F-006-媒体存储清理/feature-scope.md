# 媒体存储清理

**Feature ID**: F-006
**状态**: draft
**创建时间**: 2026-10-16

---

## 1. 概述

**一句话描述**: 作者在后台 `/admin/storage` 看到未被任何文章引用的图片和实况视频占了多少存储，并一键清理；不会误删任何文章（含线上已发布版本）正在使用的文件。

**背景**:
F-001 只负责上传，删图、换封面、删文章后 R2 对象和 D1 `images` 记录一直留着（F-001 范围外项"图片库管理"）。实况照片视频体积大，作者取消 `#live` 后视频也无人使用。需求与已确认的决策见 [Backlog](../../../backlog/media-orphan-cleanup.md)。

**目标用户**:
- 作者（单管理员，已登录）

---

## 2. 范围

### In Scope（本次要做的）

- **引用判定**：扫描全部文章（草稿 + 已发布）的工作稿 `body`、`cover` 与已发布快照 `pub_body`、`pub_cover`，在全文中按图片 key 正则匹配（不限于 `![]()` 写法）
- **两类未引用资源**：
  - 未引用图片：`images` 中的 key 在四列中都未出现 → 清理图片（连同其实况视频）与 D1 记录
  - 未引用实况视频：图片仍被引用，但没有任何一处引用的 URL 片段含 `live` → 只清理视频，`images` 记录的 `video_key` / `video_size` 置空（作者 2026-10-16 确认允许）
- **保护期**：上传 24 小时内的记录不参与统计和清理，单独显示数量
- **后台页面 `/admin/storage`**：三项统计（未引用图片、未引用实况视频、预计可释放）、保护期内数量、"重新检测"与检测时间、"一键清理"（数量为 0 时禁用）+ 二次确认 + 结果提示；不加载任何图片 / 视频
- **后台顶栏导航**：新增"存储"入口
- **接口**：`GET /api/admin/storage/orphans`（统计）、`POST /api/admin/storage/cleanup`（全量清理，服务端重新扫描后执行）

### Out of Scope（本次不做的）

- 图片库浏览、按张选择删除、缩略图列表
- R2 中存在但 D1 无记录的对象（上传失败已回滚，正常不会出现）
- 定时自动清理（Cron）
- 撤销清理 / 回收站
- 浏览器本地暂存（US-06 401 暂存）中引用的图片：不扫描，见"已知风险"

---

## 3. 边界定义

### 本 Feature 负责

- 引用判定、未引用统计与清理规则（扩展 `media` 领域）
- `/admin/storage` 页面与两个接口
- 后台顶栏"存储"入口

### 本 Feature 不负责

- 图片上传、实况照片处理 → F-001（上传体验改动见 [media-upload-experience](../../../backlog/media-upload-experience.md)）
- 文章内容的读写 → F-001 `post` 领域（本 Feature 只读）

### 依赖的其他 Feature

| Feature | 依赖内容 | 说明 |
|---------|----------|------|
| F-001 | `media` 领域（`images` 表、R2 绑定 `MEDIA`、key 格式） | 新增查询 / 删除能力 |
| F-001 | `post` 领域四列 `body`、`cover`、`pub_body`、`pub_cover` | 只读；读取方式由 design-arch 定 |
| F-001 | 后台会话、Origin 校验、`AdminHeader` | 沿用 |
| F-002 | `pub_cover`（迁移 0003） | 已在扫描范围 |

### 被依赖情况

无。

**反向影响**:
- **F-001 / F-002 读者页与预览**：被清理的视频所在图片若重新加上 `#live`，视频 404；预览按 US-11 AC8 降级为静态图并隐藏 `LIVE`，读者端 `ArticleImage` 同一降级（需在 design-arch 确认读者端行为）
- **F-001 ImageMenu**：实况勾选项只在视频存在时显示（由 media-upload-experience 实现，与本 Feature 并行，不阻塞）
- **F-001 `AdminHeader`**：新增导航项，admin.pen 顶栏同步
- **F-005 书影音**：本 Feature 使用 `/admin/storage`、`/api/admin/storage/*`，不占用 `media` 路由名

---

## 4. User Story 分组

> 详见 [stories/_index.md](./stories/_index.md)（由 group-stories 产出）

---

## 5. 成功指标

| 指标 | 目标值 | 衡量方式 |
|------|--------|----------|
| 零误删 | 被任一文章工作稿或已发布快照引用的图片、带 `live` 引用的视频、保护期内的记录 100% 不被清理 | 集成测试（workers：D1 + R2） |
| 清理彻底 | 清理后重新检测数量为 0；R2 对象与 D1 记录（或视频列）同步删除 | 集成测试 |
| 页面零媒体流量 | `/admin/storage` 不发出任何图片 / 视频请求 | E2E 检查网络请求 |
| 检测速度 | 300 篇文章、3,000 张图片规模下统计接口 < 2s；Worker CPU 不随正文总量增长（判定在 D1 内，ADR-009） | 集成测试（构造数据） |

**已知风险**: US-06 的 401 本地暂存若在 24 小时后才恢复，其中新上传但未保存的图片可能已被清理。概率低，接受。

---

## 6. 相关文档

- [Backlog 条目](../../../backlog/media-orphan-cleanup.md)
- [media 数据模型](../../../engineering/backend/domains/media/data-model.md)、[post 数据模型](../../../engineering/backend/domains/post/data-model.md)
- [站点地图](../../../ui/site-map.md)、设计稿 [admin.pen](../../../ui/admin.pen)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-16 | 1.0 | 初始版本 | miraclehifi |
