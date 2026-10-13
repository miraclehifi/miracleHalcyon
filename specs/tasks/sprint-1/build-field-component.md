# build-field-component: 实现 Field

**Sprint**: Sprint 1
**序号**: 19
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 Field
- **影响范围**: `src/components/ui/Field.tsx`, `tests/unit/ui/field.test.tsx`
- **不变量**: 不改变依赖任务（define-design-token-styles）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/field.test.tsx`：label 与输入框关联（`htmlFor`）；`error` 时 `aria-invalid` 与 `aria-describedby` 指向错误文本

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/Field.tsx`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 尺寸取设计稿：标签 13px / 500 / `ink-muted`，间距 6，输入框 9×12（手机 13×12、16px），说明 12px `ink-faint`，错误时描边与说明变 `danger`\n- 手机字号断点用 `md:`（768px）而非令牌文档示例中的 `sm:`（640px），与全站 `< 768px` 移动端定义一致

## 依赖

[define-design-token-styles](define-design-token-styles.md)

## 影响的文件

- `src/components/ui/Field.tsx`
- `tests/unit/ui/field.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
