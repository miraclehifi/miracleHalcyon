// Button（components.md"基础组件"）：6 个变体同一套外观（只在设计稿中区分用途），底层 SpecularButton
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useReducedMotion, useTokenColor } from "../../lib/dom/theme";
import SpecularButton from "../vendor/react-bits/SpecularButton";
import { ICONS, type IconName } from "./icons";

export const BUTTON_VARIANTS = ["primary", "secondary", "outline", "ghost", "danger", "ghost-danger"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  variant?: ButtonVariant;
  icon?: IconName;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

// "按钮质感参数"：亮色值作为服务端渲染与解析失败时的后备
const LIGHT_LINE = "#ffffff";
const LIGHT_BASE = "#3f3f46";
const SPECULAR = { radius: 8, thickness: 1.2, intensity: 1, shineFade: 34, glow: 1, proximity: 250, blur: 0 };
const IDLE = { idleIntensity: 0.35, shineSize: 10 };
const PRESSED = { idleIntensity: 1, shineSize: 180 }; // aria-pressed：边缘光整圈常亮、去掉投影

export function Button({ variant = "primary", icon, children, onClick, className = "", style, ...rest }: ButtonProps) {
  const reducedMotion = useReducedMotion();
  const lineColor = useTokenColor("specular-line", LIGHT_LINE);
  const baseColor = useTokenColor("button-base", LIGHT_BASE);
  const pressed = rest["aria-pressed"] === true || rest["aria-pressed"] === "true";
  const ariaDisabled = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  const Icon = icon ? ICONS[icon] : null;

  // aria-disabled：保持可聚焦（配 Tooltip 说明原因），但不响应点击
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (ariaDisabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <SpecularButton
      {...rest}
      {...SPECULAR}
      {...(pressed ? PRESSED : IDLE)}
      data-variant={variant}
      tint="var(--button-fill)"
      tintOpacity={1}
      textColor="var(--button-ink)"
      lineColor={lineColor}
      baseColor={baseColor}
      followMouse={!reducedMotion}
      onClick={handleClick}
      className={`px-4 py-2 text-ui aria-disabled:cursor-default aria-disabled:opacity-50${className ? ` ${className}` : ""}`}
      style={pressed ? { ...style, boxShadow: "none" } : style}
    >
      <span className="inline-flex items-center gap-1.5 leading-[18px]">
        {Icon && <Icon size={16} aria-hidden="true" />}
        {children}
      </span>
    </SpecularButton>
  );
}
