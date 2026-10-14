// 图标注册表：组件的 icon 属性用 lucide 图标名（与设计稿一致），只打包这里登记的图标
import { ArrowLeft, Bold, CircleAlert, CircleCheck, CircleDot, CloudCheck, CloudOff, Code, Ellipsis, ExternalLink, Feather, Heading2, History, ImagePlus, Italic, Link, List, ListTodo, Loader, LogOut, PenLine, Search, Settings2, SquarePen, TextQuote, Trash2, TriangleAlert, Undo2, X, type LucideIcon } from "lucide-react";

export const ICONS = {
  "arrow-left": ArrowLeft,
  bold: Bold,
  code: Code,
  "heading-2": Heading2,
  "image-plus": ImagePlus,
  italic: Italic,
  link: Link,
  list: List,
  "list-todo": ListTodo,
  "text-quote": TextQuote,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-dot": CircleDot,
  "cloud-check": CloudCheck,
  "cloud-off": CloudOff,
  ellipsis: Ellipsis,
  "external-link": ExternalLink,
  feather: Feather,
  history: History,
  loader: Loader,
  "log-out": LogOut,
  "pen-line": PenLine,
  search: Search,
  "settings-2": Settings2,
  "square-pen": SquarePen,
  "trash-2": Trash2,
  "triangle-alert": TriangleAlert,
  "undo-2": Undo2,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
