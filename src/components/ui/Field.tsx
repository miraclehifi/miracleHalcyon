// Field（components.md"基础组件"）：标签 + 输入控件 + 说明 / 错误；给唯一的子控件补上 id、无障碍属性与输入框样式
import { cloneElement, useId, type InputHTMLAttributes, type ReactElement } from "react";

type ControlProps = Pick<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "aria-invalid" | "aria-describedby">;

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<ControlProps>;
}

// 手机（< 768px）输入框 16px，避免 iOS 聚焦时放大页面（design-tokens"字号"）
export const FIELD_CONTROL_CLASS =
  "w-full rounded-control border border-input-border bg-surface px-3 py-[13px] text-base leading-5 text-ink placeholder:text-ink-faint aria-invalid:border-danger md:py-[9px] md:text-ui md:leading-[18px]";

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const controlId = children.props.id ?? `${id}-control`;
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-meta font-medium text-ink-muted">
        {label}
      </label>
      {cloneElement(children, {
        id: controlId,
        className: `${FIELD_CONTROL_CLASS}${children.props.className ? ` ${children.props.className}` : ""}`,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": note ? noteId : undefined,
      })}
      {note && (
        <p id={noteId} className={`text-caption ${error ? "text-danger" : "text-ink-faint"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
