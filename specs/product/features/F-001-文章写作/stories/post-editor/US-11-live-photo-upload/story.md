# 实况照片上传（安卓动态照片）

**US ID**: US-11
**所属分组**: post-editor
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 把安卓手机拍的动态照片直接拖进正文
**以便于** 读者也能像在相册里一样看到照片动起来

---

## 2. 验收标准

> 编号不重排；2026-10-15 去掉苹果相关后，AC2、AC6 标为已删除（[drop-apple-live-photo](../../../../../../backlog/drop-apple-live-photo.md)）。

1. Given 我拖入安卓动态照片 `IMG20260516172228.jpg`（一个 JPEG 内嵌视频）
   When 上传
   Then 光标处只插入一条引用 `![IMG20260516172228](….jpg#live)`；预览中图片左上角有 `LIVE` 标记，桌面悬停播放、手机长按播放

2. ~~单张 HEIC 转 JPEG~~（已删除，2026-10-15）

3. Given 动态照片使用新版 Motion Photo XMP（`Item:Length`）或旧版 `MicroVideoOffset` 标注
   When 上传
   Then 都能识别并切出视频，上传的静态图不含视频字节；没有这类标注的普通 JPEG 按普通图片上传

4. Given 上传前需要处理（计算主色；动态照片还要切视频、加载处理组件并转码）
   When 处理中
   Then 占位文本先显示"处理中…"，再显示"上传中…"

5. Given 处理后的视频超过 10MB
   When 上传
   Then 只上传静态图，提示"实况视频超过 10MB，已作为普通图片插入"

6. ~~只拖入视频，没有同名照片~~（已删除，2026-10-15：不再接受单独的视频文件）

7. Given 实况照片的图片或视频任一上传失败
   When 上传失败
   Then 两者都不保留，占位文本被移除并提示"上传失败，请重试"

8. Given 当前浏览器不支持把视频转为 H.264
   When 上传
   Then 保留原编码上传，并提示"该实况视频在部分浏览器中只显示静态图"；预览中视频播放失败时只显示静态图并隐藏 `LIVE` 标记

---

## 3. 约束与假设

**约束**:
- 识别规则：JPEG 带 Motion Photo XMP（`Item:Semantic=MotionPhoto` + `Item:Length`，或旧版 `MicroVideoOffset`）时识别为实况照片，从文件末尾切出内嵌 mp4；只支持这种"一个文件"的动态照片，不做同名"图片 + 视频"配对
- 可接受的文件沿用 US-05（png、jpg、webp、gif）；HEIC / HEIF、单独的 mov / mp4 按 US-05 的"仅支持 png、jpg、webp、gif"处理
- 格式转换在浏览器完成，服务端只校验与存储（[ADR-006](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)）
- 视频静音、只播一次；存储为 mp4，≤ 10MB（详见 [全局 NFR](../../../../../nfr.md) §2.2）
- 写法见 [ADR-005](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md)

**假设**:
- 通过"插入图片"按钮选择动态照片，同样识别为实况照片
- 普通图片（png/jpg/webp/gif）上传的占位、大小、类型、失败处理沿用 US-05
- 样本为 OPPO（ColorOS）动态照片；Pixel 等其他安卓机型按同一 XMP 规则识别
- iPhone / 苹果系统（HEIC、HEIC + MOV 实况照片、iOS 快捷指令）不在范围，见 [drop-apple-live-photo](../../../../../../backlog/drop-apple-live-photo.md)

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-001-文章写作/us-to-domain.md)
- [Backlog：文章页图片展示](../../../../../../backlog/article-image-display.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-12 | 1.0 | 初始版本（design-arch 范围变更：实况照片 F-001 全做） | miraclehifi |
| 2026-10-13 | 1.1 | 补充 iOS 网页端只能拿到静态图的约束与导出方法 | miraclehifi |
| 2026-10-15 | 1.2 | 去掉苹果相关（HEIC、HEIC + MOV、iPhone 说明、同名配对），只保留安卓动态照片（[drop-apple-live-photo](../../../../../../backlog/drop-apple-live-photo.md)）：AC1、AC3、AC4 改写，AC2、AC6 删除 | miraclehifi |
