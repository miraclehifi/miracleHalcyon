# 图片排版标记

**US ID**: US-12
**所属分组**: post-editor
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 把图片设为宽图，或把几张图排成网格、手风琴组图
**以便于** 照片多的文章排版好看，又不用记写法

---

## 2. 验收标准

1. Given 图片的 URL 带 `#wide`
   When 预览
   Then 显示为宽图，向两侧扩出

2. Given 一个段落里只有 2 张以上图片（换行分隔，不空行）
   When 预览
   Then 显示为组图网格；第一张带 `#accordion` 且共 3–7 张时显示为手风琴，超出这个范围时退回网格

3. Given 图片写了 title（`![alt](url "图注")`）
   When 预览
   Then 图片下方居中显示图注

4. Given 我把鼠标移到预览里的单张图片上（手机上是点按）
   When 图片菜单出现
   Then 我可以切换"宽图"，源码中这张图的 URL 随之加上或去掉 `#wide`，可以用 ⌘Z / Ctrl+Z 撤销；该图存有实况视频时，菜单还有"实况"勾选项，取消 / 勾选会去掉 / 加回 URL 片段中的 `live`，保留 `wide` 等其他标记（如 `#wide,live` → `#wide`），同样可撤销；没有实况视频（含已被清理）的图片不显示该项

5. Given 我把鼠标移到预览里的组图上（手机上是点按）
   When 在菜单中选"网格 / 手风琴 / 拆成单图"
   Then 源码相应改写：加上或去掉 `#accordion`，或在图片之间插入空行；可以撤销

6. Given 标记写错了，或是外链图片、没有尺寸信息
   When 预览
   Then 按普通图片显示，不报错

7. Given 我在编辑器底栏打开写法帮助
   When 查看
   Then 能看到宽图、实况照片、组图、手风琴的写法示例

---

## 3. 约束与假设

**约束**:
- 所有写法都是合法 GFM，在其他 Markdown 阅读器中退化为普通图片（[ADR-005](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md)）
- 预览中的图片展示与读者端一致（`ArticleImage`、`ImageGallery`，见 [components.md](../../../../../../ui/components.md)"文章图片"）
- 菜单只改源码，改写与格式工具栏一样进入原生撤销栈（同 US-10）
- "实况"勾选项是否显示：打开菜单时检查该图是否存在 `.live.mp4`，本次会话内缓存结果

**假设**:
- "合并为组图"不提供菜单项，靠手写（删掉图片之间的空行）
- 灯箱（点击图片全屏查看）属于读者端（F-002），预览中不打开灯箱

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-001-文章写作/us-to-domain.md)
- [Backlog：文章页图片展示](../../../../../../backlog/article-image-display.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-12 | 1.0 | 初始版本（design-arch 范围变更：宽图 / 组图 F-001 全做） | miraclehifi |
| 2026-10-13 | 1.1 | 写法帮助增加 iPhone 实况照片导出方法 | miraclehifi |
| 2026-10-15 | 1.2 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../../../backlog/drop-apple-live-photo.md)）：AC7 删去 iPhone 导出方法 | miraclehifi |
| 2026-10-16 | 1.3 | AC4 单图菜单增加"实况"勾选项（[media-upload-experience](../../../../../../backlog/media-upload-experience.md)） | miraclehifi |
