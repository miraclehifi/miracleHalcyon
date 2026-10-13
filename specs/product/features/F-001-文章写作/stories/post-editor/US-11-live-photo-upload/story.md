# 手机照片与实况照片上传

**US ID**: US-11
**所属分组**: post-editor
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 把手机拍的 HEIC 照片和实况照片直接拖进正文
**以便于** 不用先在电脑上转换格式，读者也能像在相册里一样看到照片动起来

---

## 2. 验收标准

1. Given 我一次拖入同名的 `IMG_1234.HEIC` 和 `IMG_1234.MOV`
   When 上传
   Then 光标处只插入一条引用 `![IMG_1234](….jpg#live)`；预览中图片左上角有 `LIVE` 标记，桌面悬停播放、手机长按播放

2. Given 我拖入单张 HEIC 照片
   When 上传
   Then 先转换为 JPEG 再上传，插入普通图片引用，任何浏览器都能显示

3. Given 我拖入安卓动态照片（JPEG 内嵌视频）
   When 上传
   Then 自动识别为实况照片，结果同第 1 条

4. Given 转换需要先加载处理组件
   When 处理中
   Then 占位文本先显示"处理中…"，再显示"上传中…"

5. Given 处理后的视频超过 10MB
   When 上传
   Then 只上传静态图，提示"实况视频超过 10MB，已作为普通图片插入"

6. Given 只拖入视频，没有同名照片
   When 上传
   Then 提示"视频需要与同名照片一起拖入"，不上传

7. Given 实况照片的图片或视频任一上传失败
   When 上传失败
   Then 两者都不保留，占位文本被移除并提示"上传失败，请重试"

8. Given 当前浏览器不支持把视频转为 H.264
   When 上传
   Then 保留原编码上传，并提示"该实况视频在部分浏览器中只显示静态图"；预览中视频播放失败时只显示静态图并隐藏 `LIVE` 标记

---

## 3. 约束与假设

**约束**:
- 配对规则：同一批粘贴 / 拖入的文件中，图片与同名（不含扩展名）的 `.mov` / `.mp4` 配对
- 格式转换在浏览器完成，服务端只校验与存储（[ADR-006](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)）
- 视频静音、只播一次；存储为 mp4，≤ 10MB（详见 [全局 NFR](../../../../../nfr.md) §2.2）
- 写法见 [ADR-005](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md)

**假设**:
- 通过"插入图片"按钮选择文件时，多选同名图片与视频同样会配对
- 普通图片（png/jpg/webp/gif）上传的占位、大小、类型、失败处理沿用 US-05
- iOS 网页端从相册选择实况照片时，系统只提供静态图（视频部分不会交给网页），只能作为普通图片插入。要上传实况照片，需在电脑上导出原件（HEIC + MOV），或先在 iPhone 上"存储到文件"再从"文件"多选；导出方法写在"图片写法"帮助里（US-12）
- 手机一步上传实况照片（iOS 快捷指令）不在本 US 范围，见 [Backlog](../../../../../../backlog/ios-live-photo-shortcut.md)

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
