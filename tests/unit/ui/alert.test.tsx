import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert } from "../../../src/components/ui/Alert";

// Alert（components.md"反馈组件"）：tone="error"
afterEach(cleanup);

describe("Alert", () => {
  it('tone="error" 渲染 role="alert"、danger-soft 底与 circle-alert 图标', () => {
    render(<Alert tone="error">账号或密码错误，请检查后重试</Alert>);
    const alert = screen.getByRole("alert");

    expect({
      text: alert.textContent,
      soft: alert.classList.contains("bg-danger-soft"),
      ink: alert.classList.contains("text-danger"),
      icon: alert.querySelector("svg.lucide-circle-alert")?.getAttribute("aria-hidden"),
    }).toEqual({ text: "账号或密码错误，请检查后重试", soft: true, ink: true, icon: "true" });
  });
});
