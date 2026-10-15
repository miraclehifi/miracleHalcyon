# 首页自我介绍

**US ID**: US-02
**所属分组**: reader-site
**状态**: draft

---

## 1. User Story

**作为** 读者
**我想要** 在首页了解作者是谁
**以便于** 决定是否继续读文章、知道怎么联系作者

---

## 2. 验收标准

1. Given 我访问 `/`
   When 页面加载
   Then 看到头像、几段简介、社交链接、邮箱，不列文章

2. Given 作者修改 `src/config/site.ts` 并推送
   When 重建完成
   Then 首页显示新内容

3. Given 首页有社交链接与邮箱
   When 我点击社交链接 / 邮箱
   Then 社交链接在新标签页打开；邮箱为 `mailto:` 链接

4. Given 配置中某项为空（如没填摄影站）
   When 页面加载
   Then 对应链接不显示，不出现空链接

---

## 3. 约束与假设

**假设**:
- 开发阶段使用占位内容，真实头像与文案由作者提供

---

## 4. 相关文档

- [Behaviors](./behaviors.md)
- [US→Domain 映射](../../../../../../engineering/features/F-002-博客首页与阅读/us-to-domain.md)
- [Feature 范围](../../../feature-scope.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
