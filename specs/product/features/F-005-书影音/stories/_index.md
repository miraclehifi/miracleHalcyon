# 书影音 User Stories 索引

**Feature ID**: F-005
**最后更新**: 2026-10-21

---

## 1. Story 分组概览

| 分组 | 说明 | US 数量 | 状态 |
|------|------|---------|------|
| media-shelf | 书影音条目：后台录入与管理、豆瓣链接识别、读者页 `/media` 展示 | 3 | draft |

> Feature 较小，只设一个分组（拆分沿用 Backlog"拆分建议"）。

---

## 2. 所有 User Stories

### media-shelf

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-01 | manage-entries | implemented | 后台 `/admin/media` 条目列表 + 录入 / 编辑表单（手动填写全部字段、封面上传）、隐藏 / 删除、写操作后触发重建；顶栏"书影音"入口 |
| US-02 | douban-recognize | implemented | 表单顶部识别框：粘贴豆瓣分享内容 → 解析条目数据填表、封面转存 R2、部分识别 / 失败降级、按条目 ID 去重 |
| US-03 | media-page | implemented | 读者页 `/media`：分类 Tab、卡片 / 列表、进行中置顶、豆瓣外链、隐藏条目不显示 |


---

## 3. US 依赖关系

```
US-01 manage-entries（条目数据模型与后台录入）
  ├─ US-02 douban-recognize（在 US-01 的表单上加识别框）
  └─ US-03 media-page（读取 US-01 写入的条目）
```

US-02 与 US-03 互不依赖；US-02 的豆瓣接口可用性 spike 在 plan-tasks 中排最前。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-21 | 1.0 | 初始版本 | miraclehifi |
