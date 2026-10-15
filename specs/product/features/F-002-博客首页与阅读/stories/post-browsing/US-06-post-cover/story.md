# 文章封面（F-001 增量）

**US ID**: US-06
**所属分组**: post-browsing
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 给文章设置封面图
**以便于** 文章列表更好看、更易辨认

---

## 2. 验收标准

1. Given 我在写文章页的设置抽屉
   When 我选择或拖入一张图片到"封面"
   Then 上传（格式与大小规则同正文图片）后显示封面缩略图；上传中显示进度；失败时提示原因并保留原封面

2. Given 文章已有封面
   When 我点"更换"或"移除"
   Then 封面被替换或清空；移除不删除 R2 中的文件

3. Given 我修改了封面
   When 停止操作
   Then 随自动保存写入工作稿；已发布文章标记"有未发布修改"，发布更新后读者端才变

4. Given 文章有封面
   When 读取公开接口或后台接口
   Then 返回封面图片地址（站内 `/img/...` 路径，宽高与主色由自描述 key 解析，见 ADR-005）；无封面为 `null`

5. Given 封面是动态照片（安卓 Motion Photo）
   When 上传封面
   Then 只使用静态图，不带视频

---

## 3. 约束与假设

**约束**:
- 跨 Feature：修改 F-001 的 post 数据模型、写文章页设置抽屉、发布快照

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-002-博客首页与阅读/us-to-domain.md)
- [F-001 US-05 image-upload](../../../../F-001-文章写作/stories/post-editor/US-05-image-upload/story.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
