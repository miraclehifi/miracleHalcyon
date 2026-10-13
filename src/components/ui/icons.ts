// 图标注册表：组件的 icon 属性用 lucide 图标名（与设计稿一致），只打包这里登记的图标
import { ArrowLeft, CircleAlert, Ellipsis, Feather, History, PenLine, Settings2, SquarePen, Trash2, Undo2, X, type LucideIcon } from "lucide-react";

export const ICONS = {
  "arrow-left": ArrowLeft,
  "circle-alert": CircleAlert,
  ellipsis: Ellipsis,
  feather: Feather,
  history: History,
  "pen-line": PenLine,
  "settings-2": Settings2,
  "square-pen": SquarePen,
  "trash-2": Trash2,
  "undo-2": Undo2,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
