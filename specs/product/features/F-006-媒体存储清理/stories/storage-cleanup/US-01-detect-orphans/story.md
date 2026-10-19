# 检测未引用媒体

**US ID**: US-01
**所属分组**: storage-cleanup
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 在后台看到有多少图片和实况视频已经没有文章在用、占了多少存储
**以便于** 决定要不要清理，控制 R2 存储用量

---

## 2. 验收标准

1. Given 我已登录后台
   When 我点后台顶栏的"存储"
   Then 进入 `/admin/storage`，看到三项统计：未引用图片（张数 + 体积）、未引用实况视频（个数 + 体积）、预计可释放（两者合计，高亮），以及检测时间

2. Given 一张图片只被某篇草稿的正文引用
   When 检测
   Then 它不算未引用

3. Given 一张图片已从某篇文章的工作稿中删掉，但该文章已发布版本的正文或封面仍在使用它
   When 检测
   Then 它不算未引用

4. Given 一张图片的地址以任何形式出现在某篇文章的正文或封面中（Markdown 图片、普通链接、HTML 标签）
   When 检测
   Then 它不算未引用

5. Given 一张图片没有被任何文章（草稿或已发布，工作稿或已发布版本）的正文或封面引用，且上传已超过 24 小时
   When 检测
   Then 计入未引用图片；它带的实况视频一并计入"预计可释放"（不重复计入未引用视频）

6. Given 一张带实况视频的图片仍被引用，但所有引用都不带 `live` 标记，且上传已超过 24 小时
   When 检测
   Then 视频计入未引用实况视频，图片本身不计入

7. Given 一张未被引用的图片是 24 小时内上传的
   When 检测
   Then 它不计入未引用统计，页面显示"近 24 小时上传的 N 项不参与清理"

8. Given 统计结果与上次不同（例如我在另一个标签页删了图）
   When 我点"重新检测"
   Then 统计和检测时间更新

9. Given 我在存储页
   When 页面加载与检测
   Then 页面不加载任何图片或视频

10. Given 我未登录
    When 访问 `/admin/storage`
    Then 跳转登录页（同其他后台页）

---

## 3. 约束与假设

**约束**:
- 扫描范围：全部文章的 `body`、`cover`、`pub_body`、`pub_cover`；按图片 key 主干在全文中匹配
- 带实况判定偏保守：引用的 URL 片段中含 `live`（不区分大小写，如 `#LIVE`、`#lively` 也算）即视为带实况，宁可少删
- 体积取 `images.size`、`images.video_size`；只统计 D1 有记录的文件
- 后台路由用 `/admin/storage`，不用 `/admin/media`（留给 F-005 书影音）

**假设**:
- 文章数在 300 篇、图片在 3,000 张量级，每次检测全量判定即可，不建引用索引（[ADR-009](../../../../../../engineering/features/F-006-媒体存储清理/architecture/adr/ADR-009-orphan-detection-in-d1.md)）
- 检测时间是页面本次请求的时间，不持久化

---

## 4. 相关文档

- [Feature 范围](../../../feature-scope.md)
- [Backlog](../../../../../../backlog/media-orphan-cleanup.md)
- [US→Domain 映射](../../../../../../engineering/features/F-006-媒体存储清理/us-to-domain.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-16 | 1.0 | 初始版本 | miraclehifi |
