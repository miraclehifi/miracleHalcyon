// IconButton（components.md"基础组件"）：只有图标的按钮，aria-label 必填；不使用 SpecularButton
// 图标色默认 ink-muted；父元素可设 --icon-button-ink（如 currentColor）让它跟随所在提示的色调
import type { ButtonHTMLAttributes } from "react";
import { ICONS, type IconName } from "./icons";

export type IconButtonVariant = "ghost" | "outline";
export type IconButtonSize = "sm" | "touch";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children" | "aria-label"> {
  icon: IconName;
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize; // sm 28px（桌面）/ touch 44px（手机）；图标都是 16px
  type?: "button" | "submit" | "reset";
}

const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control text-(--icon-button-ink,var(--color-ink-muted)) transition-colors duration-200 ease-in-out hover:bg-surface-sunken hover:text-ink disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-(--icon-button-ink,var(--color-ink-muted))";
const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "bg-transparent",
  outline: "border border-line-strong bg-transparent",
};
const SIZES: Record<IconButtonSize, string> = { sm: "size-7", touch: "size-11" };

export function IconButton({ icon, variant = "ghost", size = "sm", type = "button", className = "", ...rest }: IconButtonProps) {
  if (!rest["aria-label"]) console.warn(`IconButton（${icon}）缺少 aria-label，屏幕阅读器无法读出按钮用途`);
  const Icon = ICONS[icon];

  return (
    <button
      {...rest}
      type={type}
      data-variant={variant}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]}${className ? ` ${className}` : ""}`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
