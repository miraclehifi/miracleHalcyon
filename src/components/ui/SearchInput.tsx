// SearchInput（components.md"基础组件"）：带放大镜图标的搜索框，受控；防抖由使用方处理
// 手机端字号 16px（避免 iOS 聚焦时放大页面），桌面 14px
import type { InputHTMLAttributes } from "react";
import { ICONS } from "./icons";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: string;
  onChange(value: string): void;
  placeholder: string;
}

const SearchIcon = ICONS.search;

export function SearchInput({ value, onChange, placeholder, className = "", ...rest }: SearchInputProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-control border border-input-border bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus${className ? ` ${className}` : ""}`}
    >
      <SearchIcon size={16} aria-hidden="true" className="shrink-0 text-ink-muted" />
      <input
        {...rest}
        type="search"
        aria-label={rest["aria-label"] ?? placeholder}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 bg-transparent py-[11px] text-base leading-5 text-ink outline-none placeholder:text-ink-muted md:py-2 md:text-ui md:leading-[18px]"
      />
    </div>
  );
}
