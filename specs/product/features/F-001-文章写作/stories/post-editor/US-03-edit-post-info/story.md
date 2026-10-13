# 新建与编辑文章

**US ID**: US-03
**所属分组**: post-editor
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 在写文章页填写文章信息和 Markdown 正文并保存
**以便于** 把想法沉淀成一篇结构完整的文章

---

## 2. 验收标准

1. Given 我在后台点击"新建文章"
   When 写文章页打开
   Then 我看到空白表单：标题、slug、标签、摘要、发布日期（默认今天）、正文编辑区，文章状态为"草稿"

2. Given 我输入标题"Hello Astro"且未手动修改过 slug
   When 标题变化
   Then slug 自动生成为 `hello-astro`；中文标题无法生成时 slug 留空并提示我手动填写英文 slug

3. Given 我手动修改过 slug
   When 我再次修改标题
   Then slug 不再自动跟随

4. Given slug 已被另一篇文章使用
   When 我保存
   Then 我看到"slug 已存在"提示，保存不成功

5. Given 标题为空
   When 我保存草稿
   Then 草稿以"无标题"保存（避免内容丢失，见 US-06）；标题与 slug 在发布时才强制必填（见 US-08）

6. Given 我输入标签
   When 我键入标签并回车
   Then 标签以标签块形式加入，可删除，可从已有标签中选择（自动补全）

7. Given 我打开一篇已有文章
   When 页面加载完成
   Then 表单和正文显示该文章最新保存的内容

---

## 3. 约束与假设

**约束**:
- 正文为 GFM Markdown，不支持 MDX
- slug 仅允许小写字母、数字、连字符，全站唯一
- 摘要 ≤ 200 字

**假设**:
- 摘要为空时，读者端可截取正文开头作为摘要（由 F-002 处理）

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-001-文章写作/us-to-domain.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | 1.0 | 初始版本 | miraclehifi |
