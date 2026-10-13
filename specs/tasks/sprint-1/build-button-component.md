# build-button-component: 实现 Button（SpecularButton）

**Sprint**: Sprint 1
**序号**: 17
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 Button（SpecularButton）
- **影响范围**: `src/components/ui/Button.tsx`, `src/components/vendor/react-bits/SpecularButton.tsx`, `tests/unit/ui/button.test.tsx`
- **不变量**: 不改变依赖任务（define-design-token-styles）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [comp](../../ui/components.md) · [tokens](../../ui/design-tokens.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/button.test.tsx`：6 个 variant 渲染正确 class；`icon` 渲染图标；WebGL 不可用时只渲染底边线；`disabled` 与 `aria-disabled` 行为

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/Button.tsx` + `src/components/vendor/react-bits/SpecularButton.tsx`（参数按 components.md"按钮质感参数"）
- [x] `prefers-reduced-motion` 时高光不跟随指针

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 上游源码取自 react-bits `src/ts-tailwind/Components/SpecularButton`，改动 4 处（去自带 size / 焦点样式、`data-specular` + CSS 底边线降级、减弱动效不缩放、ref 改在 layout effect 同步），写在文件头\n- `lineColor` / `baseColor` 需要实际颜色（WebGL），由 `useTokenColor`（`src/lib/dom/theme.ts`）解析令牌并监听主题变化\n- `icon` 用 lucide 图标名，登记在 `src/components/ui/icons.ts`\n- 新增依赖：`lucide-react` 1.56；测试 `@testing-library/react` 16.3、`@testing-library/dom` 10.4、`@testing-library/user-event` 14.6\n- 注意：lucide 1.x 已移除品牌图标（`github`），F-002 `SiteFooter` 需另找图标

## 依赖

[define-design-token-styles](define-design-token-styles.md)

## 影响的文件

- `src/components/ui/Button.tsx`
- `src/components/vendor/react-bits/SpecularButton.tsx`
- `tests/unit/ui/button.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
