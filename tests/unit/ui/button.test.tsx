import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, BUTTON_VARIANTS } from "../../../src/components/ui/Button";

// Button（components.md"基础组件""按钮质感参数"）：6 个变体同一套样式，底层 SpecularButton
afterEach(cleanup);

describe("Button", () => {
  it("变体同一样式；icon 渲染图标；无 WebGL 只保留底边线；disabled 与 aria-disabled 不触发点击", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom 未实现 canvas.getContext
    const user = userEvent.setup();

    const variants = BUTTON_VARIANTS.map((variant) => {
      render(<Button variant={variant}>{variant}</Button>);
      const button = screen.getByRole("button", { name: variant });
      return { variant: button.dataset.variant, className: button.className };
    });

    render(<Button icon="settings-2">设置</Button>);
    const withIcon = screen.getByRole("button", { name: "设置" });

    const onDisabled = vi.fn();
    const onAriaDisabled = vi.fn();
    render(<Button disabled onClick={onDisabled}>禁用</Button>);
    render(<Button aria-disabled onClick={onAriaDisabled}>说明原因</Button>);
    const ariaDisabled = screen.getByRole("button", { name: "说明原因" });
    await user.click(screen.getByRole("button", { name: "禁用" }));
    await user.click(ariaDisabled);
    await user.tab();

    expect({
      variants: variants.map((v) => v.variant),
      sameStyle: new Set(variants.map((v) => v.className)).size === 1,
      icon: withIcon.querySelector("svg.lucide-settings-2") !== null,
      specular: withIcon.dataset.specular,
      disabledClicks: onDisabled.mock.calls.length,
      ariaDisabledClicks: onAriaDisabled.mock.calls.length,
      ariaDisabledFocusable: ariaDisabled.matches(":not(:disabled)") && ariaDisabled.getAttribute("aria-disabled") === "true",
    }).toEqual({
      variants: ["primary", "secondary", "outline", "ghost", "danger", "ghost-danger"],
      sameStyle: true,
      icon: true,
      specular: "off",
      disabledClicks: 0,
      ariaDisabledClicks: 0,
      ariaDisabledFocusable: true,
    });
  });
});
