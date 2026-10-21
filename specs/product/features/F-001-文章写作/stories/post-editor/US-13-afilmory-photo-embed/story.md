# 插入 Afilmory 照片（外链存储）

**US ID**: US-13
**所属分组**: post-editor
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 把 Afilmory 的分享代码或照片页链接直接粘贴进正文
**以便于** 摄影作品只在 Afilmory / GitHub 维护一份，写文章时直接引用，读者看到的效果和本站上传的图片一样

---

## 2. 验收标准

1. Given 我复制了 Afilmory 单张分享代码（`data-afilmory-photo="18369"`）或照片页链接 `https://miraclehalcyon.afilmory.art/photos/18369`
   When 粘贴到源码区
   Then 光标处先插入"处理中…"占位、预览显示进度卡片；取到照片信息后占位换成 `![](https://raw.githubusercontent.com/…/18369.jpg#ext=3072x4096x{rgb},mp=3337665+14749941)`

2. Given 我复制了多张分享代码（`data-afilmory-photos="23473,23514,18382"`）
   When 粘贴
   Then 每张一行插入（按代码中的顺序），自动成为组图

3. Given 我复制了按标签的分享代码（`data-afilmory-tag="手办"`）
   When 粘贴
   Then 不插入任何内容，提示"按标签分享的代码不能插入，请改用单张或多张分享"
   And 其他网站的分享代码、其他网址按普通文本粘贴

4. Given Afilmory 打不开、照片不存在
   When 粘贴
   Then 占位变为"上传失败"、卡片红框并显示原因（"Afilmory 暂时无法访问" / "Afilmory 中没有这张照片"），可"重试"或"移除"

5. Given 照片是动态照片且工具栏"实况照片"开关已开启
   When 插入
   Then 引用带 `#live`（片段为 `ext=…,mp=…,live`）；开关关闭时不带 `live`，之后可在图片菜单勾选"实况"

6. Given 正文含 Afilmory 照片
   When 读者打开文章（或作者看预览）
   Then 按原图宽高预留比例，先显示缩略图；图片进入视口后换成原图的主图部分（不含内嵌视频）；组图有主色；灯箱显示主图

7. Given Afilmory 照片带 `#live`
   When 读者悬停 / 长按
   Then 浏览器能播放 HEVC 时与本站实况照片一样播放；不支持或播放出错时只显示静态图、不显示 `LIVE` 标记

8. Given 外链地址不在站点配置登记的照片存储前缀下（如 `https://example.com/a.jpg#ext=…,mp=…,live`）
   When 渲染
   Then 不解析 `ext` / `mp` / `live`，按普通外链图片显示

---

## 3. 约束与假设

**约束**:
- 图片不转存，直接引用 Afilmory 的外链存储（GitHub `miraclehifi/photo-assets`）；Afilmory 站点地址与照片存储前缀在 `src/config/site.ts` 登记，只认登记过的一个站点（[ADR-010](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)）
- 照片信息由后台接口从 Afilmory 照片页内嵌的清单读取（浏览器跨域读不了页面）；不建表、不写 R2，F-006 存储清理不涉及外链
- 不执行 Afilmory 的 `embed.js`、不用 iframe：读者页用本站的 `ArticleImage` / `ImageGallery` / 灯箱显示
- 写法在其他 Markdown 阅读器里退化为普通图片（原图地址）
- 封面仍只允许本站图片（US-06 / F-002 US-06 不变）

**假设**:
- 缩略图固定在存储前缀下 `.afilmory/thumbnails/{照片 id}.jpg`；清单里的缩略图地址与此不符时，按普通外链（原图地址、不带 `ext` / `mp`）插入并提示
- 一次粘贴只含一段分享代码或一个链接；文字中夹带的代码按普通文本粘贴
- 实况视频只支持清单中 `video.type = motion-photo` 的动态照片（内嵌在原图里，按字节范围读取）

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [Backlog：afilmory-photo-embed](../../../../../../backlog/afilmory-photo-embed.md)
- [ADR-005 自描述图片写法](../../../../../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-19 | 1.0 | 初始版本（[afilmory-photo-embed](../../../../../../backlog/afilmory-photo-embed.md)） | miraclehifi |
