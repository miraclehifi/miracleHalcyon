// OverlayButton（components.md"文章图片"`OverlayButton`）：叠在图片上的圆形图标按钮，overlay 底 + 背景模糊、overlay-ink 图标，
// 亮暗主题一致；aria-label 必填。size：48（灯箱桌面）/ 44（灯箱手机、ImageMenu 手机）/ 32（ImageMenu 桌面，图标 16px）
import type { ButtonHTMLAttributes, Ref } from "react";
import { ICONS, type IconName } from "./icons";

export interface OverlayButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children" | "aria-label"> {
  icon: IconName;
  "aria-label": string;
  size?: 48 | 44 | 32;
  ref?: Ref<HTMLButtonElement>;
}

const SIZES = { 48: "size-12", 44: "size-11", 32: "size-8" } as const;

export function OverlayButton({ icon, size = 48, className = "", ...rest }: OverlayButtonProps) {
  const Icon = ICONS[icon];
  return (
    <button
      {...rest}
      type="button"
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-overlay text-overlay-ink backdrop-blur-[12px] transition-opacity duration-200 ease-in-out ${SIZES[size]}${className ? ` ${className}` : ""}`}
    >
      <Icon size={size === 32 ? 16 : 20} aria-hidden="true" />
    </button>
  );
}
