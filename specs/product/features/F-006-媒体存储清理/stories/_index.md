# 媒体存储清理 User Stories 索引

**Feature ID**: F-006
**最后更新**: 2026-10-16

---

## 1. Story 分组概览

| 分组 | 说明 | US 数量 | 状态 |
|------|------|---------|------|
| storage-cleanup | 后台存储页：未引用资源检测统计与一键清理 | 2 | draft |

> Feature 较小，只设一个分组。

---

## 2. 所有 User Stories

### storage-cleanup

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-01 | detect-orphans | implemented | 后台 `/admin/storage` 统计未引用图片、未引用实况视频及可释放体积（含保护期规则），顶栏"存储"入口 |
| US-02 | cleanup-orphans | implemented | 一键清理未引用资源：二次确认、服务端重新扫描后删除 R2 对象与 D1 记录、结果提示 |

---

## 3. US 依赖关系

```
US-01 detect-orphans（引用判定与统计）
  └─ US-02 cleanup-orphans（复用同一判定规则执行清理）
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-16 | 1.0 | 初始版本 | miraclehifi |
