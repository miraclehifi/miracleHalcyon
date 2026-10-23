# add-recognize-box: 表单识别框

**Sprint**: Sprint 9
**序号**: 6
**状态**: completed（2026-10-22）
**类别**: FRONTEND
**架构层级**: 表现层（`src/components/admin/media/RecognizeBox.tsx`、`MediaEntryForm.tsx`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: `RecognizeBox`（输入、清空、识别按钮与识别中态、结果区：已识别 / 未识别 / 失败 / 重复 + 去编辑）；`applyRecognized(form, result)` 纯函数（只覆盖条目字段，返回被填入字段）；`MediaEntryForm` 接入：高亮 1.5 秒（减弱动效直接移除）、未识别字段 `warn` 态直到修改、`coverData` 预览并在保存时转为 `cover` 文件、去编辑前未保存确认、编辑页传 `excludeId`；`shelf-client.ts` 增加 recognize
- **影响范围**: `MediaEntryForm`（任务 5）
- **不变量**: 识别不改状态、评分、日期、短评；浏览器不请求豆瓣任何域名
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-02](../../product/features/F-005-书影音/stories/media-shelf/US-02-douban-recognize/story.md) AC1–AC11；BH-01–BH-22 |
| 设计依据 | [admin-media.md"RecognizeBox"](../../ui/pages/admin-media.md) · [components.md](../../ui/components.md) `RecognizeBox` · admin.pen 11 / 11m / 11b · [ADR-011 §3](../../engineering/features/F-005-书影音/architecture/adr/ADR-011-shelf-domain-douban-recognition.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-04（若做前端预校验）、UT-09、10、11：`applyRecognized`、提示文案、识别框状态（`tests/unit/admin/recognize-box.test.tsx`） | 单元 |
| 2 | TC-US02-14、15、16、17（`tests/e2e/admin-media-recognize.spec.ts`；识别接口 `page.route` 打桩） | E2E |
| 3 | TC-US02-18、19、20、21、22（同文件） | E2E |

## DoD（完成定义）

- [x] 识别中 / 失败 / 重复 / 封面未识别四种状态与 admin.pen 11b 一致（含标签、支持来源小卡片、结果预览卡；输入框质感同 `Field`；[media-form-card-layout](../../backlog/media-form-card-layout.md)）
- [x] TC-US02-22 断言全程无 `doubanio.com` 请求
- [x] 测试清单全部由红变绿；影响范围：任务 5 的 `tests/e2e/admin-media-form.spec.ts`、`tests/unit/admin/media-entry-form.test.tsx` 通过

## 依赖

3（接口）、5（表单）

## 影响的文件

- `src/components/admin/media/RecognizeBox.tsx`（新建）、`MediaEntryForm.tsx`
- `src/lib/admin/shelf-client.ts`
- `tests/unit/admin/recognize-box.test.tsx`、`tests/e2e/admin-media-recognize.spec.ts`（新建）

## 回滚策略

删除 `RecognizeBox`；`MediaEntryForm`、`shelf-client.ts` 还原到任务 5 完成时

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| admin-media.md、components.md（`RecognizeBox`） | 标注已实现 |
| [sprint-9/_index.md](_index.md) | 状态 → completed |

## 实现记录（2026-10-22）

- 纯逻辑 `src/lib/admin/recognize.ts`：`applyRecognized`、提示文案、错误码中文、`dataUrlToFile`（识别封面以 data: 预览，保存时转文件上传，不请求豆瓣域名）
- `Field` 新增 `warning`（识别缺失"未识别，请手动填写"，描边 warn）与 `highlight`（识别填入，accent 浅底 1.5 秒后淡出，减弱动效无过渡）
- 离开确认对话框改为可配置标题：识别重复"去编辑"时为"放弃当前填写的内容？"/"放弃并前往"
- 未做 UT-04 前端预校验（豆瓣链接提取只在服务端）

