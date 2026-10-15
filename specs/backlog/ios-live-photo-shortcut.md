# iPhone 一步上传实况照片（快捷指令）

| 字段 | 值 |
|------|-----|
| 状态 | discarded |
| 类型 | Feature 增量 |
| 优先级 | P3-Low |
| 来源 | 作者需求（F-001 US-11 讨论） |
| 日期 | 2026-10-13 |
| 创建者 | miraclehifi |

## 描述

iOS 网页端从相册选择实况照片时，系统只把静态图交给网页，视频部分拿不到（原生 App 才能通过 PhotoKit 读取同一条记录下的两份资源）。目前在 iPhone 上发实况照片，需要先"存储到文件"再多选，或者在电脑上导出原件。

设想：做一个 iOS 快捷指令，在相册里"分享 → 上传到博客"，由快捷指令取出 HEIC + MOV 上传，再把 Markdown 引用复制到剪贴板。

## 待评估

- 快捷指令的认证方式：不能复用浏览器会话 Cookie，需要一个专用的长期上传令牌（可撤销、只能调用上传接口）
- 快捷指令无法在本地完成 HEIC/HEVC 转换，需要评估服务端处理或客户端兼容方案（与 ADR-006 冲突，需新 ADR）
- 触发条件：作者在手机上发实况照片成为常态时再做

## 关联

- [US-11 live-photo-upload](../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md)
- [ADR-006](../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md)

## 丢弃（2026-10-15）

作者决定实况照片不考虑 iPhone / 苹果系统，本条目不再需要，见 [drop-apple-live-photo](drop-apple-live-photo.md)。
