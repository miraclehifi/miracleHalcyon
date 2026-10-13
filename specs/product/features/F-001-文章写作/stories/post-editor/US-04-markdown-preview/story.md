# Markdown 实时预览

**US ID**: US-04
**所属分组**: post-editor
**状态**: draft

---

## 1. User Story

**作为** 作者
**我想要** 边写 Markdown 边看到渲染效果
**以便于** 不发布也能确认文章在读者端的样子

---

## 2. 验收标准

1. Given 我在正文编辑区输入 Markdown
   When 我停止输入
   Then 预览区在 300ms 内更新为渲染结果（标题、列表、表格、引用、链接、图片、任务列表等 GFM 语法）

2. Given 正文包含带语言标记的代码块（如 ```ts）
   When 预览渲染
   Then 代码块有语法高亮，与读者端样式一致

3. Given 正文包含 `<script>` 或 `onerror=` 等危险 HTML
   When 预览渲染
   Then 危险内容被过滤，不会执行脚本

4. Given 我在桌面宽屏
   When 打开写文章页
   Then 编辑区与预览区左右并排；可切换为"仅编辑 / 仅预览"

5. Given 我在窄屏（< 768px）
   When 打开写文章页
   Then 编辑与预览以 Tab 切换

6. Given 正文很长
   When 我滚动编辑区
   Then 预览区同步滚动到对应位置

---

## 3. 约束与假设

**约束**:
- 预览与读者端（F-002）必须使用同一套 Markdown 渲染规则，确保"所见即所得"

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-001-文章写作/us-to-domain.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | 1.0 | 初始版本 | miraclehifi |
