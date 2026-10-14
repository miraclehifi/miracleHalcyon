# fix-jpeg-sniff-large-metadata: 元数据超过 64KB 的 JPEG 可上传

**Sprint**: Sprint 3
**序号**: 14
**状态**: completed
**类别**: API（Bug）
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [sniff-jpeg-large-metadata](../../backlog/sniff-jpeg-large-metadata.md)

## 意图声明

- **改动意图**: `upload` 把整个图片字节交给 `sniffImage`，不再截取前 64KB，使 SOF 位于大段元数据之后的 JPEG 能被识别
- **影响范围**: `src/domains/media/service.ts`
- **不变量**: 伪装文件、截断 JPEG 仍被拒；视频嗅探不变；接口与错误码不变

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC1（jpg 可上传） |
| 设计依据 | [media domain-model §4.1、§5](../../engineering/backend/domains/media/domain-model.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | MEDIA-UT-01 补充：SOF 前有 8 个约 64KB 的 APP 段的 JPEG，经上传接口 201，key 中尺寸为真实值 | 集成（workers） |
| 2 | 作者样本 `IMG20260516172228.jpg` 经运行中的开发服务器上传 201，尺寸 4096×3072 | 手动 / 接口 |

## DoD（完成定义）

### 实现类
- [x] `sniffImage` 接收整个图片字节
- [x] domain-model §5 第 2 步与 MEDIA-UT-01 同步

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`tests/unit/media/*` 与上传接口集成测试中的格式识别用例通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- 红：集成用例（SOF 前 8 个 65,000 B 的 APP 段）上传返回 400；作者样本的 SOF 在第 460,385 字节（64KB EXIF + 2 个 APP2 + APP5–APP10 各约 64KB）
- 绿：`service.ts` 改为 `sniffImage(bytes)`；视频仍只看前 64KB（只需前 12 字节）
- 验证：作者样本经开发服务器上传 201，4096×3072；格式识别相关集成用例（伪装文件、实况照片）与 `tests/unit/media/*` 通过；lint 0、astro check 0 错误

## 依赖

无

## 影响的文件

- `src/domains/media/service.ts`
- `tests/integration/media/upload-endpoint.test.ts`

## 回滚策略

恢复为截取前 64KB

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sniff-jpeg-large-metadata](../../backlog/sniff-jpeg-large-metadata.md) | 勾选验收、状态 → done |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
