// Field（components.md"基础组件"）：标签 + 输入控件 + 说明 / 错误；给唯一的子控件补上 id、无障碍属性与输入框样式
// 输入框质感（design-tokens"输入框质感"，参考 Aceternity signup-form）：轻投影 + 外圈 2px 跟随光标的主色光晕。
// 光标坐标直接写进 CSS 变量（不触发重渲染），光晕半径的出现 / 收拢由 global.css 的 @property 过渡完成
import { cloneElement, useId, type InputHTMLAttributes, type PointerEvent, type ReactElement } from "react";
import { useReducedMotion } from "../../lib/dom/theme";

type ControlProps = Pick<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "aria-invalid" | "aria-describedby"> & {
  "data-recognized"?: "true";
  "data-warn"?: "";
};

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  warning?: string; // 警告（如识别缺失"未识别，请手动填写"）：描边 warn，不算无效
  highlight?: boolean; // 识别填入：accent 浅底 + 描边，由调用方 1.5 秒后撤掉（淡出）
  children: ReactElement<ControlProps>;
}

// 手机（< 768px）输入框 16px，避免 iOS 聚焦时放大页面（design-tokens"字号"）
export const FIELD_CONTROL_CLASS =
  "w-full rounded-control border border-input-border bg-surface px-3 py-[13px] text-base leading-5 text-ink shadow-[0_2px_3px_-1px_rgb(0_0_0/0.1),0_1px_0_rgb(0_0_0/0.02)] transition-[background-color,border-color] duration-500 placeholder:text-ink-faint data-[recognized=true]:border-accent data-[recognized=true]:bg-accent-soft data-[warn]:border-warn aria-invalid:border-danger motion-reduce:transition-none md:py-[9px] md:text-ui md:leading-[18px]";

// 光晕容器：圆角 = 输入框圆角 + 2，只在 2px 外圈露出
export const FIELD_GLOW_CLASS = "field-glow -m-[2px] rounded-[10px] p-[2px]";

export function useFieldGlow() {
  const reduced = useReducedMotion();
  const move = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || reduced) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--field-glow-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--field-glow-y", `${event.clientY - rect.top}px`);
    el.setAttribute("data-glow", "");
  };
  return {
    "data-field-glow": "",
    onPointerEnter: move,
    onPointerMove: move,
    onPointerLeave: (event: PointerEvent<HTMLElement>) => event.currentTarget.removeAttribute("data-glow"),
  };
}

export function Field({ label, hint, error, warning, highlight = false, children }: FieldProps) {
  const id = useId();
  const glow = useFieldGlow();
  const controlId = children.props.id ?? `${id}-control`;
  const noteId = `${id}-note`;
  const note = error ?? warning ?? hint;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={controlId} className="text-meta font-medium text-ink">
        {label}
      </label>
      <div className={FIELD_GLOW_CLASS} {...glow}>
        {cloneElement(children, {
          id: controlId,
          className: `${FIELD_CONTROL_CLASS}${children.props.className ? ` ${children.props.className}` : ""}`,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": note ? noteId : undefined,
          "data-recognized": highlight ? "true" : undefined,
          "data-warn": warning && !error ? "" : undefined,
        })}
      </div>
      {note && (
        <p id={noteId} className={`text-caption ${error ? "text-danger" : warning ? "text-warn" : "text-ink-faint"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
