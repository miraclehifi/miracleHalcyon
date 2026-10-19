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

1. Given 编辑器工具栏的"实况照片"开关已开启，我拖入安卓动态照片 `IMG20260516172228.jpg`（一个 JPEG 内嵌视频）
   When 上传
   Then 光标处只插入一条引用 `![IMG20260516172228](….jpg#live)`；预览中图片左上角有 `LIVE` 标记，桌面悬停播放、手机长按播放

2. ~~单张 HEIC 转 JPEG~~（已删除，2026-10-15）

3. Given 动态照片使用新版 Motion Photo XMP（`Item:Length`）或旧版 `MicroVideoOffset` 标注
   When 上传（无论实况开关是否开启）
   Then 都能识别并切出视频，上传的静态图不含视频字节（静态图再按 US-05 AC7 压缩）；没有这类标注的普通 JPEG 按普通图片上传

4. Given 实况开关已开启，动态照片上传前需要处理（压缩静态图；切视频、加载处理组件并转码）
   When 处理中
   Then 进度卡片依次显示"正在压缩…"（0–15%）、"正在处理实况视频…"（15–40%）、"正在上传… N%"（40–100%）

5. Given 处理后的视频超过 10MB
   When 上传
   Then 只上传静态图，提示"实况视频超过 10MB，已作为普通图片插入"

6. ~~只拖入视频，没有同名照片~~（已删除，2026-10-15：不再接受单独的视频文件）

7. Given 实况照片的图片或视频任一上传失败
   When 上传失败
   Then 两者都不保留，卡片按 US-05 AC5 变为红框，可"重试"（重新处理图片和视频）或"移除"

8. Given 当前浏览器不支持把视频转为 H.264
   When 上传
   Then 保留原编码上传，并提示"该实况视频在部分浏览器中只显示静态图"；预览中视频播放失败时只显示静态图并隐藏 `LIVE` 标记

9. Given "实况照片"开关处于关闭状态（默认；我的选择记在本浏览器，读不到时按关闭处理）
   When 我拖入动态照片
   Then 只上传压缩后的静态图，不加载视频处理组件、不生成和存储视频，插入的引用不带 `#live`

10. Given 实况开关已开启，卡片正处于"正在处理实况视频…"阶段
    When 我点击卡片上的"仅转为静态图"
    Then 放弃本张的视频，按静态图继续上传，插入的引用不带 `#live`；其他图片不受影响

---

## 3. 约束与假设

**约束**:
- 识别规则：JPEG 带 Motion Photo XMP（`Item:Semantic=MotionPhoto` + `Item:Length`，或旧版 `MicroVideoOffset`）时识别为实况照片，从文件末尾切出内嵌 mp4；只支持这种"一个文件"的动态照片，不做同名"图片 + 视频"配对
- 可接受的文件沿用 US-05（png、jpg、webp、gif）；HEIC / HEIF、单独的 mov / mp4 按 US-05 的"仅支持 png、jpg、webp、gif"处理
- 格式转换在浏览器完成，服务端只校验与存储（[ADR-006](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)）
- "实况照片"开关默认关闭：多数照片不需要动起来，视频占用存储且拖慢上传（[Backlog](../../../../../../backlog/media-upload-experience.md)）
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
| 2026-10-16 | 1.3 | 上传体验升级（[media-upload-experience](../../../../../../backlog/media-upload-experience.md)）：新增 AC9 实况开关（默认关闭）、AC10"仅转为静态图"；AC1 前提改为开关开启；AC4 改为进度卡片阶段文案；AC7 失败改为红框卡片 + 重试 / 移除 | miraclehifi |
