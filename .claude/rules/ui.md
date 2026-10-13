# UI 组件规则

> 组件命名与清单的唯一来源：[`specs/ui/components.md`](../../specs/ui/components.md)

- AI 修改 `specs/ui/*.pen` 时，页面中重复出现的结构必须引用组件区的组件，不新建同形态的临时 frame
- 新增或改名组件：先改 components.md，再改设计稿和代码，三处名称必须一致（`组件名/变体`，组件名 = React 组件名）
- implement 阶段创建 React 组件时，组件名、variant 取值按 components.md，不另起名
- .pen 不拆成多个文件（Pencil 不支持跨文件引用组件），用画布上的"组件区 / 页面区"分区
